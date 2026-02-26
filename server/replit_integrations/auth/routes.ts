import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import bcrypt from "bcryptjs";
import { users } from "@shared/models/auth";
import { db } from "../../db";
import { eq } from "drizzle-orm";

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
