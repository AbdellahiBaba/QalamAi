import nodemailer from "nodemailer";

const BRAND_GOLD = "#D4A017";
const BRAND_BLUE = "#0D1B2A";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: { user, pass },
  });
  return transporter;
}

function wrapInTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f3ef;font-family:'Segoe UI',Tahoma,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ef;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<tr><td style="background:${BRAND_BLUE};padding:24px 32px;text-align:center;">
<h1 style="margin:0;color:${BRAND_GOLD};font-size:28px;font-weight:bold;">QalamAI</h1>
<p style="margin:4px 0 0;color:#8899aa;font-size:13px;">منصّة الكتابة الروائية العربية</p>
</td></tr>
<tr><td style="padding:32px;">
<h2 style="color:${BRAND_BLUE};margin:0 0 16px;font-size:20px;">${title}</h2>
${body}
</td></tr>
<tr><td style="background:#f9f7f3;padding:16px 32px;text-align:center;border-top:1px solid #e8e4dc;">
<p style="margin:0;color:#999;font-size:12px;">© QalamAI — support@qalamai.net</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export async function sendNovelCompletionEmail(email: string, novelTitle: string, projectId: number): Promise<void> {
  const t = getTransporter();
  if (!t) return;

  const body = `
<p style="color:#333;line-height:1.8;font-size:15px;">تهانينا! روايتك <strong style="color:${BRAND_GOLD};">"${novelTitle}"</strong> مكتملة الآن.</p>
<p style="color:#333;line-height:1.8;font-size:15px;">يمكنك الآن تحميل روايتك بصيغة PDF أو EPUB من صفحة المشروع.</p>
<div style="text-align:center;margin:24px 0;">
<a href="${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : ""}/project/${projectId}" 
   style="display:inline-block;background:${BRAND_GOLD};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
عرض الرواية
</a>
</div>`;

  try {
    await t.sendMail({
      from: `"QalamAI" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `تهانينا! روايتك "${novelTitle}" مكتملة`,
      html: wrapInTemplate("روايتك مكتملة! 🎉", body),
    });
  } catch (err) {
    console.error("Failed to send novel completion email:", err);
  }
}

export async function sendTicketReplyEmail(email: string, ticketSubject: string, replyPreview: string, ticketId: number): Promise<void> {
  const t = getTransporter();
  if (!t) return;

  const body = `
<p style="color:#333;line-height:1.8;font-size:15px;">تم الرد على تذكرتك: <strong>"${ticketSubject}"</strong></p>
<div style="background:#f5f3ef;border-right:3px solid ${BRAND_GOLD};padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0;">
<p style="color:#555;margin:0;font-size:14px;line-height:1.7;">${replyPreview.slice(0, 500)}</p>
</div>
<div style="text-align:center;margin:24px 0;">
<a href="${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : ""}/tickets/${ticketId}" 
   style="display:inline-block;background:${BRAND_GOLD};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
عرض التذكرة
</a>
</div>`;

  try {
    await t.sendMail({
      from: `"QalamAI" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `رد جديد على تذكرتك: "${ticketSubject}"`,
      html: wrapInTemplate("رد جديد على تذكرتك", body),
    });
  } catch (err) {
    console.error("Failed to send ticket reply email:", err);
  }
}
