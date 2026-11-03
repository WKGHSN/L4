"use strict";
const menuToggle = document.getElementById("menu-toggle");
const mainNav = document.getElementById("main-nav");

function setMenuOpen(isOpen) {
  mainNav.classList.toggle("is-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Закрити меню" : "Відкрити меню");
}

menuToggle.addEventListener("click", function () {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  setMenuOpen(!isOpen);
});

mainNav.addEventListener("click", function (event) {
  if (event.target.closest("a")) {
    setMenuOpen(false);
  }
});

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && mainNav.classList.contains("is-open")) {
    setMenuOpen(false);
    menuToggle.focus();
  }
});

window.addEventListener("resize", function () {
  if (window.innerWidth > 600) {
    setMenuOpen(false);
  }
});


const THEME_KEY = "aura-theme";

const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-toggle-icon");
const themeText = document.getElementById("theme-toggle-text");

function getSavedTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch (error) {
    return null; 
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (error) {
   
  }
}

function applyTheme(theme) {
  const isDark = theme === "dark";

  document.documentElement.setAttribute("data-theme", theme);

  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.setAttribute(
    "aria-label",
    isDark ? "Перемкнути на світлу тему" : "Перемкнути на темну тему"
  );
  themeIcon.textContent = isDark ? "☀" : "☾";
  themeText.textContent = isDark ? "Світла" : "Темна";
}

themeToggle.addEventListener("click", function () {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";

  applyTheme(next);
  saveTheme(next);
});

(function initTheme() {
  const saved = getSavedTheme();

  if (saved === "dark" || saved === "light") {
    applyTheme(saved);
  } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    applyTheme("dark");
  } else {
    applyTheme("light");
  }
})();


const detailsButtons = document.querySelectorAll(".details-button");

detailsButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    const details = document.getElementById(button.getAttribute("aria-controls"));
    const willOpen = details.hidden;

    details.hidden = !willOpen;
    button.setAttribute("aria-expanded", String(willOpen));
    button.textContent = willOpen ? "Сховати" : "Детальніше";
  });
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function setFieldError(input, message) {
  const errorBox = document.getElementById(input.id + "-error");

  input.classList.add("is-invalid");
  input.classList.remove("is-valid");
  input.setAttribute("aria-invalid", "true");

  if (errorBox) {
    errorBox.textContent = message;
  }
}

function setFieldValid(input) {
  const errorBox = document.getElementById(input.id + "-error");

  input.classList.remove("is-invalid");
  input.classList.add("is-valid");
  input.removeAttribute("aria-invalid");

  if (errorBox) {
    errorBox.textContent = "";
  }
}

function clearFieldState(input) {
  const errorBox = document.getElementById(input.id + "-error");

  input.classList.remove("is-invalid", "is-valid");
  input.removeAttribute("aria-invalid");

  if (errorBox) {
    errorBox.textContent = "";
  }
}

function validateText(input, label, minLength, isRequired) {
  const value = input.value.trim();

  if (value === "") {
    if (isRequired) {
      setFieldError(input, "Поле «" + label + "» обов'язкове для заповнення.");
      return false;
    }
    clearFieldState(input);
    return true;
  }

  if (value.length < minLength) {
    setFieldError(
      input,
      "Поле «" + label + "» має містити щонайменше " + minLength + " символи."
    );
    return false;
  }

  setFieldValid(input);
  return true;
}

function validateEmail(input) {
  const value = input.value.trim();

  if (value === "") {
    setFieldError(input, "Вкажіть електронну адресу.");
    return false;
  }

  if (!EMAIL_PATTERN.test(value)) {
    setFieldError(input, "Введіть коректний email, наприклад: name@example.com.");
    return false;
  }

  setFieldValid(input);
  return true;
}


const bookingForm = document.getElementById("booking-form");
const visitorName = document.getElementById("visitor-name");
const visitorEmail = document.getElementById("visitor-email");
const visitorMessage = document.getElementById("visitor-message");
const formSuccess = document.getElementById("form-success");

function validateBookingName() {
  return validateText(visitorName, "Ім'я", 2, true);
}

function validateBookingEmail() {
  return validateEmail(visitorEmail);
}

function hideSuccess() {
  formSuccess.hidden = true;
  formSuccess.textContent = "";
}

visitorName.addEventListener("blur", validateBookingName);
visitorEmail.addEventListener("blur", validateBookingEmail);

visitorName.addEventListener("input", function () {
  hideSuccess();
  if (visitorName.classList.contains("is-invalid")) {
    validateBookingName();
  }
});

visitorEmail.addEventListener("input", function () {
  hideSuccess();
  if (visitorEmail.classList.contains("is-invalid")) {
    validateBookingEmail();
  }
});

visitorMessage.addEventListener("input", hideSuccess);

const bookingSubmit = bookingForm.querySelector('button[type="submit"]');
const formError = document.getElementById("form-error");

const SERVER_FIELDS = {
  name: visitorName,
  email: visitorEmail,
  message: visitorMessage
};

bookingForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  hideSuccess();
  formError.textContent = "";

  const nameOk = validateBookingName();
  const emailOk = validateBookingEmail();

  if (!nameOk || !emailOk) {
    const firstInvalid = bookingForm.querySelector(".is-invalid");
    if (firstInvalid) {
      firstInvalid.focus();
    }
    return;
  }

  const payload = {
    name: visitorName.value.trim(),
    email: visitorEmail.value.trim(),
    message: visitorMessage.value.trim()
  };

  bookingSubmit.disabled = true;

  try {
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (response.status === 201) {
      formSuccess.textContent =
        "Дякуємо, " + payload.name + "! Ваше повідомлення збережено. " +
        "Ми зв'яжемося з вами за адресою " + payload.email + ".";
      formSuccess.hidden = false;

      bookingForm.reset();
      clearFieldState(visitorName);
      clearFieldState(visitorEmail);
      return;
    }

    if (response.status === 400) {
      const data = await response.json();
      const errors = data.errors || {};

      Object.keys(errors).forEach(function (field) {
        if (SERVER_FIELDS[field]) {
          setFieldError(SERVER_FIELDS[field], errors[field]);
        }
      });

      if (!data.errors) {
        formError.textContent = data.error || "Перевірте введені дані.";
      }
      return;
    }

    formError.textContent = "Не вдалося зберегти повідомлення. Спробуйте пізніше.";
  } catch (error) {
    formError.textContent = "Немає з'єднання з сервером. Перевірте, чи запущено сервер.";
  } finally {
    bookingSubmit.disabled = false;
  }
});

let reviews = [
  {
    id: 1,
    name: "Ірина",
    text: "Ходжу на хатха-йогу вже пів року. Дуже спокійна атмосфера, а Олена пояснює кожну позу.",
    date: "12.09.2026"
  },
  {
    id: 2,
    name: "Максим",
    text: "Перший раз спробував віньясу і не пошкодував. Темп комфортний, техніку показують уважно.",
    date: "28.09.2026"
  },
  {
    id: 3,
    name: "Оксана",
    text: "Після пілатесу з Андрієм минув біль у спині. Рекомендую всім, хто багато працює сидячи.",
    date: "15.10.2026"
  }
];

let nextReviewId = reviews.length + 1;

const reviewList = document.getElementById("review-list");
const reviewsCount = document.getElementById("reviews-count");
const reviewForm = document.getElementById("review-form");
const reviewName = document.getElementById("review-name");
const reviewText = document.getElementById("review-text");


function reviewWord(n) {
  const lastTwo = n % 100;
  const last = n % 10;

  if (lastTwo >= 11 && lastTwo <= 14) {
    return "відгуків";
  }
  if (last === 1) {
    return "відгук";
  }
  if (last >= 2 && last <= 4) {
    return "відгуки";
  }
  return "відгуків";
}

function createReviewCard(review) {
  const card = document.createElement("article");
  card.className = "review-card";
  card.dataset.id = String(review.id);

  const head = document.createElement("div");
  head.className = "review-head";

  const avatar = document.createElement("div");
  avatar.className = "review-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = review.name.charAt(0).toUpperCase();

  const author = document.createElement("div");
  author.className = "review-author";

  const authorName = document.createElement("strong");
  authorName.textContent = review.name;

  const authorDate = document.createElement("small");
  authorDate.textContent = review.date;

  author.append(authorName, authorDate);
  head.append(avatar, author);

  const text = document.createElement("p");
  text.className = "review-text";
  text.textContent = review.text;

  const deleteButton = document.createElement("button");
  deleteButton.className = "review-delete";
  deleteButton.type = "button";
  deleteButton.dataset.id = String(review.id);
  deleteButton.textContent = "Видалити";
  deleteButton.setAttribute("aria-label", "Видалити відгук користувача " + review.name);

  card.append(head, text, deleteButton);
  return card;
}

function renderReviews() {
  reviewList.innerHTML = "";

  if (reviews.length === 0) {
    const empty = document.createElement("p");
    empty.className = "review-empty";
    empty.textContent = "Поки що відгуків немає. Будьте першими!";
    reviewList.append(empty);
  } else {
    reviews.forEach(function (review) {
      reviewList.append(createReviewCard(review));
    });
  }

  reviewsCount.textContent = reviews.length + " " + reviewWord(reviews.length);
}

function validateReviewName() {
  return validateText(reviewName, "Ім'я", 2, true);
}

function validateReviewText() {
  return validateText(reviewText, "Відгук", 10, true);
}

reviewName.addEventListener("blur", validateReviewName);
reviewText.addEventListener("blur", validateReviewText);

reviewName.addEventListener("input", function () {
  if (reviewName.classList.contains("is-invalid")) {
    validateReviewName();
  }
});

reviewText.addEventListener("input", function () {
  if (reviewText.classList.contains("is-invalid")) {
    validateReviewText();
  }
});

reviewForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const nameOk = validateReviewName();
  const textOk = validateReviewText();

  if (!nameOk || !textOk) {
    const firstInvalid = reviewForm.querySelector(".is-invalid");
    if (firstInvalid) {
      firstInvalid.focus();
    }
    return;
  }

  const newReview = {
    id: nextReviewId,
    name: reviewName.value.trim(),
    text: reviewText.value.trim(),
    date: new Date().toLocaleDateString("uk-UA")
  };

  nextReviewId += 1;
  reviews.unshift(newReview); 
  renderReviews();

  reviewForm.reset();
  clearFieldState(reviewName);
  clearFieldState(reviewText);
});

reviewList.addEventListener("click", function (event) {
  const button = event.target.closest(".review-delete");

  if (!button) {
    return;
  }

  const id = Number(button.dataset.id);

  reviews = reviews.filter(function (review) {
    return review.id !== id;
  });

  renderReviews();
});

renderReviews();