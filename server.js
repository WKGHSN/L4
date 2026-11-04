require("dotenv").config();

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const db = require("./db");

const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_USER || !ADMIN_PASSWORD) {
  console.error(
    "Створіть файл .env на основі .env.example (потрібні ADMIN_USER і ADMIN_PASSWORD)."
  );
  process.exit(1);
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SESSION_COOKIE = "aura_session";
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_FAILED_LOGINS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

const sessions = new Map();
const failedLogins = new Map();

const logDir = path.join(__dirname, "logs");
fs.mkdirSync(logDir, { recursive: true });

function logError(err) {
  const line =
    "[" +
    new Date().toISOString() +
    "] " +
    (err && err.stack ? err.stack : err) +
    "\n";

  console.error(line.trim());
  fs.appendFile(path.join(logDir, "error.log"), line, function () {});
}

function digest(value) {
  return crypto.createHash("sha256").update(String(value)).digest();
}

function safeEqual(a, b) {
  return crypto.timingSafeEqual(digest(a), digest(b));
}

function readCookie(req, name) {
  const header = req.headers.cookie || "";

  for (const part of header.split(";")) {
    const index = part.indexOf("=");

    if (index === -1) {
      continue;
    }

    if (part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }

  return null;
}

function isAuthenticated(req) {
  const token = readCookie(req, SESSION_COOKIE);

  if (!token || !sessions.has(token)) {
    return false;
  }

  if (sessions.get(token) < Date.now()) {
    sessions.delete(token);
    return false;
  }

  return true;
}

function requireAuth(req, res, next) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: "Потрібна авторизація." });
  }

  next();
}

function isBlocked(ip) {
  const entry = failedLogins.get(ip);

  if (!entry) {
    return false;
  }

  if (Date.now() - entry.first > LOGIN_WINDOW_MS) {
    failedLogins.delete(ip);
    return false;
  }

  return entry.count >= MAX_FAILED_LOGINS;
}

function registerFailure(ip) {
  const entry = failedLogins.get(ip);

  if (!entry || Date.now() - entry.first > LOGIN_WINDOW_MS) {
    failedLogins.set(ip, { count: 1, first: Date.now() });
  } else {
    entry.count += 1;
  }
}

function validateMessage(body) {
  const source = body && typeof body === "object" ? body : {};

  const name = typeof source.name === "string" ? source.name.trim() : "";
  const email = typeof source.email === "string" ? source.email.trim() : "";
  const message =
    typeof source.message === "string" ? source.message.trim() : "";

  const errors = {};

  if (name === "") {
    errors.name = "Вкажіть ім'я.";
  } else if (name.length < 2) {
    errors.name = "Ім'я має містити щонайменше 2 символи.";
  } else if (name.length > 50) {
    errors.name = "Ім'я не може бути довшим за 50 символів.";
  }

  if (email === "") {
    errors.email = "Вкажіть електронну адресу.";
  } else if (email.length > 100 || !EMAIL_PATTERN.test(email)) {
    errors.email = "Введіть коректний email, наприклад: name@example.com.";
  }

  if (message.length > 500) {
    errors.message = "Повідомлення не може бути довшим за 500 символів.";
  }

  return { values: { name, email, message }, errors };
}

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/favicon.ico", function (req, res) {
  res.status(204).end();
});

app.get("/health", function (req, res) {
  res.json({ status: "ok" });
});

app.post("/api/messages", function (req, res) {
  const result = validateMessage(req.body);

  if (Object.keys(result.errors).length > 0) {
    return res.status(400).json({ errors: result.errors });
  }

  const { name, email, message } = result.values;
  const id = db.addMessage(name, email, message);

  res.status(201).json({ id: id });
});

app.get("/api/messages", requireAuth, function (req, res) {
  res.json(db.getMessages());
});

app.delete("/api/messages/:id", requireAuth, function (req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Некоректний ідентифікатор." });
  }

  if (!db.deleteMessage(id)) {
    return res.status(404).json({ error: "Повідомлення не знайдено." });
  }

  res.status(204).end();
});

app.get("/api/session", function (req, res) {
  res.json({ authenticated: isAuthenticated(req) });
});

app.post("/api/login", function (req, res) {
  const ip = req.ip || "unknown";

  if (isBlocked(ip)) {
    return res
      .status(429)
      .json({ error: "Забагато невдалих спроб. Спробуйте пізніше." });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";

  const userOk = safeEqual(username, ADMIN_USER);
  const passwordOk = safeEqual(password, ADMIN_PASSWORD);

  if (!userOk || !passwordOk) {
    registerFailure(ip);
    return res.status(401).json({ error: "Невірний логін або пароль." });
  }

  failedLogins.delete(ip);

  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, Date.now() + SESSION_TTL_MS);

  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: SESSION_TTL_MS
  });
  res.json({ authenticated: true });
});

app.post("/api/logout", function (req, res) {
  const token = readCookie(req, SESSION_COOKIE);

  if (token) {
    sessions.delete(token);
  }

  res.clearCookie(SESSION_COOKIE);
  res.json({ authenticated: false });
});

app.use(function (err, req, res, next) {
  if (err && (err.type === "entity.parse.failed" || err.type === "entity.too.large")) {
    return res.status(400).json({ error: "Некоректні дані запиту." });
  }

  logError(err);
  res.status(500).json({ error: "Внутрішня помилка сервера." });
});

app.listen(PORT, function () {
  console.log("Сервер запущено: http://localhost:" + PORT);
  console.log("Сторінка адміністратора: http://localhost:" + PORT + "/admin.html");
});