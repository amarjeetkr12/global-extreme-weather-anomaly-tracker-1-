import { AlertFeedItem } from '../src/types.ts';

interface NotificationResult {
  channel: 'EMAIL' | 'SMS';
  status: 'SENT' | 'SKIPPED' | 'FAILED';
  message: string;
}

class NotificationService {
  private notifiedChannels = new Set<string>();
  private lastResults: NotificationResult[] = [];

  public getStatus() {
    return {
      emailConfigured: Boolean(process.env.SENDGRID_API_KEY && process.env.ALERT_EMAIL_TO),
      smsConfigured: Boolean(
        process.env.TWILIO_ACCOUNT_SID &&
          process.env.TWILIO_AUTH_TOKEN &&
          process.env.TWILIO_FROM_NUMBER &&
          process.env.ALERT_SMS_TO
      ),
      lastResults: this.lastResults,
      notifiedAlertCount: this.notifiedChannels.size,
    };
  }

  public async notifyNewAlerts(alerts: AlertFeedItem[]): Promise<NotificationResult[]> {
    const urgentAlerts = alerts.filter((alert) => alert.risk_level === 'HIGH' || alert.risk_level === 'CRITICAL');

    if (urgentAlerts.length === 0) return [];

    const message = this.formatAlertMessage(urgentAlerts);
    const emailAlerts = urgentAlerts.filter((alert) => !this.notifiedChannels.has(`EMAIL:${alert.alert_id}`));
    const smsAlerts = urgentAlerts.filter((alert) => !this.notifiedChannels.has(`SMS:${alert.alert_id}`));
    const results = await Promise.all([
      emailAlerts.length > 0 ? this.sendEmail(emailAlerts, this.formatAlertMessage(emailAlerts)) : null,
      smsAlerts.length > 0 ? this.sendSms(message) : null,
    ]);

    results.forEach((result, index) => {
      if (!result || result.status !== 'SENT') return;
      const channel = index === 0 ? 'EMAIL' : 'SMS';
      urgentAlerts.forEach((alert) => {
        if ((channel === 'EMAIL' && emailAlerts.includes(alert)) || (channel === 'SMS' && smsAlerts.includes(alert))) {
          this.notifiedChannels.add(`${channel}:${alert.alert_id}`);
        }
      });
    });
    const deliveredResults = results.filter((result): result is NotificationResult => result !== null);
    this.lastResults = deliveredResults;
    return deliveredResults;
  }

  private formatAlertMessage(alerts: AlertFeedItem[]): string {
    const lines = alerts.slice(0, 5).map(
      (alert) =>
        `[${alert.risk_level}] ${alert.title} | ${alert.location} | ${alert.action_summary} | ${alert.time}`
    );
    return `Extreme Weather Alert\n\n${lines.join('\n')}`;
  }

  private async sendEmail(alerts: AlertFeedItem[], message: string): Promise<NotificationResult> {
    const apiKey = process.env.SENDGRID_API_KEY;
    const recipient = process.env.ALERT_EMAIL_TO;
    const sender = process.env.NOTIFICATION_EMAIL_FROM;

    if (!apiKey || !recipient || !sender) {
      return { channel: 'EMAIL', status: 'SKIPPED', message: 'Email credentials are not configured.' };
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: recipient }] }],
          from: { email: sender, name: 'Extreme Weather Intelligence' },
          subject: `[${alerts[0].risk_level}] Extreme weather alert`,
          content: [{ type: 'text/plain', value: message }],
        }),
      });

      return response.ok
        ? { channel: 'EMAIL', status: 'SENT', message: `Email sent to ${recipient}.` }
        : { channel: 'EMAIL', status: 'FAILED', message: `Email provider returned HTTP ${response.status}.` };
    } catch (error: any) {
      return { channel: 'EMAIL', status: 'FAILED', message: error.message };
    }
  }

  private async sendSms(message: string): Promise<NotificationResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;
    const to = process.env.ALERT_SMS_TO;

    if (!accountSid || !authToken || !from || !to) {
      return { channel: 'SMS', status: 'SKIPPED', message: 'SMS credentials are not configured.' };
    }

    try {
      const body = new URLSearchParams({
        From: from,
        To: to,
        Body: message.slice(0, 1500),
      });
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });

      return response.ok
        ? { channel: 'SMS', status: 'SENT', message: `SMS sent to ${to}.` }
        : { channel: 'SMS', status: 'FAILED', message: `SMS provider returned HTTP ${response.status}.` };
    } catch (error: any) {
      return { channel: 'SMS', status: 'FAILED', message: error.message };
    }
  }
}

export const notificationService = new NotificationService();
