import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Wraps the generated Prisma client as a Nest provider so we can inject it
 * everywhere. Lifecycle is tied to the Nest app: connect on bootstrap,
 * disconnect on shutdown so we don't leak connections to Neon.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.log.log('Prisma connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.log.log('Prisma disconnected');
  }
}
