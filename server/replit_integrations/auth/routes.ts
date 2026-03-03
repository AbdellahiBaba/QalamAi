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

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      if (user) {
        const { password: _, ...safeUser } = user;
        res.json(safeUser);
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/register", async (req: any, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      if (!email || !password || !firstName) {
        return res.status(400).json({ message: "الاسم والبريد الإلكتروني وكلمة المرور مطلوبة" });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "كلمة المرور يجب أن تكون ٦ أحرف على الأقل" });
      }

      const [existing] = await db.select().from(users).where(eq(users.email, email));
      if (existing) {
        return res.status(409).json({ message: "البريد الإلكتروني مسجل بالفعل" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const [user] = await db.insert(users).values({
        email,
        password: hashedPassword,
        firstName,
        lastName: lastName || null,
      }).returning();

      req.login({ claims: { sub: user.id } }, (err: any) => {
        if (err) {
          console.error("Login error after register:", err);
          return res.status(500).json({ message: "تم إنشاء الحساب لكن فشل تسجيل الدخول" });
        }
        const { password: _, ...safeUser } = user;
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

      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user || !user.password) {
        return res.status(401).json({ message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      }

      if (ADMIN_USER_IDS.includes(user.id) && user.role !== "admin") {
        await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id));
        user.role = "admin";
      }

      req.login({ claims: { sub: user.id } }, (err: any) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({ message: "فشل في تسجيل الدخول" });
        }
        const { password: _, ...safeUser } = user;
        res.json(safeUser);
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
      if (typeof firstName === "string" && firstName.trim()) updateData.firstName = firstName.trim();
      if (typeof lastName === "string") updateData.lastName = lastName.trim() || null;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "لا توجد بيانات لتحديثها" });
      }

      const [updated] = await db.update(users).set({ ...updateData, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
      if (!updated) return res.status(404).json({ message: "User not found" });
      const { password: _, ...safeUser } = updated;
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
      const user = await storage.getUserByEmail(email);
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
      if (password.length < 6) {
        return res.status(400).json({ message: "كلمة المرور يجب أن تكون ٦ أحرف على الأقل" });
      }
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken || resetToken.used || new Date() > resetToken.expiresAt) {
        return res.status(400).json({ message: "رابط إعادة التعيين غير صالح أو منتهي الصلاحية" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
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
        if (isOidcUser) {
          res.json({ success: true, oidcLogout: "/api/logout" });
        } else {
          res.json({ success: true });
        }
      });
    });
  });
}
