import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { OTP_PROVIDER, TwilioOtpProvider } from './otp.service.js';
import { HouseholdAccessGuard } from './household.guard.js';
import { JwtAuthGuard } from './jwt.guard.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret || secret.length < 32) {
          throw new Error(
            'JWT_SECRET missing or too short. Set a 32+ char random string in .env.',
          );
        }
        return { secret };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    HouseholdAccessGuard,
    { provide: OTP_PROVIDER, useClass: TwilioOtpProvider },
  ],
  exports: [JwtAuthGuard, HouseholdAccessGuard, AuthService],
})
export class AuthModule {}
