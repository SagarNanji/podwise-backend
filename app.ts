import express, { Request, Response } from "express";
import { configDotenv } from "dotenv";
import bodyParser from "body-parser";
import sessionRouter from "./routes/session";
import chatRouter from "./routes/chat";
import authRoutes from "./routes/auth";
import historyRoutes from "./routes/history";
import contactRoutes from "./routes/Contact";
import cors from "cors";
import session from "express-session";
import { connectToDb } from "./utils/db";
import path from "path";
import profileRoutes from "./routes/profile";

configDotenv();

const app = express();
const IS_PROD = process.env.NODE_ENV === "production";

// If deploying behind a proxy (Render/Railway/Heroku/NGINX), uncomment:
// app.set("trust proxy", 1);

// Browsers forbid `*` with credentials; this reflects the request origin instead.
const corsAllWithCreds = cors({
  origin: (_origin, cb) => cb(null, true), // reflect any Origin
  credentials: true, // allow cookies/Authorization
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
app.use(corsAllWithCreds);
app.options("*", corsAllWithCreds); // handle preflights

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET || "keyboard_cat",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // For local dev (same-site: localhost↔localhost): "lax" is fine.
      // For cross-site over HTTPS in prod: browsers require sameSite:"none" + secure:true.
      sameSite: IS_PROD ? "none" : "lax",
      secure: IS_PROD,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      path: "/",
    },
  })
);

/* ===================== Logger (simple) ===================== */
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

/* ===================== Static ===================== */
app.use(express.static(path.join(__dirname, "public")));

/* Welcome */
app.get("/", (_req: Request, res: Response) => {
  res.send("Welcome to the Chat Application API");
});

/* ===================== Routers ===================== */
app.use("/session", sessionRouter);
app.use("/chat", chatRouter);
app.use("/api/auth", authRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/profile", profileRoutes);

/* ===================== Start ===================== */
connectToDb()
  .then(() => {
    const port = Number(process.env.PORT) || 5000;
    app.listen(port, () => {
      console.log(`Server started on http://localhost:${port}`);
      console.log("CORS: allowing all origins with credentials");
    });
  })
  .catch((err) => {
    console.error("Failed to connect to DB:", err);
  });

export default app;
