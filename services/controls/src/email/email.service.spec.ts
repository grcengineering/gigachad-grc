import { EmailService } from './email.service';

describe('EmailService delivery truthfulness', () => {
  it('does not report console-mode messages as delivered', async () => {
    const config = {
      get: jest.fn((key: string, fallback?: string) =>
        key === 'EMAIL_PROVIDER' ? 'console' : fallback
      ),
    };
    const service = new EmailService(config as never);

    await expect(
      service.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      })
    ).resolves.toBe(false);
  });
});
