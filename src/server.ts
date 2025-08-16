import express, { Request, Response } from "express";
import { configDotenv } from "dotenv";
import bodyParser from "body-parser";
import sessionRouter from "../routes/session";
import chatRouter from "../routes/chat";
import authRoutes from "../routes/auth";
import historyRoutes from "../routes/history";
import contactRoutes from "../routes/Contact";
import profileRoutes from "../routes/profile";
import cors from "cors";
import session from "express-session";
import { connectToDb } from "../utils/db";
import path from "path";
import MongoStore from "connect-mongo";

configDotenv();

const app = express();
const IS_PROD = process.env.NODE_ENV === "production";

// If behind a proxy/CDN (Vercel/NGINX/etc.), keep cookies happy:
app.set("trust proxy", 1);

/* ===================== CORS ===================== */
/* Allow ALL origins with credentials.
   NOTE: with credentials, browsers forbid ACAO:*,
   so reflect the request Origin by returning true. */
const corsAllWithCreds = cors({
  origin: (_origin, cb) => cb(null, true),
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

// Must go BEFORE session/routers:
app.use(corsAllWithCreds);
app.use(cors({
  origin: process.env.CORS_ORIGIN, // e.g. https://your-frontend.vercel.app
  credentials: true
}));

app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI! }),
  cookie: {
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
  }
}));

// Express 5: use a RegExp (NOT "*" or "(.*)")
app.options(/.*/, corsAllWithCreds);

/* ===================== Health ===================== */
app.get("/health", (_req, res) => res.json({ ok: true }));

/* ===================== Parsers ===================== */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/* ===================== Session ===================== */
app.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET || "keyboard_cat",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // local dev: "lax" is fine; cross-site HTTPS prod: "none" + secure:true
      sameSite: IS_PROD ? "none" : "lax",
      secure: IS_PROD,
      maxAge: 1000 * 60 * 60 * 24,
      path: "/",
    },
  })
);

/* ===================== Logger ===================== */
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