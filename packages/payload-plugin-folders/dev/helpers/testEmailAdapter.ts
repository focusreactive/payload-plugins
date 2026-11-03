import type { EmailAdapter } from "payload";

export const testEmailAdapter: EmailAdapter<void> = ({ payload }) => ({
  name: "test-email-adapter",
  defaultFromAddress: "dev@payloadcms.com",
  defaultFromName: "Payload Test",
  sendEmail: (message) => {
    payload.logger.info({
      msg: `Test email to '${String(message.to)}', subject '${message.subject}'`,
    });
    return Promise.resolve();
  },
});
