import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '../db/prisma.service.js';
import type { JwtPayload } from './auth.service.js';

const HOUSEHOLD_ROLE_KEY = 'household_required_role';
type RequiredRole = 'owner' | 'member' | 'viewer';

/**
 * `@HouseholdAccess('owner' | 'member' | 'viewer')` on a route enforces
 * that the authenticated user has at least the given role in the household
 * identified by `req.params.householdId` or `req.body.householdId`.
 *
 * Hierarchy: owner > member > viewer. A method-level requirement of
 * 'member' is satisfied by anyone who's at least a member (owner included).
 */
export const HouseholdAccess = (role: RequiredRole) =>
  SetMetadata(HOUSEHOLD_ROLE_KEY, role);

const ROLE_RANK: Record<string, number> = {
  viewer: 1,
  member: 2,
  owner: 3,
};

@Injectable()
export class HouseholdAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get<RequiredRole | undefined>(
      HOUSEHOLD_ROLE_KEY,
      ctx.getHandler(),
    );
    if (!required) return true; // route doesn't require household access

    const req = ctx.switchToHttp().getRequest<
      Request & {
        user?: JwtPayload;
        params: Record<string, string>;
        body: Record<string, unknown>;
      }
    >();

    const householdId = req.params['householdId'] ?? (req.body['householdId'] as string | undefined);
    if (!householdId) {
      throw new ForbiddenException('Household id missing in route or body');
    }
    if (!req.user) {
      throw new ForbiddenException('No authenticated user');
    }

    const membership = await this.prisma.householdMember.findUnique({
      where: {
        userId_householdId: {
          userId: req.user.sub,
          householdId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this household');
    }
    const userRank = ROLE_RANK[membership.role] ?? 0;
    const requiredRank = ROLE_RANK[required] ?? 0;
    if (userRank < requiredRank) {
      throw new ForbiddenException(`Requires role: ${required}`);
    }
    return true;
  }
}
