import express from "express";
import cookieParser from "cookie-parser";
import crypto from "crypto";

const app = express();
const port = 3001;

const sessions = new Map();

const hardcodedUser = {
  email: "demo@example.com",
  password: "password123",
};

app.use(express.json());
app.use(cookieParser());

const createSession = () => {
  const sessionId = crypto.randomUUID();
  const csrfToken = crypto.randomBytes(16).toString("hex");
  sessions.set(sessionId, { csrfToken, user: null });
  return { sessionId, csrfToken };
};

const getSession = (req) => {
  const sessionId = req.cookies.session_id;
  if (!sessionId) return null;
  const session = sessions.get(sessionId);
  return session ? { sessionId, ...session } : null;
};

const setSessionCookie = (res, sessionId) => {
  res.cookie("session_id", sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
};

const requireCsrfToken = (req, res, next) => {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ message: "No active session" });
  }

  const csrfHeader = req.header("x-csrf-token");
  if (!csrfHeader || csrfHeader !== session.csrfToken) {
    return res.status(403).json({ message: "Invalid or missing CSRF token" });
  }

  req.session = session;
  return next();
};

const requireLoggedIn = (req, res, next) => {
  if (!req.session?.user) {
    return res.status(401).json({ message: "Login required" });
  }

  return next();
};

app.get("/api/health", (req, res) => {
  return res.json({ ok: true });
});

app.get("/api/csrf", (req, res) => {
  const existing = getSession(req);
  const session = existing ?? createSession();
  setSessionCookie(res, session.sessionId);
  return res.json({ csrfToken: session.csrfToken });
});

app.post("/api/login", requireCsrfToken, (req, res) => {
  const { email, password } = req.body || {};
  if (email !== hardcodedUser.email || password !== hardcodedUser.password) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const sessionRecord = sessions.get(req.session.sessionId);
  sessionRecord.user = { email };
  sessionRecord.csrfToken = crypto.randomBytes(16).toString("hex");
  sessionRecord.authToken = crypto.randomBytes(12).toString("hex");

  setSessionCookie(res, req.session.sessionId);
  return res.json({
    user: sessionRecord.user,
    token: sessionRecord.authToken,
    csrfToken: sessionRecord.csrfToken,
  });
});

app.post("/api/logout", requireCsrfToken, (req, res) => {
  sessions.delete(req.session.sessionId);
  res.clearCookie("session_id", { path: "/" });
  return res.json({ ok: true });
});

app.post("/api/transfer", requireCsrfToken, requireLoggedIn, (req, res) => {
  return res.json({ ok: true, message: "Transfer accepted" });
});

app.listen(port, () => {
  console.log(`API server running at http://localhost:${port}`);
});
