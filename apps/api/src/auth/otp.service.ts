import { Injectable, Logger } from '@nestjs/common';
import twilio from 'twilio';

/**
 * OtpProvider abstracts the SMS-OTP backend. Production uses Twilio Verify;
 * tests inject a fake. This lets us test the auth flow without sending real
 * SMS or holding Twilio credentials.
 */
export interface OtpProvider {
  sendCode(phone: string): Promise<void>;
  checkCode(phone: string, code: string): Promise<boolean>;
}

export const OTP_PROVIDER = Symbol('OTP_PROVIDER');

@Injectable()
export class TwilioOtpProvider implements OtpProvider {
  private readonly log = new Logger(TwilioOtpProvider.name);
  private readonly client: twilio.Twilio;
  private readonly serviceSid: string;

  constructor() {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
    if (!sid || !token || !serviceSid) {
      throw new Error(
        'Twilio env missing: need TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID',
      );
    }
    this.client = twilio(sid, token);
    this.serviceSid = serviceSid;
  }

  async sendCode(phone: string): Promise<void> {
    await this.client.verify.v2.services(this.serviceSid).verifications.create({
      to: phone,
      channel: 'sms',
    });
    this.log.log(`OTP sent to ${this.maskPhone(phone)}`);
  }

  async checkCode(phone: string, code: string): Promise<boolean> {
    const result = await this.client.verify.v2
      .services(this.serviceSid)
      .verificationChecks.create({ to: phone, code });
    return result.status === 'approved';
  }

  private maskPhone(phone: string): string {
    if (phone.length < 6) return '***';
    return `${phone.slice(0, 4)}…${phone.slice(-3)}`;
  }
}
