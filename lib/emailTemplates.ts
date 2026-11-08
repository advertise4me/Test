import "server-only";
import { sendEmail } from "@/lib/resend";

// Simple HTML/text templates for every email the Settings tab (Phase 5a)
// can trigger. Deliberately plain - no external template engine, no shared
// visual system with the app's dark dashboard theme (email clients strip
// most of that anyway). Each function both builds the copy and calls
// sendEmail, so a caller never has to touch raw HTML.

function wrap(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:24px;">
          <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#8b5cf6;letter-spacing:0.02em;">ADVERTISE4ME</p>
          <h1 style="margin:0 0 16px;font-size:20px;">${title}</h1>
          ${bodyHtml}
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0;"><a href="${href}" style="display:inline-block;background:#8b5cf6;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:14px;">${label}</a></p>`;
}

export async function sendEmailChangeVerification(to: string, verifyUrl: string): Promise<{ sent: boolean }> {
  const html = wrap(
    "Confirm your new email address",
    `<p style="margin:0 0 8px;font-size:15px;line-height:1.5;">We got a request to change the email on your Advertise4Me account to this address.</p>
     <p style="margin:0;font-size:15px;line-height:1.5;">Click below to confirm. This link expires in 1 hour and can only be used once.</p>
     ${button(verifyUrl, "Confirm new email")}
     <p style="margin:16px 0 0;font-size:13px;color:#71717a;">If you didn't request this, you can safely ignore this email.</p>`,
  );
  const text = `Confirm your new email address: ${verifyUrl}\n\nThis link expires in 1 hour and can only be used once. If you didn't request this, ignore this email.`;
  return sendEmail({ to, subject: "Confirm your new email address", html, text });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<{ sent: boolean }> {
  const html = wrap(
    "Reset your password",
    `<p style="margin:0 0 8px;font-size:15px;line-height:1.5;">We got a request to reset the password on your Advertise4Me account.</p>
     <p style="margin:0;font-size:15px;line-height:1.5;">Click below to choose a new password. This link expires in 1 hour and can only be used once.</p>
     ${button(resetUrl, "Reset password")}
     <p style="margin:16px 0 0;font-size:13px;color:#71717a;">If you didn't request this, you can safely ignore this email - your password won't change.</p>`,
  );
  const text = `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour and can only be used once. If you didn't request this, ignore this email.`;
  return sendEmail({ to, subject: "Reset your password", html, text });
}

export async function sendWeeklySummaryEmail(
  to: string,
  summary: { headline: string; detail: string; appUrl: string },
): Promise<{ sent: boolean }> {
  const html = wrap(
    "Your weekly ad account summary",
    `<p style="margin:0 0 8px;font-size:16px;font-weight:600;">${summary.headline}</p>
     <p style="margin:0;font-size:15px;line-height:1.5;color:#3f3f46;">${summary.detail}</p>
     ${button(summary.appUrl, "Open AI Summary")}`,
  );
  const text = `${summary.headline}\n\n${summary.detail}\n\n${summary.appUrl}`;
  return sendEmail({ to, subject: "Your weekly ad account summary", html, text });
}

export async function sendNeedsAttentionAlert(
  to: string,
  details: { headline: string; detail: string; appUrl: string },
): Promise<{ sent: boolean }> {
  const html = wrap(
    "Your account needs attention",
    `<p style="margin:0 0 8px;font-size:16px;font-weight:600;">${details.headline}</p>
     <p style="margin:0;font-size:15px;line-height:1.5;color:#3f3f46;">${details.detail}</p>
     ${button(details.appUrl, "Open AI Summary")}`,
  );
  const text = `${details.headline}\n\n${details.detail}\n\n${details.appUrl}`;
  return sendEmail({ to, subject: "Your account needs attention", html, text });
}

export async function sendMetaAccessLostAlert(to: string, reconnectUrl: string): Promise<{ sent: boolean }> {
  const html = wrap(
    "We lost access to your Meta ad account",
    `<p style="margin:0 0 8px;font-size:15px;line-height:1.5;">Your connected Meta ad account's access token has expired or been revoked, so we can no longer pull your ad data or run anything you ask for in chat.</p>
     <p style="margin:0;font-size:15px;line-height:1.5;">Reconnect it from Settings to keep things running.</p>
     ${button(reconnectUrl, "Reconnect Meta account")}`,
  );
  const text = `Your connected Meta ad account's access has expired or been revoked. Reconnect it here: ${reconnectUrl}`;
  return sendEmail({ to, subject: "We lost access to your Meta ad account", html, text });
}
