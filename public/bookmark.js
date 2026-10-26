const API_BASE = "http://localhost:3000/api/v1/bookmarks";

const form = document.querySelector("#bookmark-form");
const titleInput = document.querySelector("#title");
const urlInput = document.querySelector("#url");
const categoryInput = document.querySelector("#category");
const submitButton = document.querySelector("#submit-button");
const submitLabel = submitButton.querySelector("span");
const cancelEditButton = document.querySelector("#cancel-edit");
const grid = document.querySelector("#bookmark-grid");
const searchInput = document.querySelector("#search-input");
const filterCategory = document.querySelector("#filter-category");
const connectionStatus = document.querySelector("#connection-status");
const deleteDialog = document.querySelector("#delete-dialog");
const deleteTitle = document.querySelector("#delete-title");
const confirmDeleteButton = document.querySelector("#confirm-delete");
const toastRegion = document.querySelector("#toast-region");
const token = sessionStorage.getItem("marklyToken");
let bookmarks = [];
let editingId = null;
let pendingDeleteId = null;
let loading = false;

const icon = {
  external: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14 5 5 5M4 20l4.2-.8L19 8.4a2.1 2.1 0 0 0-3-3L5.2 16.2 4 20Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7m-9 0 1 13h10l1-13M10 10.5v6m4-6v6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="6" width="16" height="15" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M8 3.5v5M16 3.5v5M4 10h16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10 13.5a4.5 4.5 0 0 0 6.4 0l2.2-2.2a4.5 4.5 0 0 0-6.4-6.4l-1.3 1.3M14 10.5a4.5 4.5 0 0 0-6.4 0l-2.2 2.2a4.5 4.5 0 0 0 6.4 6.4l1.3-1.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 4.75A1.75 1.75 0 0 1 8.75 3h6.5A1.75 1.75 0 0 1 17 4.75V21l-5-3.2L7 21V4.75Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>'
};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function normalizeUrl(value) {
  return String(value || "").trim();
}

function getHost(value) {
  try { return new URL(value).hostname.replace(/^www\./, ""); }
  catch { return value; }
}

function formatDate(value) {
  if (!value) return "Recently added";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently added";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function setConnection(state, message) {
  connectionStatus.classList.remove("connected", "offline");
  if (state) connectionStatus.classList.add(state);
  connectionStatus.innerHTML = `<span class="status-dot"></span>${escapeHtml(message)}`;
  document.querySelector(".profile-dot").style.background = state === "connected" ? "#32aa7c" : state === "offline" ? "#d75c68" : "#d7a44a";
}

function showToast(title, message, isError = false) {
  const toast = document.createElement("div");
  toast.className = `toast${isError ? " error" : ""}`;
  toast.innerHTML = `<span class="toast-icon">${isError ? "!" : "✓"}</span><span><strong>${escapeHtml(title)}</strong>${escapeHtml(message)}</span>`;
  toastRegion.append(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

function getErrorMessage(payload, fallback) {
  return payload?.error?.message || payload?.message || fallback;
}

async function request(path = "", options = {}) {
  const token = sessionStorage.getItem("marklyToken");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    setConnection("offline", "API unavailable");
    throw new Error(`Can't reach the API at ${API_BASE}. Start your Express server and check the API URL.`);
  }
  let payload = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    payload = await response.json().catch(() => null);
  }
  if (!response.ok) {
    const message = getErrorMessage(payload, `Request failed (${response.status}).`);
    throw new Error(message);
  }
  setConnection("connected", "API connected");
  return payload;
}

function unwrapData(payload) {
  if (payload && Object.prototype.hasOwnProperty.call(payload, "data")) return payload.data;
  return payload;
}

async function loadBookmarks({ quiet = false } = {}) {
  if (loading) return;
  loading = true;
  if (!quiet) grid.innerHTML = '<div class="loading-state"><span class="loader"></span><p>Loading your bookmarks…</p></div>';
  try {
    const payload = await request();
    const data = unwrapData(payload);
    if (!Array.isArray(data)) throw new Error("Expected the API to return an array of bookmarks.");
    bookmarks = data;
    renderBookmarks();
  } catch (error) {
    if (!bookmarks.length) renderError(error.message);
    else showToast("Couldn't refresh bookmarks", error.message, true);
    if (!quiet) setConnection("offline", "Connection issue");
  } finally {
    loading = false;
  }
}

function filteredBookmarks() {
  const query = searchInput.value.trim().toLowerCase();
  const category = filterCategory.value;
  return [...bookmarks]
    .filter((item) => !category || item.category === category)
    .filter((item) => !query || [item.title, item.url, item.category].some((value) => String(value || "").toLowerCase().includes(query)))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function renderBookmarks() {
  const filtered = filteredBookmarks();
  document.querySelector("#total-count").textContent = bookmarks.length;
  document.querySelector("#sidebar-count").textContent = bookmarks.length;
  document.querySelector("#category-count").textContent = new Set(bookmarks.map((item) => item.category).filter(Boolean)).size;
  document.querySelector("#visible-count").textContent = filtered.length;
  document.querySelector("#results-label").textContent = `${filtered.length} ${filtered.length === 1 ? "bookmark" : "bookmarks"}${filtered.length !== bookmarks.length ? " found" : " in your collection"}`;

  if (!filtered.length) {
    const hasFilters = searchInput.value.trim() || filterCategory.value;
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-illustration">${icon.bookmark}</div>
        <h3>${hasFilters ? "No bookmarks match those filters" : "Your next great find goes here"}</h3>
        <p>${hasFilters ? "Try a different search or category." : "Save a useful link above and your personal library will start taking shape."}</p>
        ${hasFilters ? '<button class="button button-quiet" type="button" data-action="clear-filters">Clear filters</button>' : ""}
      </div>`;
    return;
  }
  grid.innerHTML = filtered.map((bookmark, index) => renderCard(bookmark, index)).join("");
}

function renderCard(bookmark, index) {
  const id = String(bookmark._id || bookmark.id || "");
  const safeUrl = safeHttpUrl(bookmark.url);
  const host = getHost(bookmark.url || "");
  const initial = (bookmark.title || host || "?").trim().charAt(0).toUpperCase();
  const description = host ? `Saved from ${host}` : "Saved to your library";
  const category = bookmark.category || "Other";
  return `
    <article class="bookmark-card" style="animation-delay:${Math.min(index * 35, 210)}ms">
      <div class="card-top">
        <div class="site-avatar" aria-hidden="true">${escapeHtml(initial)}</div>
        <div class="card-actions">
          <button class="card-action" type="button" data-action="edit" data-id="${escapeHtml(id)}" aria-label="Edit ${escapeHtml(bookmark.title)}" title="Edit bookmark">${icon.edit}</button>
          <button class="card-action delete" type="button" data-action="delete" data-id="${escapeHtml(id)}" aria-label="Delete ${escapeHtml(bookmark.title)}" title="Delete bookmark">${icon.trash}</button>
        </div>
      </div>
      <span class="category-badge" data-category="${escapeHtml(category)}">${escapeHtml(category)}</span>
      <button class="card-title" type="button" data-action="edit" data-id="${escapeHtml(id)}" title="Edit bookmark">${escapeHtml(bookmark.title || "Untitled bookmark")}</button>
      <a class="card-url" href="${safeUrl ? escapeHtml(safeUrl) : "#"}" ${safeUrl ? 'target="_blank" rel="noopener noreferrer"' : 'aria-disabled="true"'}>${icon.link}<span>${escapeHtml(host || bookmark.url || "No URL")}</span></a>
      <p class="card-description">${escapeHtml(description)}</p>
      <div class="card-bottom">
        <span class="card-date">${icon.calendar}${escapeHtml(formatDate(bookmark.createdAt))}</span>
        ${safeUrl ? `<a class="open-link" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">Visit site ${icon.external}</a>` : ""}
      </div>
    </article>`;
}

function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}

function renderError(message) {
  grid.innerHTML = `<div class="error-state">
    <div class="empty-illustration">${icon.link}</div>
    <h3>Couldn't load your bookmarks</h3>
    <p>${escapeHtml(message)}</p>
    <button class="button button-primary" type="button" data-action="retry">Try again</button>
  </div>`;
  document.querySelector("#total-count").textContent = "—";
  document.querySelector("#category-count").textContent = "—";
  document.querySelector("#visible-count").textContent = "0";
  document.querySelector("#results-label").textContent = "Connection needed";
}

function validateForm() {
  const title = titleInput.value.trim();
  const url = normalizeUrl(urlInput.value);
  const category = categoryInput.value.trim();
  if (!title || title.length > 100) return "Title is required and must be 1–100 characters.";
  if (!url || !safeHttpUrl(url)) return "Enter a valid URL beginning with http:// or https://.";
  if (!category || category.length > 30) return "Choose a category (maximum 30 characters).";
  return "";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const validationError = validateForm();
  if (validationError) {
    showToast("Check your details", validationError, true);
    return;
  }

  const body = {
    title: titleInput.value.trim(),
    url: normalizeUrl(urlInput.value),
    category: categoryInput.value.trim()
  };
  const currentEditId = editingId;
  setSubmitting(true, currentEditId ? "Saving changes…" : "Saving bookmark…");
  try {
    if (currentEditId) {
      await request(`/${encodeURIComponent(currentEditId)}`, {
        method: "PATCH",
        body: JSON.stringify(body)
      });
      showToast("Changes saved", "Your bookmark has been updated.");
    } else {
      await request("", { method: "POST", body: JSON.stringify(body) });
      showToast("Bookmark saved", "Your new link is in your library.");
    }
    resetForm();
    await loadBookmarks({ quiet: true });
  } catch (error) {
    showToast(currentEditId ? "Couldn't update bookmark" : "Couldn't save bookmark", error.message, true);
  } finally {
    setSubmitting(false);
  }
});

function setSubmitting(isSubmitting, label = "Save bookmark") {
  submitButton.disabled = isSubmitting;
  submitLabel.textContent = label;
  if (isSubmitting) submitButton.setAttribute("aria-busy", "true");
  else submitButton.removeAttribute("aria-busy");
}

function resetForm() {
  form.reset();
  editingId = null;
  document.querySelector("#form-heading").textContent = "Add a bookmark";
  submitLabel.textContent = "Save bookmark";
  submitButton.querySelector("svg").innerHTML = '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
  cancelEditButton.classList.add("hidden");
}

function beginEdit(id) {
  const bookmark = bookmarks.find((item) => String(item._id || item.id) === id);
  if (!bookmark) return showToast("Bookmark not found", "Refresh your collection and try again.", true);
  editingId = id;
  titleInput.value = bookmark.title || "";
  urlInput.value = bookmark.url || "";
  categoryInput.value = bookmark.category || "";
  document.querySelector("#form-heading").textContent = "Edit bookmark";
  submitLabel.textContent = "Save changes";
  submitButton.querySelector("svg").innerHTML = '<path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
  cancelEditButton.classList.remove("hidden");
  form.scrollIntoView({ behavior: "smooth", block: "center" });
  titleInput.focus({ preventScroll: true });
}

cancelEditButton.addEventListener("click", resetForm);

function beginDelete(id) {
  const bookmark = bookmarks.find((item) => String(item._id || item.id) === id);
  if (!bookmark) return showToast("Bookmark not found", "Refresh your collection and try again.", true);
  pendingDeleteId = id;
  deleteTitle.textContent = bookmark.title || "this bookmark";
  deleteDialog.showModal();
}

confirmDeleteButton.addEventListener("click", async (event) => {
  event.preventDefault();
  if (!pendingDeleteId) return;
  const id = pendingDeleteId;
  confirmDeleteButton.disabled = true;
  confirmDeleteButton.textContent = "Deleting…";
  try {
    await request(`/${encodeURIComponent(id)}`, { method: "DELETE" });
    deleteDialog.close();
    showToast("Bookmark deleted", "The bookmark has been removed.");
    if (editingId === id) resetForm();
    pendingDeleteId = null;
    await loadBookmarks({ quiet: true });
  } catch (error) {
    showToast("Couldn't delete bookmark", error.message, true);
  } finally {
    confirmDeleteButton.disabled = false;
    confirmDeleteButton.textContent = "Delete bookmark";
  }
});

grid.addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;
  const action = actionButton.dataset.action;
  if (action === "edit") beginEdit(actionButton.dataset.id);
  if (action === "delete") beginDelete(actionButton.dataset.id);
  if (action === "retry") loadBookmarks();
  if (action === "clear-filters") {
    searchInput.value = "";
    filterCategory.value = "";
    renderBookmarks();
  }
});

searchInput.addEventListener("input", renderBookmarks);
filterCategory.addEventListener("change", renderBookmarks);
document.querySelector("#refresh-button").addEventListener("click", () => loadBookmarks());

document.querySelectorAll(".nav-item[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    const view = button.dataset.view;
    if (view === "all") filterCategory.value = "";
    else filterCategory.value = view;
    renderBookmarks();
    document.querySelector("#library-heading").scrollIntoView({ behavior: "smooth", block: "start" });
  });
});


loadBookmarks();
