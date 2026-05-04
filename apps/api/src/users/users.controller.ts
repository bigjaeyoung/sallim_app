import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt.guard.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { PrismaService } from '../db/prisma.service.js';

/**
 * `GET /me` returns the current user with their default household. Used by
 * the mobile app on launch to confirm the stored JWT is still valid and to
 * hydrate the home screen.
 */
@Controller('me')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async me(@CurrentUser() user: JwtPayload): Promise<{
    id: string;
    phone: string | null;
    name: string | null;
    locale: string;
    defaultHouseholdId: string | null;
  }> {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: user.sub } });
    return {
      id: u.id,
      phone: u.phone,
      name: u.name,
      locale: u.locale,
      defaultHouseholdId: u.defaultHouseholdId,
    };
  }
}
