import { Controller, Get } from '@nestjs/common';
import { type HealthResponse } from '@sallim/shared';

const startedAt = Date.now();

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return {
      ok: true,
      version: process.env.npm_package_version,
      uptime_s: Math.round((Date.now() - startedAt) / 1000),
    };
  }
}
