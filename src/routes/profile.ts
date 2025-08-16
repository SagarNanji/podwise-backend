import { Router, Request, Response, NextFunction } from "express";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { getDb } from "../utils/db";
import type { Session } from "express-session";

const router = Router();

/** What we store in the session */
type SessionUser = { id: string; email: string; name: string };

/** Request type that guarantees a session with an optional user */
type AuthedRequest = Request & {
  session: Session & { user?: SessionUser };
};

/* Middleware: ensure a logged-in user */
function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

/* Get current profile (name, email, company, title, bio) */
router.get("/", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const db = getDb();
    const userId = new ObjectId(req.session.user!.id);

    const user = await db
      .collection("users")
      .findOne(
        { _id: userId },
        { projection: { name: 1, email: 1, company: 1, title: 1, bio: 1 } }
      );

    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ user });
  } catch (err) {
    console.error("GET /api/profile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* Update profile fields */
router.put("/", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const db = getDb();
    const userId = new ObjectId(req.session.user!.id);

    const { name, company, title, bio } = req.body || {};
    const update: Record<string, string> = {};
    if (typeof name === "string") update.name = name.trim();
    if (typeof company === "string") update.company = company.trim();
    if (typeof title === "string") update.title = title.trim();
    if (typeof bio === "string") update.bio = bio.trim();

    if (!Object.keys(update).length) {
      return res.status(400).json({ message: "No changes provided" });
    }

    await db.collection("users").updateOne({ _id: userId }, { $set: update });
    return res.json({ message: "Profile updated" });
  } catch (err) {
    console.error("PUT /api/profile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* Change password (uses 'password' field to store the bcrypt hash) */
router.put(
  "/password",
  requireAuth,
  async (req: AuthedRequest, res: Response) => {
    try {
      const db = getDb();
      const userId = new ObjectId(req.session.user!.id);

      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword) {
        return res
          .status(400)
          .json({ message: "Both current and new passwords are required" });
      }
      if (newPassword.length < 8) {
        return res
          .status(400)
          .json({ message: "New password must be at least 8 characters" });
      }

      // Your auth code stores the hash under "password"
      const user = await db
        .collection("users")
        .findOne({ _id: userId }, { projection: { password: 1 } });

      if (!user?.password || typeof user.password !== "string") {
        return res
          .status(400)
          .json({ message: "Password change unavailable for this account" });
      }

      const ok = await bcrypt.compare(currentPassword, user.password);
      if (!ok) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await db
        .collection("users")
        .updateOne({ _id: userId }, { $set: { password: newHash } });

      return res.json({ message: "Password updated" });
    } catch (err) {
      console.error("PUT /api/profile/password error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;
