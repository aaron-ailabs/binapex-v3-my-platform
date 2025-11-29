
// This is a mock notification service.
// In a real application, this would integrate with email providers (SendGrid, AWS SES)
// and SMS providers (Twilio, Nexmo).

export interface NotificationPayload {
  userId: string;
  type: 'EMAIL' | 'SMS' | 'IN_APP';
  recipient: string; // Email address or phone number
  subject?: string;
  message: string;
}

export class NotificationService {
  async send(payload: NotificationPayload): Promise<boolean> {
    const env = (process.env.NODE_ENV || '').toLowerCase();
    if (env === 'development' && process.env.NOTIFY_DEBUG === '1') {
      const subj = payload.subject ? ` ${payload.subject}` : '';
      const msg = payload.message.length > 120 ? payload.message.slice(0, 117) + '…' : payload.message;
      console.log(`[NOTIFICATION] ${payload.type} ${payload.recipient}:${subj} :: ${msg}`);
    }

    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const { storageDb } = await import('../storage');
      await storageDb.addNotification({
        userId: payload.userId,
        type: payload.type,
        title: payload.subject,
        message: payload.message,
      } as any);
    } catch {}

    return true;
  }

  async sendWithdrawalConfirmation(userId: string, email: string, amount: number, currency: string) {
    return this.send({
      userId,
      type: 'EMAIL',
      recipient: email,
      subject: 'Withdrawal Confirmation - Binapex',
      message: `Your withdrawal request for ${amount} ${currency} has been received and is being processed.`
    });
  }

  async sendSecurityAlert(userId: string, email: string, details: string) {
    return this.send({
      userId,
      type: 'EMAIL',
      recipient: email,
      subject: 'Security Alert - Binapex',
      message: `Suspicious activity detected on your account: ${details}. If this was not you, please contact support immediately.`
    });
  }
}

export const notificationService = new NotificationService();
