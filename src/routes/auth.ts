import { Router } from "express";
import bcrypt from "bcryptjs";
import { getDb } from "../utils/db";
import { User } from "../models/User";

// --- Session typing (add userId so TS knows about it) ---
declare module "express-session" {
  interface SessionData {
    user?: { id: string; email: string; name: string };
    userId?: string; // <-- add this
  }
}

const router = Router();

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const db = getDb();
    const users = db.collection<User>("users");

    const existingUser = await users.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser: User = {
      name,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    };

    const result = await users.insertOne(newUser);

    req.session.regenerate((err) => {
      if (err) {
        console.error("Session regenerate error:", err);
        return res.status(500).json({ error: "Session error" });
      }
      // ✅ set session values AFTER regenerate
      req.session.user = { id: result.insertedId.toString(), email, name };
      req.session.userId = result.insertedId.toString();

      req.session.save((err2) => {
        if (err2) return res.status(500).json({ error: "Could not create session" });
        res.status(201).json({ message: "Signup successful", user: req.session.user });
      });
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/signin
router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = getDb();
    const users = db.collection<User>("users");

    const user = await users.findOne({ email });
    if (!user || typeof user.password !== "string") {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });

    // ⚠️ Do NOT set anything before regenerate; it will be lost.
    req.session.regenerate((err) => {
      if (err) {
        console.error("Session regenerate error:", err);
        return res.status(500).json({ error: "Session error" });
      }
      // ✅ set both shapes for compatibility
      const id = user._id?.toString() || "";
      req.session.user = { id, email: user.email ?? "", name: user.name ?? "" };
      req.session.userId = id;

      req.session.save((err2) => {
        if (err2) {
          console.error("Session save error:", err2);
          return res.status(500).json({ error: "Could not create session" });
        }
        res.json({ message: "Signin successful", user: req.session.user });
      });
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/signout
router.post("/signout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Could not log out" });
    res.json({ message: "Signout successful" });
  });
});

export default router;
