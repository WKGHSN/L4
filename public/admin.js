"use strict";

const loginPanel = document.getElementById("login-panel");
const messagesPanel = document.getElementById("messages-panel");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const logoutButton = document.getElementById("logout-button");
const messagesList = document.getElementById("messages-list");
const messagesCount = document.getElementById("messages-count");
const messagesEmpty = document.getElementById("messages-empty");
const messagesError = document.getElementById("messages-error");

try {
  const savedTheme = localStorage.getItem("aura-theme");

  if (savedTheme === "dark" || savedTheme === "light") {
    document.documentElement.setAttribute("data-theme", savedTheme);
  }
} catch (error) {
  document.documentElement.removeAttribute("data-theme");
}

function messageWord(n) {
  const lastTwo = n % 100;
  const last = n % 10;

  if (lastTwo >= 11 && lastTwo <= 14) {
    return "повідомлень";
  }
  if (last === 1) {
    return "повідомлення";
  }
  if (last >= 2 && last <= 4) {
    return "повідомлення";
  }
  return "повідомлень";
}

function formatDate(value) {
  const date = new Date(value.replace(" ", "T") + "Z");
  return date.toLocaleString("uk-UA");
}

function showLogin() {
  loginPanel.hidden = false;
  messagesPanel.hidden = true;
  logoutButton.hidden = true;
}

function showMessages() {
  loginPanel.hidden = true;
  messagesPanel.hidden = false;
  logoutButton.hidden = false;
}

function createMessageCard(item) {
  const card = document.createElement("article");
  card.className = "message-card";

  const meta = document.createElement("div");
  meta.className = "message-meta";

  const name = document.createElement("strong");
  name.textContent = item.name;

  const email = document.createElement("a");
  email.href = "mailto:" + item.email;
  email.textContent = item.email;

  const info = document.createElement("small");
  info.textContent = "№" + item.id + " · " + formatDate(item.created_at);

  meta.append(name, email, info);

  const remove = document.createElement("button");
  remove.className = "message-delete";
  remove.type = "button";
  remove.dataset.id = String(item.id);
  remove.textContent = "Видалити";
  remove.setAttribute("aria-label", "Видалити повідомлення №" + item.id);

  const body = document.createElement("p");
  body.className = "message-body";

  if (item.message === "") {
    body.classList.add("is-empty");
    body.textContent = "Без тексту повідомлення";
  } else {
    body.textContent = item.message;
  }

  card.append(meta, remove, body);
  return card;
}

function renderMessages(items) {
  messagesList.innerHTML = "";

  items.forEach(function (item) {
    messagesList.append(createMessageCard(item));
  });

  messagesEmpty.hidden = items.length !== 0;
  messagesCount.textContent = items.length + " " + messageWord(items.length);
}

async function loadMessages() {
  messagesError.textContent = "";

  try {
    const response = await fetch("/api/messages");

    if (response.status === 401) {
      showLogin();
      return;
    }

    showMessages();

    if (!response.ok) {
      messagesError.textContent = "Не вдалося завантажити повідомлення.";
      return;
    }

    renderMessages(await response.json());
  } catch (error) {
    showMessages();
    messagesError.textContent = "Немає з'єднання з сервером.";
  }
}

loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  loginError.textContent = "";

  const username = loginForm.elements.username.value.trim();
  const password = loginForm.elements.password.value;

  if (username === "" || password === "") {
    loginError.textContent = "Введіть логін і пароль.";
    return;
  }

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username, password: password })
    });

    if (response.ok) {
      loginForm.reset();
      await loadMessages();
      return;
    }

    if (response.status === 401) {
      loginError.textContent = "Невірний логін або пароль.";
    } else if (response.status === 429) {
      loginError.textContent = "Забагато невдалих спроб. Спробуйте пізніше.";
    } else {
      loginError.textContent = "Не вдалося увійти. Спробуйте пізніше.";
    }
  } catch (error) {
    loginError.textContent = "Немає з'єднання з сервером.";
  }
});

logoutButton.addEventListener("click", async function () {
  try {
    await fetch("/api/logout", { method: "POST" });
  } finally {
    messagesList.innerHTML = "";
    showLogin();
  }
});

messagesList.addEventListener("click", async function (event) {
  const button = event.target.closest(".message-delete");

  if (!button) {
    return;
  }

  if (!window.confirm("Видалити це повідомлення?")) {
    return;
  }

  try {
    const response = await fetch("/api/messages/" + button.dataset.id, {
      method: "DELETE"
    });

    if (response.status === 401) {
      showLogin();
      return;
    }

    if (!response.ok && response.status !== 404) {
      messagesError.textContent = "Не вдалося видалити повідомлення.";
      return;
    }

    await loadMessages();
  } catch (error) {
    messagesError.textContent = "Немає з'єднання з сервером.";
  }
});

loadMessages();
