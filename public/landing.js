const authForm = document.querySelector("#auth-form");
const formTitle = document.querySelector("#form-title"),
  formSubtitle = document.querySelector("#form-subtitle"),
  accountHeading = document.querySelector("#account-heading");
const submitBtn = document.querySelector("#submit-btn"),
  buttonText = document.querySelector("#button-text"),
  formMessage = document.querySelector("#form-message");
const password = document.querySelector("#password"),
  emailInput = document.querySelector("#email");
const forgotPassword = document.querySelector("#forgot-password"),
  termsCopy = document.querySelector("#terms-copy"),
  authFooter = document.querySelector("#auth-footer");
let currentMode = "register";
function showMessage(message, type = "error") {
  formMessage.textContent = message;
  formMessage.className = `message visible ${type}`;
}
function clearMessage() {
  formMessage.textContent = "";
  formMessage.className = "message";
}
function setMode(mode) {
  currentMode = mode === "login" ? "login" : "register";
  const login = currentMode === "login";
  formTitle.textContent = login ? "Welcome back" : "Create your account";
  formSubtitle.textContent = login
    ? "Sign in to return to your personal library."
    : "Start collecting the links you love.";
  accountHeading.innerHTML = login
    ? "Your good stuff<br>is waiting."
    : "Make room for<br>your next great find.";
  buttonText.textContent = login ? "Log in to Markly" : "Create your account";
  password.autocomplete = login ? "current-password" : "new-password";
  document.querySelector("#password-hint").textContent = login
    ? "Enter your account password."
    : "Use at least 8 characters.";
  forgotPassword.style.display = login ? "inline" : "none";
  termsCopy.style.display = login ? "none" : "block";
  authFooter.innerHTML = login
    ? 'New to Markly? <button type="button" data-mode="register">Create an account</button>'
    : 'Already have an account? <button type="button" data-mode="login">Log in</button>';
  document.querySelector("#register-tab").classList.toggle("active", !login);
  document.querySelector("#login-tab").classList.toggle("active", login);
  document
    .querySelector("#register-tab")
    .setAttribute("aria-selected", String(!login));
  document
    .querySelector("#login-tab")
    .setAttribute("aria-selected", String(login));
  clearMessage();
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-mode]");
  if (b) {
    e.preventDefault();
    setMode(b.dataset.mode);
    if (b.tagName === "A")
      document
        .querySelector("#account")
        .scrollIntoView({ behavior: "smooth", block: "center" });
  }
});
document.querySelector("#toggle-password").addEventListener("click", () => {
  const show = password.type === "password";
  password.type = show ? "text" : "password";
  document
    .querySelector("#toggle-password")
    .setAttribute("aria-label", show ? "Hide password" : "Show password");
});
authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessage();
  const email = emailInput.value.trim().toLowerCase(),
    passwordValue = password.value;
  if (!email || !passwordValue) {
    showMessage("Please enter your email and password.");
    return;
  }
  if (!emailInput.checkValidity()) {
    showMessage("Please enter a valid email address.");
    return;
  }
  if (currentMode === "register" && passwordValue.length < 8) {
    showMessage("Your password must be at least 8 characters long.");
    return;
  }
  submitBtn.disabled = true;
  buttonText.textContent =
    currentMode === "login" ? "Logging in..." : "Creating account...";
  try {
    const endpoint =
      currentMode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/register";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: passwordValue }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(
        data.message ||
          (currentMode === "login" ? "Login failed." : "Registration failed."),
      );
    if (currentMode === "register") {
      if (!data.token) {
        throw new Error("Registration succeeded, but no token was returned.");
      }

      sessionStorage.setItem("marklyToken", data.token);
      window.location.href = "/bookmark.html";
    } else {
      if (!data.token) {
        throw new Error("Login response did not include a token.");
      }

      sessionStorage.setItem("marklyToken", data.token);
      window.location.href = "/bookmark.html";
    }
  } catch (error) {
    showMessage(
      error.message ||
        "Unable to connect. Make sure your Express server is running.",
    );
  } finally {
    submitBtn.disabled = false;
    buttonText.textContent =
      currentMode === "login" ? "Log in to Markly" : "Create your account";
  }
});
document.querySelector("#google-login").addEventListener("click", () => {
  window.location.href = "/api/v1/auth/google";
});
forgotPassword.addEventListener("click", (e) => {
  e.preventDefault();
  showMessage(
    "Password reset is not set up yet. For now, contact the app administrator.",
  );
});
document.querySelectorAll(".placeholder-link").forEach((a) =>
  a.addEventListener("click", (e) => {
    e.preventDefault();
    showMessage("Terms and Privacy Policy pages haven't been added yet.");
  }),
);
document.querySelector("#year").textContent = new Date().getFullYear();
setMode("register");
