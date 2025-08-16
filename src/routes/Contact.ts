import { Router, Request, Response } from "express";
const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { name, email, subject, category, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  console.log("Contact form:", { name, email, subject, category, message });

  return res.json({ ok: true });
});

export default router;
