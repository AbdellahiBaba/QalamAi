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

export function checkSmtpStatus(): void {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = process.env.SMTP_PORT || "587";

  if (host && user && pass) {
    console.log(`[Email] SMTP configured: host=${host}, port=${port}, user=${user}`);
  } else {
    const missing = [];
    if (!host) missing.push("SMTP_HOST");
    if (!user) missing.push("SMTP_USER");
    if (!pass) missing.push("SMTP_PASS");
    console.warn(`[Email] SMTP NOT configured — missing: ${missing.join(", ")}. Email notifications will be disabled.`);
  }
}

function getBaseUrl(): string {
  if (process.env.REPLIT_DEPLOYMENT_URL) {
    return `https://${process.env.REPLIT_DEPLOYMENT_URL}`;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return "";
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

export async function sendNovelCompletionEmail(email: string, novelTitle: string, projectId: number, projectType?: string): Promise<void> {
  const t = getTransporter();
  if (!t) return;

  const typeLabels: Record<string, string> = {
    novel: "رواية",
    essay: "مقال",
    scenario: "سيناريو",
  };
  const typeLabel = typeLabels[projectType || "novel"] || "رواية";

  const typeActions: Record<string, string> = {
    novel: "يمكنك الآن تحميل روايتك بصيغة PDF أو EPUB من صفحة المشروع.",
    essay: "يمكنك الآن تحميل مقالك بصيغة PDF من صفحة المشروع.",
    scenario: "يمكنك الآن تحميل السيناريو بصيغة PDF من صفحة المشروع.",
  };
  const actionText = typeActions[projectType || "novel"] || typeActions.novel;

  const projectUrl = `${getBaseUrl()}/project/${projectId}`;

  const body = `
<p style="color:#333;line-height:1.8;font-size:15px;">تهانينا! ${typeLabel === "رواية" ? "روايتك" : typeLabel === "مقال" ? "مقالك" : "السيناريو الخاص بك"} <strong style="color:${BRAND_GOLD};">"${novelTitle}"</strong> مكتمل${typeLabel === "رواية" ? "ة" : ""} الآن.</p>
<p style="color:#333;line-height:1.8;font-size:15px;">${actionText}</p>
<div style="text-align:center;margin:24px 0;">
<a href="${projectUrl}" 
   style="display:inline-block;background:${BRAND_GOLD};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
عرض المشروع وتحميله
</a>
</div>`;

  const subjectLabels: Record<string, string> = {
    novel: `تهانينا! روايتك "${novelTitle}" مكتملة`,
    essay: `تهانينا! مقالك "${novelTitle}" مكتمل`,
    scenario: `تهانينا! السيناريو "${novelTitle}" مكتمل`,
  };
  const subject = subjectLabels[projectType || "novel"] || subjectLabels.novel;

  const headerLabels: Record<string, string> = {
    novel: "روايتك مكتملة!",
    essay: "مقالك مكتمل!",
    scenario: "السيناريو مكتمل!",
  };
  const headerLabel = headerLabels[projectType || "novel"] || headerLabels.novel;

  try {
    await t.sendMail({
      from: `"QalamAI" <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      html: wrapInTemplate(headerLabel, body),
    });
    console.log(`[Email] Sent project completion email to ${email} — subject: "${subject}"`);
  } catch (err) {
    console.error("[Email] Failed to send project completion email:", err);
  }
}

export async function sendTicketReplyEmail(email: string, ticketSubject: string, replyPreview: string, ticketId: number): Promise<void> {
  const t = getTransporter();
  if (!t) return;

  const ticketUrl = `${getBaseUrl()}/tickets/${ticketId}`;

  const body = `
<p style="color:#333;line-height:1.8;font-size:15px;">تم الرد على تذكرتك: <strong>"${ticketSubject}"</strong></p>
<div style="background:#f5f3ef;border-right:3px solid ${BRAND_GOLD};padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0;">
<p style="color:#555;margin:0;font-size:14px;line-height:1.7;">${replyPreview.slice(0, 500)}</p>
</div>
<div style="text-align:center;margin:24px 0;">
<a href="${ticketUrl}" 
   style="display:inline-block;background:${BRAND_GOLD};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
عرض التذكرة
</a>
</div>`;

  const subject = `رد جديد على تذكرتك: "${ticketSubject}"`;

  try {
    await t.sendMail({
      from: `"QalamAI" <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      html: wrapInTemplate("رد جديد على تذكرتك", body),
    });
    console.log(`[Email] Sent ticket reply email to ${email} — subject: "${subject}"`);
  } catch (err) {
    console.error("[Email] Failed to send ticket reply email:", err);
  }
}

export async function sendPlanActivationEmail(email: string, planType: string): Promise<void> {
  const t = getTransporter();
  if (!t) return;

  const planLabels: Record<string, string> = {
    essay: "خطة المقالات",
    scenario: "خطة السيناريو",
    all_in_one: "الخطة الشاملة",
  };
  const planLabel = planLabels[planType] || planType;

  const planDescriptions: Record<string, string> = {
    essay: "يمكنك الآن إنشاء مقالات غير محدودة.",
    scenario: "يمكنك الآن إنشاء سيناريوهات غير محدودة.",
    all_in_one: "يمكنك الآن إنشاء روايات ومقالات وسيناريوهات غير محدودة.",
  };
  const description = planDescriptions[planType] || "";

  const dashboardUrl = `${getBaseUrl()}/`;

  const body = `
<p style="color:#333;line-height:1.8;font-size:15px;">تم تفعيل <strong style="color:${BRAND_GOLD};">${planLabel}</strong> بنجاح على حسابك.</p>
<p style="color:#333;line-height:1.8;font-size:15px;">${description}</p>
<div style="text-align:center;margin:24px 0;">
<a href="${dashboardUrl}" 
   style="display:inline-block;background:${BRAND_GOLD};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
الذهاب إلى لوحة التحكم
</a>
</div>`;

  const subject = `تم تفعيل ${planLabel} — QalamAI`;

  try {
    await t.sendMail({
      from: `"QalamAI" <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      html: wrapInTemplate("تم تفعيل خطتك!", body),
    });
    console.log(`[Email] Sent plan activation email to ${email} — plan: ${planType}`);
  } catch (err) {
    console.error("[Email] Failed to send plan activation email:", err);
  }
}

export async function sendProjectPaymentEmail(email: string, projectTitle: string, projectId: number, projectType?: string): Promise<void> {
  const t = getTransporter();
  if (!t) return;

  const typeLabels: Record<string, string> = {
    novel: "رواية",
    essay: "مقال",
    scenario: "سيناريو",
  };
  const typeLabel = typeLabels[projectType || "novel"] || "رواية";

  const projectUrl = `${getBaseUrl()}/project/${projectId}`;

  const body = `
<p style="color:#333;line-height:1.8;font-size:15px;">تم تأكيد الدفع لمشروعك (${typeLabel}): <strong style="color:${BRAND_GOLD};">"${projectTitle}"</strong></p>
<p style="color:#333;line-height:1.8;font-size:15px;">يمكنك الآن البدء في إنشاء المحتوى والكتابة.</p>
<div style="text-align:center;margin:24px 0;">
<a href="${projectUrl}" 
   style="display:inline-block;background:${BRAND_GOLD};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
فتح المشروع
</a>
</div>`;

  const subject = `تأكيد الدفع — "${projectTitle}"`;

  try {
    await t.sendMail({
      from: `"QalamAI" <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      html: wrapInTemplate("تم تأكيد الدفع!", body),
    });
    console.log(`[Email] Sent project payment email to ${email} — project: "${projectTitle}"`);
  } catch (err) {
    console.error("[Email] Failed to send project payment email:", err);
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  const t = getTransporter();
  if (!t) return;

  const baseUrl = getBaseUrl();
  const resetLink = `${baseUrl}/reset-password/${resetToken}`;

  const body = `
    <p style="font-size:16px;color:${BRAND_BLUE};line-height:1.8;text-align:right;">
      لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك على QalamAI.
    </p>
    <p style="font-size:16px;color:${BRAND_BLUE};line-height:1.8;text-align:right;">
      اضغط على الزر أدناه لإعادة تعيين كلمة المرور:
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${resetLink}" style="display:inline-block;background:${BRAND_GOLD};color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:bold;">
        إعادة تعيين كلمة المرور
      </a>
    </div>
    <p style="font-size:14px;color:#6B5B4F;text-align:right;">
      هذا الرابط صالح لمدة ساعة واحدة فقط. إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذا البريد.
    </p>`;

  try {
    await t.sendMail({
      from: `"QalamAI" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "إعادة تعيين كلمة المرور — QalamAI",
      html: wrapInTemplate("إعادة تعيين كلمة المرور", body),
    });
    console.log(`[Email] Sent password reset email to ${email}`);
  } catch (err) {
    console.error("[Email] Failed to send password reset email:", err);
  }
}

export async function sendTrialChargeSuccessEmail(email: string): Promise<void> {
  const t = getTransporter();
  if (!t) return;

  const dashboardUrl = `${getBaseUrl()}/`;

  const body = `
<p style="color:#333;line-height:1.8;font-size:15px;">تهانينا! تم تفعيل <strong style="color:${BRAND_GOLD};">الخطة الشاملة</strong> بنجاح على حسابك بعد انتهاء الفترة التجريبية.</p>
<p style="color:#333;line-height:1.8;font-size:15px;">يمكنك الآن إنشاء روايات ومقالات وسيناريوهات وقصص قصيرة وخواطر وقصائد بدون حدود.</p>
<div style="text-align:center;margin:24px 0;">
<a href="${dashboardUrl}" 
   style="display:inline-block;background:${BRAND_GOLD};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
الذهاب إلى لوحة التحكم
</a>
</div>`;

  try {
    await t.sendMail({
      from: `"QalamAI" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "تم تفعيل الخطة الشاملة بنجاح — QalamAI",
      html: wrapInTemplate("تم تفعيل خطتك الشاملة!", body),
    });
    console.log(`[Email] Sent trial charge success email to ${email}`);
  } catch (err) {
    console.error("[Email] Failed to send trial charge success email:", err);
  }
}

export async function sendTrialRequiresActionEmail(email: string, paymentIntentClientSecret: string): Promise<void> {
  const t = getTransporter();
  if (!t) return;

  const pricingUrl = `${getBaseUrl()}/pricing`;

  const body = `
<p style="color:#333;line-height:1.8;font-size:15px;">انتهت فترتك التجريبية على <strong style="color:${BRAND_GOLD};">قلم AI</strong>.</p>
<p style="color:#333;line-height:1.8;font-size:15px;">يتطلب الدفع مصادقة إضافية من البنك الخاص بك (3D Secure). يُرجى إتمام عملية الدفع يدوياً للاستمرار في استخدام الخطة الكاملة.</p>
<div style="text-align:center;margin:24px 0;">
<a href="${pricingUrl}" 
   style="display:inline-block;background:${BRAND_GOLD};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
إتمام الدفع الآن
</a>
</div>`;

  try {
    await t.sendMail({
      from: `"QalamAI" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "مطلوب مصادقة إضافية لإتمام الدفع — QalamAI",
      html: wrapInTemplate("مصادقة الدفع مطلوبة", body),
    });
    console.log(`[Email] Sent trial requires action email to ${email}`);
  } catch (err) {
    console.error("[Email] Failed to send trial requires action email:", err);
  }
}

export async function sendViewMilestoneNotification(
  email: string,
  authorName: string,
  essayTitle: string,
  viewCount: number,
): Promise<void> {
  const t = getTransporter();
  if (!t) return;

  const essaysUrl = `${getBaseUrl()}/essays`;

  const body = `
<p style="color:#333;line-height:1.8;font-size:15px;">مبارك <strong style="color:${BRAND_GOLD};">${authorName}</strong>!</p>
<p style="color:#333;line-height:1.8;font-size:15px;">وصل مقالك <strong style="color:${BRAND_GOLD};">"${essayTitle}"</strong> إلى <strong style="font-size:18px;">${viewCount.toLocaleString("ar-EG")}</strong> مشاهدة على منصّة QalamAI.</p>
<p style="color:#333;line-height:1.8;font-size:15px;">استمر في النشر وشارك أعمالك مع القرّاء العرب.</p>
<div style="text-align:center;margin:24px 0;">
<a href="${essaysUrl}" 
   style="display:inline-block;background:${BRAND_GOLD};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
عرض المقالات
</a>
</div>`;

  try {
    await t.sendMail({
      from: `"QalamAI" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `مقالك "${essayTitle}" وصل إلى ${viewCount.toLocaleString("ar-EG")} مشاهدة — QalamAI`,
      html: wrapInTemplate(`تهانينا! ${viewCount.toLocaleString("ar-EG")} مشاهدة`, body),
    });
    console.log(`[Email] Sent view milestone (${viewCount}) email to ${email}`);
  } catch (err) {
    console.error("[Email] Failed to send view milestone email:", err);
  }
}

export async function sendWeeklyDigest(
  recipients: Array<{ email: string; displayName: string | null }>,
  topEssays: Array<{ id: number; title: string; shareToken: string | null; authorName: string; views: number }>,
): Promise<void> {
  const t = getTransporter();
  if (!t || recipients.length === 0 || topEssays.length === 0) return;

  const baseUrl = getBaseUrl();
  const essaysUrl = `${baseUrl}/essays`;

  const essayRows = topEssays.slice(0, 5).map(essay => {
    const link = essay.shareToken ? `${baseUrl}/essay/${essay.shareToken}` : essaysUrl;
    return `
<tr>
  <td style="padding:10px 0;border-bottom:1px solid #f0ece4;">
    <a href="${link}" style="color:${BRAND_BLUE};font-weight:bold;text-decoration:none;font-size:14px;">${essay.title}</a>
    <br><span style="color:#888;font-size:12px;">بقلم ${essay.authorName} · ${essay.views} مشاهدة هذا الأسبوع</span>
  </td>
</tr>`;
  }).join("\n");

  const body = `
<p style="color:#333;line-height:1.8;font-size:15px;">إليك أبرز مقالات هذا الأسبوع على منصّة QalamAI:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
${essayRows}
</table>
<div style="text-align:center;margin:24px 0;">
<a href="${essaysUrl}"
   style="display:inline-block;background:${BRAND_GOLD};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
استعرض جميع المقالات
</a>
</div>`;

  const subject = "ملخّص الأسبوع — أبرز مقالات QalamAI";

  let sent = 0;
  for (const recipient of recipients) {
    try {
      await t.sendMail({
        from: `"QalamAI" <${process.env.SMTP_USER}>`,
        to: recipient.email,
        subject,
        html: wrapInTemplate("أبرز مقالات هذا الأسبوع", body),
      });
      sent++;
    } catch (err) {
      console.error(`[Email] Failed to send weekly digest to ${recipient.email}:`, err);
    }
  }
  console.log(`[Email] Weekly digest sent to ${sent}/${recipients.length} recipients`);
}

export async function sendTrialChargeFailedEmail(email: string): Promise<void> {
  const t = getTransporter();
  if (!t) return;

  const pricingUrl = `${getBaseUrl()}/pricing`;

  const body = `
<p style="color:#333;line-height:1.8;font-size:15px;">انتهت فترتك التجريبية على <strong style="color:${BRAND_GOLD};">قلم AI</strong>.</p>
<p style="color:#333;line-height:1.8;font-size:15px;">للأسف، لم نتمكن من تحصيل المبلغ من بطاقتك المسجلة. تم إرجاع حسابك إلى الخطة المجانية.</p>
<p style="color:#333;line-height:1.8;font-size:15px;">يمكنك الاشتراك في إحدى خططنا يدوياً للاستمتاع بجميع الميزات:</p>
<div style="text-align:center;margin:24px 0;">
<a href="${pricingUrl}" 
   style="display:inline-block;background:${BRAND_GOLD};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
اختر خطتك الآن
</a>
</div>`;

  try {
    await t.sendMail({
      from: `"QalamAI" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "انتهت فترتك التجريبية — QalamAI",
      html: wrapInTemplate("انتهت الفترة التجريبية", body),
    });
    console.log(`[Email] Sent trial charge failed email to ${email}`);
  } catch (err) {
    console.error("[Email] Failed to send trial charge failed email:", err);
  }
}
