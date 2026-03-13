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
<p style="margin:4px 0 0;color:#8899aa;font-size:13px;">منصّة الكتابة الإبداعية العربية بالذكاء الاصطناعي</p>
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
    short_story: "قصة قصيرة",
    khawater: "خاطرة",
    poetry: "قصيدة",
    social_media: "منشور",
    memoire: "مذكرة",
  };
  const typeLabel = typeLabels[projectType || "novel"] || "مشروع";

  const typeNextSteps: Record<string, string> = {
    novel: "يمكنك الآن البدء في توليد فصول روايتك مع أبو هاشم، مساعدك الأدبي الذكي.",
    essay: "يمكنك الآن توليد مقالك وتحريره ونشره على منصّة QalamAI.",
    scenario: "يمكنك الآن البدء في بناء مشاهد سيناريوهاتك فصلاً بفصل.",
    short_story: "يمكنك الآن توليد قصتك القصيرة وصياغة شخصياتها وأحداثها.",
    khawater: "يمكنك الآن كتابة خاطرتك والتأمل في معانيها مع أبو هاشم.",
    poetry: "يمكنك الآن نظم قصيدتك باختيار البحر الشعري والأسلوب الذي يلائمك.",
    social_media: "يمكنك الآن توليد منشوراتك وجدولتها لمنصّات التواصل الاجتماعي.",
    memoire: "يمكنك الآن البدء في توثيق تجربتك وكتابة فصول مذكراتك.",
  };
  const nextStep = typeNextSteps[projectType || "novel"] || "يمكنك الآن فتح المشروع والبدء في الكتابة.";

  const projectUrl = `${getBaseUrl()}/project/${projectId}`;

  const body = `
<p style="color:#333;line-height:1.8;font-size:15px;">تم تأكيد الدفع وإنشاء مشروعك (<strong>${typeLabel}</strong>): <strong style="color:${BRAND_GOLD};">"${projectTitle}"</strong></p>
<p style="color:#333;line-height:1.8;font-size:15px;">${nextStep}</p>
<div style="text-align:center;margin:24px 0;">
<a href="${projectUrl}" 
   style="display:inline-block;background:${BRAND_GOLD};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
ابدأ الكتابة الآن
</a>
</div>`;

  const subject = `تم إنشاء مشروعك "${projectTitle}" — QalamAI`;

  try {
    await t.sendMail({
      from: `"QalamAI" <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      html: wrapInTemplate("مشروعك جاهز للكتابة!", body),
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

export async function sendWelcomeEmail(email: string, firstName: string): Promise<void> {
  const t = getTransporter();
  if (!t) return;

  const dashboardUrl = `${getBaseUrl()}/`;
  const essaysUrl = `${getBaseUrl()}/essays`;

  const body = `
<p style="color:#333;line-height:1.8;font-size:15px;">مرحباً بك <strong style="color:${BRAND_GOLD};">${firstName}</strong> في عائلة QalamAI!</p>
<p style="color:#333;line-height:1.8;font-size:15px;">أنت الآن على أعتاب منصّة كتابية استثنائية تجمع بين الإبداع العربي والذكاء الاصطناعي. يمكنك إنشاء روايات، مقالات، سيناريوهات، قصص قصيرة، قصائد وخواطر — كلها بالعربية وبلمسة أدبية راقية.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
  <tr>
    <td style="padding:8px 12px;background:#f9f7f3;border-radius:8px;border-right:3px solid ${BRAND_GOLD};margin-bottom:8px;display:block;">
      <strong style="color:${BRAND_BLUE};">أبو هاشم</strong> — مساعدك الأدبي الذكي الذي يرافقك في كل خطوة من رحلة الكتابة
    </td>
  </tr>
</table>
<p style="color:#333;line-height:1.8;font-size:15px;">ابدأ بتصفّح المقالات المنشورة من الكتّاب العرب أو أنشئ مشروعك الأول الآن:</p>
<div style="text-align:center;margin:24px 0;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
<a href="${dashboardUrl}" 
   style="display:inline-block;background:${BRAND_GOLD};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;margin:4px;">
ابدأ الكتابة
</a>
<a href="${essaysUrl}" 
   style="display:inline-block;background:transparent;color:${BRAND_BLUE};padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;margin:4px;border:2px solid ${BRAND_BLUE};">
استعرض المقالات
</a>
</div>
<p style="color:#888;font-size:13px;line-height:1.7;">إذا احتجت مساعدة في أي وقت، فريق الدعم في QalamAI دائماً على استعداد للمساعدة على <a href="mailto:support@qalamai.net" style="color:${BRAND_GOLD};">support@qalamai.net</a></p>`;

  try {
    await t.sendMail({
      from: `"QalamAI" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `مرحباً بك في QalamAI — ابدأ رحلتك الكتابية`,
      html: wrapInTemplate(`أهلاً وسهلاً، ${firstName}!`, body),
    });
    console.log(`[Email] Sent welcome email to ${email}`);
  } catch (err) {
    console.error("[Email] Failed to send welcome email:", err);
  }
}

export async function sendVerifiedApplicationStatusEmail(
  email: string,
  firstName: string,
  status: "approved" | "rejected",
  adminNote?: string,
): Promise<void> {
  const t = getTransporter();
  if (!t) return;

  const dashboardUrl = `${getBaseUrl()}/`;

  let subject: string;
  let headerTitle: string;
  let body: string;

  if (status === "approved") {
    subject = "تهانينا! طلبك للتوثيق قد قُبِل — QalamAI";
    headerTitle = "أنت الآن كاتب موثّق على QalamAI";
    body = `
<p style="color:#333;line-height:1.8;font-size:15px;">تهانينا <strong style="color:${BRAND_GOLD};">${firstName}</strong>!</p>
<p style="color:#333;line-height:1.8;font-size:15px;">يسعدنا إبلاغك بأن طلبك للحصول على شارة <strong>الكاتب الموثّق</strong> قد تمت الموافقة عليه. ستظهر الشارة الزرقاء بجانب اسمك على جميع مقالاتك ولوحة المتصدرين تلقائياً.</p>
<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
  <p style="color:#166534;font-weight:bold;font-size:16px;margin:0;">تم التوثيق بنجاح ✓</p>
</div>
<p style="color:#333;line-height:1.8;font-size:15px;">استمر في نشر أعمالك الأدبية وشارك القرّاء العرب بإبداعك.</p>
<div style="text-align:center;margin:24px 0;">
<a href="${dashboardUrl}" 
   style="display:inline-block;background:${BRAND_GOLD};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
العودة إلى لوحة التحكم
</a>
</div>`;
  } else {
    subject = "بشأن طلب التوثيق — QalamAI";
    headerTitle = "تحديث بشأن طلب التوثيق";
    body = `
<p style="color:#333;line-height:1.8;font-size:15px;">شكراً لك <strong style="color:${BRAND_GOLD};">${firstName}</strong> على تقديم طلب التوثيق.</p>
<p style="color:#333;line-height:1.8;font-size:15px;">بعد مراجعة طلبك من قِبَل فريق QalamAI، نأسف لإبلاغك بأننا لم نتمكن من الموافقة على طلبك في الوقت الحالي.</p>
${adminNote ? `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin:16px 0;">
  <p style="color:#991b1b;font-size:14px;margin:0;line-height:1.7;"><strong>ملاحظة الفريق:</strong> ${adminNote}</p>
</div>` : ""}
<p style="color:#333;line-height:1.8;font-size:15px;">يمكنك إعادة التقديم مستقبلاً مع تعزيز ملفك الكتابي بمزيد من الأعمال المنشورة. نحن دائماً سعداء بمرافقتك في رحلتك الأدبية.</p>
<div style="text-align:center;margin:24px 0;">
<a href="${dashboardUrl}" 
   style="display:inline-block;background:${BRAND_GOLD};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
استمر في الكتابة
</a>
</div>`;
  }

  try {
    await t.sendMail({
      from: `"QalamAI" <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      html: wrapInTemplate(headerTitle, body),
    });
    console.log(`[Email] Sent verified application ${status} email to ${email}`);
  } catch (err) {
    console.error(`[Email] Failed to send verified application ${status} email:`, err);
  }
}

export async function sendSubscriptionPaymentFailedEmail(email: string, firstName: string, attemptCount: number, pricingUrl: string): Promise<void> {
  const t = getTransporter();
  if (!t) return;

  const isUrgent = attemptCount >= 3;
  const subject = isUrgent
    ? "تحذير أخير: خطر إلغاء الاشتراك — QalamAI"
    : "تعذّر تجديد اشتراكك — QalamAI";

  const body = `
<p style="color:#333;line-height:1.8;font-size:15px;">مرحباً <strong>${firstName}</strong>،</p>
<p style="color:#333;line-height:1.8;font-size:15px;">
  ${isUrgent
    ? `لم نتمكن من تجديد اشتراكك بعد <strong>${attemptCount} محاولات</strong>. إذا لم يتم الدفع قريباً، سيتم إلغاء اشتراكك تلقائياً وستفقد شارة الكاتب الموثّق وجميع مزايا الخطة المدفوعة.`
    : `تعذّر علينا خصم رسوم تجديد اشتراكك (المحاولة رقم ${attemptCount}). سنحاول مجدداً خلال الأيام القادمة.`
  }
</p>
<p style="color:#333;line-height:1.8;font-size:15px;">لتجنّب الانقطاع، يرجى التأكد من أن بيانات بطاقتك محدّثة أو اختر طريقة دفع أخرى.</p>
<div style="text-align:center;margin:24px 0;">
<a href="${pricingUrl}" 
   style="display:inline-block;background:${BRAND_GOLD};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
تحديث بيانات الدفع
</a>
</div>`;

  try {
    await t.sendMail({
      from: `"QalamAI" <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      html: wrapInTemplate("تنبيه الدفع", body),
    });
    console.log(`[Email] Sent subscription payment failed email (attempt ${attemptCount}) to ${email}`);
  } catch (err) {
    console.error("[Email] Failed to send subscription payment failed email:", err);
  }
}

export async function sendSubscriptionCancelledEmail(email: string, firstName: string): Promise<void> {
  const t = getTransporter();
  if (!t) return;

  const pricingUrl = `${getBaseUrl()}/pricing`;

  const body = `
<p style="color:#333;line-height:1.8;font-size:15px;">مرحباً <strong>${firstName}</strong>،</p>
<p style="color:#333;line-height:1.8;font-size:15px;">تم إلغاء اشتراكك في <strong style="color:${BRAND_GOLD};">قلم AI</strong> بسبب تعذّر تجديد الدفع. تمت إعادة حسابك إلى الخطة المجانية وتم إيقاف شارة الكاتب الموثّق مؤقتاً.</p>
<p style="color:#333;line-height:1.8;font-size:15px;">بمجرد تجديد اشتراكك، ستعود شارتك الزرقاء تلقائياً دون الحاجة إلى إعادة التقديم.</p>
<div style="text-align:center;margin:24px 0;">
<a href="${pricingUrl}" 
   style="display:inline-block;background:${BRAND_GOLD};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
تجديد الاشتراك الآن
</a>
</div>`;

  try {
    await t.sendMail({
      from: `"QalamAI" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "تم إلغاء اشتراكك — QalamAI",
      html: wrapInTemplate("إلغاء الاشتراك", body),
    });
    console.log(`[Email] Sent subscription cancelled email to ${email}`);
  } catch (err) {
    console.error("[Email] Failed to send subscription cancelled email:", err);
  }
}

export async function sendNewPublicationEmail(
  followerEmail: string,
  followerName: string | null,
  authorName: string,
  essayTitle: string,
  essayUrl: string
): Promise<void> {
  const t = getTransporter();
  if (!t) return;
  const name = followerName || "القارئ الكريم";
  const body = `
<p style="color:#333;line-height:1.8;font-size:15px;">مرحباً ${name}،</p>
<p style="color:#333;line-height:1.8;font-size:15px;">نشر الكاتب <strong>${authorName}</strong> عملاً جديداً بعنوان:</p>
<div style="background:#f9f7f3;border-right:4px solid ${BRAND_GOLD};padding:16px 20px;margin:20px 0;border-radius:6px;">
  <p style="margin:0;font-size:18px;font-weight:bold;color:${BRAND_BLUE};">${essayTitle}</p>
</div>
<div style="text-align:center;margin:24px 0;">
  <a href="${essayUrl}" style="display:inline-block;background:${BRAND_GOLD};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">اقرأ الآن</a>
</div>
<p style="color:#999;font-size:12px;line-height:1.6;">تلقيت هذا البريد لأنك تتابع ${authorName} على منصة QalamAI.</p>`;
  try {
    await t.sendMail({
      from: `"QalamAI" <${process.env.SMTP_USER}>`,
      to: followerEmail,
      subject: `${authorName} نشر عملاً جديداً — QalamAI`,
      html: wrapInTemplate("نشر جديد من كاتب تتابعه", body),
    });
  } catch (err) {
    console.error("[Email] Failed to send new publication email:", err);
  }
}

export async function sendEmailSubscriptionConfirmation(
  subscriberEmail: string,
  authorName: string,
  authorId: string,
  unsubscribeToken: string
): Promise<void> {
  const t = getTransporter();
  if (!t) return;
  const baseUrl = getBaseUrl();
  const unsubscribeUrl = `${baseUrl}/unsubscribe/${unsubscribeToken}`;
  const rssUrl = `${baseUrl}/rss/author/${authorId}`;
  const body = `
<p style="color:#333;line-height:1.8;font-size:15px;">شكراً لاشتراكك في تحديثات الكاتب <strong>${authorName}</strong> على منصة QalamAI.</p>
<p style="color:#333;line-height:1.8;font-size:15px;">ستصلك رسالة بريدية في كلّ مرة ينشر فيها الكاتب عملاً جديداً.</p>
<div style="background:#f9f7f3;border-right:4px solid ${BRAND_GOLD};padding:16px 20px;margin:20px 0;border-radius:6px;">
  <p style="margin:0 0 8px;font-size:14px;color:#666;">يمكنك أيضاً الاشتراك في خلاصة RSS لمتابعة المقالات مباشرةً من قارئ RSS المفضّل لديك:</p>
  <a href="${rssUrl}" style="color:${BRAND_BLUE};font-size:13px;word-break:break-all;">${rssUrl}</a>
</div>
<p style="color:#999;font-size:12px;line-height:1.6;">إذا أردت إلغاء الاشتراك في أي وقت، <a href="${unsubscribeUrl}" style="color:#999;">اضغط هنا</a>.</p>`;
  try {
    await t.sendMail({
      from: `"QalamAI" <${process.env.SMTP_USER}>`,
      to: subscriberEmail,
      subject: `تم اشتراكك في تحديثات ${authorName} — QalamAI`,
      html: wrapInTemplate("تأكيد الاشتراك", body),
    });
  } catch (err) {
    console.error("[Email] Failed to send subscription confirmation:", err);
  }
}

export async function sendEmailSubscriberPublication(
  subscriberEmail: string,
  authorName: string,
  authorId: string,
  essayTitle: string,
  essayUrl: string,
  leaderboardRank: number | null,
  unsubscribeToken: string
): Promise<void> {
  const t = getTransporter();
  if (!t) return;
  const baseUrl = getBaseUrl();
  const unsubscribeUrl = `${baseUrl}/unsubscribe/${unsubscribeToken}`;
  const rankText = leaderboardRank && leaderboardRank <= 10 ? `<p style="color:#333;font-size:14px;">الكاتب في المرتبة <strong>${leaderboardRank}</strong> على لوحة المتصدرين حالياً.</p>` : "";
  const body = `
<p style="color:#333;line-height:1.8;font-size:15px;">نشر الكاتب <strong>${authorName}</strong> عملاً جديداً بعنوان:</p>
<div style="background:#f9f7f3;border-right:4px solid ${BRAND_GOLD};padding:16px 20px;margin:20px 0;border-radius:6px;">
  <p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:${BRAND_BLUE};">${essayTitle}</p>
  ${rankText}
</div>
<div style="text-align:center;margin:24px 0;">
  <a href="${essayUrl}" style="display:inline-block;background:${BRAND_GOLD};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">اقرأ الآن</a>
</div>
<p style="color:#999;font-size:12px;line-height:1.6;">اشتركت في تلقّي تحديثات ${authorName} على QalamAI. <a href="${unsubscribeUrl}" style="color:#999;">إلغاء الاشتراك</a>.</p>`;
  try {
    await t.sendMail({
      from: `"QalamAI" <${process.env.SMTP_USER}>`,
      to: subscriberEmail,
      subject: `${authorName} نشر عملاً جديداً — QalamAI`,
      html: wrapInTemplate("نشر جديد من كاتب تتابعه", body),
    });
  } catch (err) {
    console.error("[Email] Failed to send subscriber publication email:", err);
  }
}

export async function sendMonthlyAuthorReport(
  email: string,
  authorName: string,
  stats: { totalViews: number; totalEssays: number; followerCount: number; newFollowers: number; topEssay: { title: string; views: number } | null }
): Promise<void> {
  const t = getTransporter();
  if (!t) return;
  const baseUrl = getBaseUrl();
  const now = new Date();
  const monthName = now.toLocaleDateString("ar-SA", { month: "long", year: "numeric" });
  const topEssayHtml = stats.topEssay
    ? `<tr><td style="padding:8px 12px;color:#555;border-bottom:1px solid #f0ede8;">أفضل عمل</td><td style="padding:8px 12px;font-weight:bold;color:${BRAND_BLUE};border-bottom:1px solid #f0ede8;">${stats.topEssay.title} (${stats.topEssay.views} مشاهدة)</td></tr>`
    : "";
  const body = `
<p style="color:#333;line-height:1.8;font-size:15px;">مرحباً ${authorName}،</p>
<p style="color:#333;line-height:1.8;font-size:15px;">هذا ملخص أداء محتواك خلال شهر <strong>${monthName}</strong>:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e4dc;border-radius:8px;margin:20px 0;overflow:hidden;">
  <tr style="background:#f9f7f3;">
    <td style="padding:8px 12px;color:#555;border-bottom:1px solid #f0ede8;">إجمالي المشاهدات</td>
    <td style="padding:8px 12px;font-weight:bold;color:${BRAND_BLUE};border-bottom:1px solid #f0ede8;">${stats.totalViews.toLocaleString("ar")}</td>
  </tr>
  <tr>
    <td style="padding:8px 12px;color:#555;border-bottom:1px solid #f0ede8;">إجمالي الأعمال المنشورة</td>
    <td style="padding:8px 12px;font-weight:bold;color:${BRAND_BLUE};border-bottom:1px solid #f0ede8;">${stats.totalEssays}</td>
  </tr>
  <tr style="background:#f9f7f3;">
    <td style="padding:8px 12px;color:#555;border-bottom:1px solid #f0ede8;">إجمالي المتابعين</td>
    <td style="padding:8px 12px;font-weight:bold;color:${BRAND_BLUE};border-bottom:1px solid #f0ede8;">${stats.followerCount}</td>
  </tr>
  <tr>
    <td style="padding:8px 12px;color:#555;border-bottom:1px solid #f0ede8;">متابعون جدد هذا الشهر</td>
    <td style="padding:8px 12px;font-weight:bold;color:#16a34a;border-bottom:1px solid #f0ede8;">+${stats.newFollowers}</td>
  </tr>
  ${topEssayHtml}
</table>
<div style="text-align:center;margin:24px 0;">
  <a href="${baseUrl}/home" style="display:inline-block;background:${BRAND_GOLD};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">استعرض إحصائياتك</a>
</div>`;
  try {
    await t.sendMail({
      from: `"QalamAI" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `تقرير أداء ${monthName} — QalamAI`,
      html: wrapInTemplate(`تقرير ${monthName}`, body),
    });
    console.log(`[Email] Sent monthly report to ${email}`);
  } catch (err) {
    console.error("[Email] Failed to send monthly report:", err);
  }
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
