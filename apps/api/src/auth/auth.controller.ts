import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  RefreshRequestSchema,
  SendOtpRequestSchema,
  VerifyOtpRequestSchema,
  type AuthSession,
  type SendOtpResponse,
} from '@sallim/shared';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() body: unknown): Promise<SendOtpResponse> {
    const { phone } = SendOtpRequestSchema.parse(body);
    const { expiresInSeconds } = await this.auth.sendOtp(phone);
    return { ok: true, channel: 'sms', expiresInSeconds };
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() body: unknown): Promise<AuthSession> {
    const { phone, code } = VerifyOtpRequestSchema.parse(body);
    return this.auth.verifyOtp(phone, code);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: unknown): Promise<AuthSession> {
    const { refreshToken } = RefreshRequestSchema.parse(body);
    return this.auth.refresh(refreshToken);
  }
}
