// src/server.ts
import express from "express";
import { configDotenv } from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import session from "express-session";
import MongoStore from "connect-mongo";

import sessionRouter from "./routes/session";
import chatRouter from "./routes/chat";
import authRoutes from "./routes/auth";
import historyRoutes from "./routes/history";
import contactRoutes from "./routes/Contact";
import profileRoutes from "./routes/profile";
import { connectToDb } from "./utils/db";
import path from "path";

configDotenv();

const app = express();
const IS_PROD = process.env.NODE_ENV === "production";

// Behind proxies (Render): trust proxy so secure cookies work
app.set("trust proxy", 1);

// ---------- CORS (single middleware) ----------
const corsOptions: cors.CorsOptions = {
  origin: process.env.CORS_ORIGIN,  // e.g. https://podwise-frontend.vercel.app  (no trailing slash)
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};
app.use(cors(corsOptions));
app.options(/^\/.*/, cors(corsOptions));   // <-- add this line (or /^\/api\/.*/ to limit to /api)


// ---------- Session (single middleware) ----------
app.use(session({
  name: "sid",
  secret: process.env.SESSION_SECRET || "keyboard_cat",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI! }),
  cookie: {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure:   process.env.NODE_ENV === "production",
    partitioned: true,                 // 👈 add this
    maxAge: 1000 * 60 * 60 * 24,
    path: "/"
  }
}));


// ---------- Health ----------
app.get("/health", (_req, res) => res.json({ ok: true }));

// ---------- Parsers ----------
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ---------- Static (optional; points to dist/public at runtime) ----------
app.use(express.static(path.join(__dirname, "public")));

// ---------- Welcome ----------
app.get("/", (_req, res) => res.send("Welcome to the Chat Application API"));

// ---------- Routers (make them all /api/*) ----------
app.use("/api/session", sessionRouter);
app.use("/api/chat", chatRouter);
app.use("/api/auth", authRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/profile", profileRoutes);

// ---------- Start ----------
connectToDb()
  .then(() => {
    const port = Number(process.env.PORT) || 5000;
    app.listen(port, () => {
      console.log(`Server started on :${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to DB:", err);
    process.exit(1);
  });

export default app;
