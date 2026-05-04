import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { type PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';
import type { AuthSession } from '@sallim/shared';
import { PrismaService } from '../db/prisma.service.js';
import { OTP_PROVIDER, type OtpProvider } from './otp.service.js';

// PrismaClient subset that supports the model methods we call inside a
// transaction. The runtime value is Prisma.TransactionClient (slightly
// narrower) but the wider PrismaClient type is fine for our usage and
// avoids depending on `prisma generate` for narrow generated types.
type Tx = PrismaClient;

const ACCESS_TTL = '15m';
const REFRESH_TTL = '30d';
const DEFAULT_HOUSEHOLD_NAME = '내 집';

export interface JwtPayload {
  sub: string; // user id
  phone: string | null;
  type: 'access' | 'refresh';
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(OTP_PROVIDER) private readonly otp: OtpProvider,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async sendOtp(phone: string): Promise<{ expiresInSeconds: number }> {
    await this.otp.sendCode(phone);
    return { expiresInSeconds: 600 }; // Twilio Verify default 10min
  }

  /**
   * Verify the OTP code, then either:
   *   - find the existing user and return a session, OR
   *   - create a new user + their default household, then return a session.
   *
   * The "find or create" is wrapped in a transaction so a failed household
   * insert can't leave a user without a default household.
   */
  async verifyOtp(phone: string, code: string): Promise<AuthSession> {
    const ok = await this.otp.checkCode(phone, code);
    if (!ok) throw new UnauthorizedException('Invalid OTP');

    const user = await this.prisma.$transaction(async (tx: Tx) => {
      const existing = await tx.user.findUnique({ where: { phone } });
      if (existing) return existing;

      const userId = nanoid(16);
      const householdId = nanoid(16);

      const created = await tx.user.create({
        data: {
          id: userId,
          phone,
          defaultHouseholdId: householdId,
        },
      });

      await tx.household.create({
        data: {
          id: householdId,
          name: DEFAULT_HOUSEHOLD_NAME,
          createdById: userId,
        },
      });

      await tx.householdMember.create({
        data: {
          userId,
          householdId,
          role: 'owner',
        },
      });

      return created;
    });

    return this.issueSession(user.id, user.phone, user.name, user.defaultHouseholdId);
  }

  async refresh(refreshToken: string): Promise<AuthSession> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Wrong token type');
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('User not found');
    return this.issueSession(user.id, user.phone, user.name, user.defaultHouseholdId);
  }

  private async issueSession(
    userId: string,
    phone: string | null,
    name: string | null,
    defaultHouseholdId: string | null,
  ): Promise<AuthSession> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, phone, type: 'access' } satisfies JwtPayload,
      { expiresIn: ACCESS_TTL },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, phone, type: 'refresh' } satisfies JwtPayload,
      { expiresIn: REFRESH_TTL },
    );
    return {
      accessToken,
      refreshToken,
      user: { id: userId, phone, name, defaultHouseholdId },
    };
  }
}
