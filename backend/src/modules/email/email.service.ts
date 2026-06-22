import { Injectable, Logger, Module } from '@nestjs/common';

/**
 * Email abstraction. If RESEND_API_KEY is set, sends via Resend; otherwise logs
 * the message (and any action link) so the app works with zero external setup.
 * Swap the provider here without touching callers.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger('EmailService');
  private readonly apiKey = process.env.RESEND_API_KEY;
  private readonly from = process.env.EMAIL_FROM ?? 'Vela <onboarding@resend.dev>';
  private readonly appUrl = process.env.APP_URL ?? 'http://localhost:3000';

  link(path: string): string {
    return `${this.appUrl.replace(/\/$/, '')}${path}`;
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn(
        `EMAIL (not sent — RESEND_API_KEY unset)\n  to: ${to}\n  subject: ${subject}\n  ${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}`,
      );
      return;
    }
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: this.from, to, subject, html }),
      });
      if (!res.ok) this.logger.error(`Resend failed: ${res.status} ${await res.text()}`);
    } catch (e) {
      this.logger.error(`Email error: ${(e as Error).message}`);
    }
  }
}

@Module({ providers: [EmailService], exports: [EmailService] })
export class EmailModule {}
