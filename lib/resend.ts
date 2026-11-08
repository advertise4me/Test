import "server-only";
import { Resend } from "resend";

// Thin wrapper around Resend (transactional email) so the rest of the app
// never has to check for a missing API key itself. The owner hasn't added a
// real RESEND_API_KEY yet - see .env.example - so sendEmail() no-ops with a
// clear console warning instead of throwing, both in development and until
// a real key is configured in production.

const FROM_ADDRESS = "Advertise4Me <notifications@advertise4me.com>";

let client: Resend | null | undefined;

function getClient(): Resend | null {
  if (client !== undefined) return client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    client = null;
    return client;
  }
  client = new Resend(apiKey);
  return client;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends a transactional email via Resend. No-ops (logging a warning) if
 * RESEND_API_KEY isn't set, rather than crashing the caller - every Settings
 * feature that sends email (verification links, password resets, alerts)
 * should work the same whether or not a real key has been configured yet.
 */
export async function sendEmail(input: SendEmailInput): Promise<{ sent: boolean }> {
  const resend = getClient();
  if (!resend) {
    console.warn(
      `[resend] RESEND_API_KEY is not set - skipping email send (to: ${input.to}, subject: "${input.subject}"). ` +
        "Set RESEND_API_KEY in .env.local to actually send email - see .env.example.",
    );
    return { sent: false };
  }

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { sent: true };
  } catch (error) {
    console.error("[resend] failed to send email", error);
    return { sent: false };
  }
}
