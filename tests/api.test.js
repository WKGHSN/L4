
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");

const PORT = 3456;
const BASE_URL = `http://127.0.0.1:${PORT}`;

let server;

before(async () => {
  server = spawn(process.execPath, ["server.js"], {
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: "test",
      ADMIN_USER: "testadmin",
      ADMIN_PASSWORD: "test-password-123"
    },
    stdio: "ignore"
  });

  for (let i = 0; i < 50; i++) {
    if (server.exitCode !== null) {
      throw new Error("Тестовий сервер завершив роботу.");
    }

    try {
      const response = await fetch(BASE_URL + "/api/session");

      if (response.ok) {
        return;
      }
    } catch {}

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error("Тестовий сервер не запустився.");
});

after(() => {
  if (server) {
    server.kill();
  }
});

test("Сервер повертає головну сторінку", async () => {
  const response = await fetch(BASE_URL + "/");

  assert.equal(response.status, 200);

  const html = await response.text();

  assert.match(html, /AURA/);
});

test("Форма відхиляє некоректний email", async () => {
  const response = await fetch(BASE_URL + "/api/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "Тест",
      email: "wrong-email",
      message: "Перевірка"
    })
  });

  assert.equal(response.status, 400);

  const data = await response.json();

  assert.ok(data.errors.email);
});

test("Форма приймає коректне повідомлення", async () => {
  const response = await fetch(BASE_URL + "/api/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "Тест AURA",
      email: "test@example.com",
      message: "Автоматизований тест"
    })
  });

  assert.equal(response.status, 201);

  const data = await response.json();

  assert.ok(Number.isInteger(data.id));
});

test("Список повідомлень захищений авторизацією", async () => {
  const response = await fetch(BASE_URL + "/api/messages");

  assert.equal(response.status, 401);
});
