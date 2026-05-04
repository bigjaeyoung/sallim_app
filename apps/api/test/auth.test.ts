import { JwtService } from '@nestjs/jwt';
import { describe, expect, it, beforeEach } from 'vitest';
import { AuthService } from '../src/auth/auth.service.js';
import type { OtpProvider } from '../src/auth/otp.service.js';
import type { PrismaService } from '../src/db/prisma.service.js';

/**
 * Unit tests instantiate AuthService directly with hand-rolled fakes — no
 * Nest TestingModule. Vitest's esbuild transformer does not emit decorator
 * metadata, which breaks Nest's class-based DI; bypassing the container is
 * cleaner and enough for unit testing the service's logic.
 */

class FakeOtp implements OtpProvider {
  shouldApprove = true;
  sentTo: string[] = [];
  async sendCode(phone: string): Promise<void> {
    this.sentTo.push(phone);
  }
  async checkCode(): Promise<boolean> {
    return this.shouldApprove;
  }
}

interface FakeUser {
  id: string;
  phone: string | null;
  name: string | null;
  defaultHouseholdId: string | null;
}

class FakePrisma {
  users = new Map<string, FakeUser>();
  households: Array<{ id: string; createdById: string }> = [];
  members: Array<{ userId: string; householdId: string; role: string }> = [];

  user = {
    findUnique: async ({ where }: { where: { phone?: string; id?: string } }): Promise<FakeUser | null> => {
      for (const u of this.users.values()) {
        if (where.phone && u.phone === where.phone) return u;
        if (where.id && u.id === where.id) return u;
      }
      return null;
    },
    create: async ({ data }: { data: FakeUser }): Promise<FakeUser> => {
      this.users.set(data.id, data);
      return data;
    },
  };
  household = {
    create: async ({ data }: { data: { id: string; createdById: string; name: string } }) => {
      this.households.push({ id: data.id, createdById: data.createdById });
      return data;
    },
  };
  householdMember = {
    create: async ({ data }: { data: { userId: string; householdId: string; role: string } }) => {
      this.members.push(data);
      return data;
    },
  };

  async $transaction<T>(fn: (tx: this) => Promise<T>): Promise<T> {
    return fn(this);
  }
}

describe('AuthService.verifyOtp', () => {
  let otp: FakeOtp;
  let prisma: FakePrisma;
  let svc: AuthService;

  beforeEach(() => {
    otp = new FakeOtp();
    prisma = new FakePrisma();
    const jwt = new JwtService({ secret: 'test-secret-thats-32-chars-or-more' });
    svc = new AuthService(otp, prisma as unknown as PrismaService, jwt);
  });

  it('rejects when OTP code is wrong', async () => {
    otp.shouldApprove = false;
    await expect(svc.verifyOtp('+821011112222', '000000')).rejects.toThrow();
  });

  it('creates user + default household on first verify', async () => {
    const session = await svc.verifyOtp('+821011112222', '123456');
    expect(session.user.phone).toBe('+821011112222');
    expect(session.user.defaultHouseholdId).toBeTruthy();
    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();
    expect(prisma.households).toHaveLength(1);
    expect(prisma.members).toHaveLength(1);
    expect(prisma.members[0]?.role).toBe('owner');
  });

  it('does not create a duplicate user on repeated verify', async () => {
    await svc.verifyOtp('+821011112222', '123456');
    await svc.verifyOtp('+821011112222', '123456');
    expect(prisma.users.size).toBe(1);
    expect(prisma.households).toHaveLength(1);
  });
});
