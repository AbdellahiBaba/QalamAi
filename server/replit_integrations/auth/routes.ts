import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { users } from "@shared/models/auth";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import { storage } from "../../storage";
import { sendPasswordResetEmail } from "../../email";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) {
    return "كلمة المرور يجب أن تكون ٨ أحرف على الأقل";
  }
  if (!/[a-z]/.test(password)) {
    return "كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل";
  }
  if (!/[A-Z]/.test(password)) {
    return "كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل";
  }
  if (!/[0-9]/.test(password)) {
    return "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل";
  }
  return null;
}

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      if (user) {
        const { password: _, failedLoginAttempts: _f, lockedUntil: _l, ...safeUser } = user;
        res.json(safeUser);
      } else {
        res.status(404).json({ message: "المستخدم غير موجود" });
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "فشل في جلب بيانات المستخدم" });
    }
  });

  app.post("/api/auth/register", async (req: any, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      if (!email || !password || !firstName) {
        return res.status(400).json({ message: "الاسم والبريد الإلكتروني وكلمة المرور مطلوبة" });
      }

      const passwordError = validatePasswordStrength(password);
      if (passwordError) {
        return res.status(400).json({ message: passwordError });
      }

      const emailLower = email.toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
        return res.status(400).json({ message: "البريد الإلكتروني غير صالح" });
      }

      const [existing] = await db.select().from(users).where(eq(users.email, emailLower));
      if (existing) {
        return res.status(409).json({ message: "البريد الإلكتروني مسجل بالفعل" });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const [user] = await db.insert(users).values({
        email: emailLower,
        password: hashedPassword,
        firstName: firstName.slice(0, 100).trim(),
        lastName: lastName ? lastName.slice(0, 100).trim() : null,
      }).returning();

      req.login({ claims: { sub: user.id } }, (err: any) => {
        if (err) {
          console.error("Login error after register:", err);
          return res.status(500).json({ message: "تم إنشاء الحساب لكن فشل تسجيل الدخول" });
        }
        const { password: _, failedLoginAttempts: _f, lockedUntil: _l, ...safeUser } = user;
        res.status(201).json(safeUser);
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "فشل في إنشاء الحساب" });
    }
  });

  const ADMIN_USER_IDS = ["39706084", "e482facd-d157-4e97-ad91-af96b8ec8f49"];

  app.post("/api/auth/login", async (req: any, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "البريد الإلكتروني وكلمة المرور مطلوبة" });
      }

      const emailLower = email.toLowerCase().trim();
      const [user] = await db.select().from(users).where(eq(users.email, emailLower));
      if (!user || !user.password) {
        return res.status(401).json({ message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      }

      if (user.lockedUntil && new Date() < user.lockedUntil) {
        const remainingMin = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
        return res.status(423).json({
          message: `الحساب مقفل مؤقتاً بسبب محاولات متكررة. حاول بعد ${remainingMin} دقيقة`
        });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        const newAttempts = (user.failedLoginAttempts || 0) + 1;
        const updateData: any = { failedLoginAttempts: newAttempts };

        if (newAttempts >= MAX_FAILED_ATTEMPTS) {
          updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
          console.warn(`[Security] Account locked: ${emailLower} after ${newAttempts} failed attempts`);
        }

        await db.update(users).set(updateData).where(eq(users.id, user.id));
        return res.status(401).json({ message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      }

      await db.update(users).set({
        failedLoginAttempts: 0,
        lockedUntil: null,
      }).where(eq(users.id, user.id));

      if (ADMIN_USER_IDS.includes(user.id) && user.role !== "admin") {
        await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id));
        user.role = "admin";
      }

      req.session.regenerate((err: any) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ message: "فشل في تسجيل الدخول" });
        }
        req.login({ claims: { sub: user.id } }, (loginErr: any) => {
          if (loginErr) {
            console.error("Login error:", loginErr);
            return res.status(500).json({ message: "فشل في تسجيل الدخول" });
          }
          const { password: _, failedLoginAttempts: _f, lockedUntil: _l, ...safeUser } = user;
          res.json(safeUser);
        });
      });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ message: "فشل في تسجيل الدخول" });
    }
  });

  app.patch("/api/auth/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName } = req.body;
      const updateData: any = {};
      if (typeof firstName === "string" && firstName.trim()) updateData.firstName = firstName.trim().slice(0, 100);
      if (typeof lastName === "string") updateData.lastName = lastName.trim().slice(0, 100) || null;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "لا توجد بيانات لتحديثها" });
      }

      const [updated] = await db.update(users).set({ ...updateData, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
      if (!updated) return res.status(404).json({ message: "المستخدم غير موجود" });
      const { password: _, failedLoginAttempts: _f, lockedUntil: _l, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "فشل في تحديث الملف الشخصي" });
    }
  });

  app.post("/api/auth/forgot-password", async (req: any, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "البريد الإلكتروني مطلوب" });
      }
      const user = await storage.getUserByEmail(email.toLowerCase().trim());
      if (!user || !user.password) {
        return res.json({ message: "إذا كان البريد الإلكتروني مسجلاً، ستتلقى رابط إعادة التعيين" });
      }
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await storage.createPasswordResetToken(user.id, token, expiresAt);
      await sendPasswordResetEmail(email, token);
      res.json({ message: "إذا كان البريد الإلكتروني مسجلاً، ستتلقى رابط إعادة التعيين" });
    } catch (error) {
      console.error("Error in forgot-password:", error);
      res.status(500).json({ message: "فشل في إرسال رابط إعادة التعيين" });
    }
  });

  app.post("/api/auth/reset-password", async (req: any, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ message: "الرمز وكلمة المرور مطلوبان" });
      }

      const passwordError = validatePasswordStrength(password);
      if (passwordError) {
        return res.status(400).json({ message: passwordError });
      }

      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken || resetToken.used || new Date() > resetToken.expiresAt) {
        return res.status(400).json({ message: "رابط إعادة التعيين غير صالح أو منتهي الصلاحية" });
      }
      const hashedPassword = await bcrypt.hash(password, 12);
      await storage.updateUserPassword(resetToken.userId, hashedPassword);
      await storage.markPasswordResetTokenUsed(token);
      res.json({ message: "تم إعادة تعيين كلمة المرور بنجاح" });
    } catch (error) {
      console.error("Error in reset-password:", error);
      res.status(500).json({ message: "فشل في إعادة تعيين كلمة المرور" });
    }
  });

  app.post("/api/auth/logout", (req: any, res) => {
    const isOidcUser = !!(req.user?.access_token || req.user?.refresh_token);
    req.logout(() => {
      req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.clearCookie("csrf-token");
        if (isOidcUser) {
          res.json({ success: true, oidcLogout: "/api/logout" });
        } else {
          res.json({ success: true });
        }
      });
    });
  });
}
