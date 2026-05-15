import { Resend } from "resend";

let _resend: Resend | null = null;
function client() {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  _resend = new Resend(key);
  return _resend;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}) {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) throw new Error("RESEND_FROM_EMAIL is not set");
  return client().emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    replyTo: opts.replyTo,
  });
}
