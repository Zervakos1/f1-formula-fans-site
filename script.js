// @ts-nocheck
/* ==========================================================
   F1 Fan Hub - script.js
   - Dark mode (persisted)
   - Tasks CRUD + Edit Modal
   - Filtering + Sorting + Priority Filter
   - Latest Activity (Home)
   - Next Race API integration (with fallback)
   - Contact form validation + confirmation modal (shows details)
   ========================================================== */

// ----------------------------------------------------------
// Small helper 
// ----------------------------------------------------------
function qs(selector, root = document) {
  return root.querySelector(selector);
}

// ----------------------------------------------------------
// Stored data
// ----------------------------------------------------------
let tasks = JSON.parse(localStorage.getItem("fanTasks") || "[]");
let activityLog = JSON.parse(localStorage.getItem("fanActivity") || "[]");

function saveTasks() {
  localStorage.setItem("fanTasks", JSON.stringify(tasks));
}

function saveActivity() {
  localStorage.setItem("fanActivity", JSON.stringify(activityLog));
}

function makeId() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

// ----------------------------------------------------------
// View state (filters/sorting) for tasks page
// ----------------------------------------------------------
const viewState = {
  status: "all",     // all | completed | pending
  priority: "all",   // all | High | Medium | Low
  sort: "none"       // none | name | date
};

// ==========================================================
// 1) DARK MODE
// ==========================================================
function applySavedTheme() {
  if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark-mode");
  }
}

function handleDarkModeToggle() {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem(
    "darkMode",
    document.body.classList.contains("dark-mode") ? "enabled" : "disabled"
  );
}

function initDarkMode() {
  applySavedTheme();

  const darkToggle = qs("#darkModeToggle");
  if (darkToggle) {
    darkToggle.addEventListener("click", handleDarkModeToggle);
  }
}

// ==========================================================
// 2) LATEST ACTIVITY (Home)
// ==========================================================
function addActivity(message) {
  activityLog.unshift({
    message: message,
    time: new Date().toISOString()
  });

  // Keep last 10
  activityLog = activityLog.slice(0, 10);
  saveActivity();
}

function renderActivity() {
  const ul = qs("#latestActivity");
  if (!ul) return;

  ul.innerHTML = "";

  if (activityLog.length === 0) {
    const li = document.createElement("li");
    li.className = "list-group-item";
    li.textContent = "No activity yet. Add your first fan plan!";
    ul.appendChild(li);
    return;
  }

  activityLog.forEach((a) => {
    const li = document.createElement("li");
    li.className =
      "list-group-item d-flex justify-content-between align-items-start";

    const left = document.createElement("div");
    left.textContent = a.message;

    const right = document.createElement("small");
    right.textContent = new Date(a.time).toLocaleString();

    li.appendChild(left);
    li.appendChild(right);
    ul.appendChild(li);
  });
}

function showToast(message) {
  const toastEl = qs("#taskToast");
  const msgEl = qs("#toastMsg");
  if (!toastEl || !msgEl) return;

  msgEl.textContent = message;
  new bootstrap.Toast(toastEl, { delay: 1800 }).show();
}

// ==========================================================
// 3) TASKS PAGE (CRUD + Filters + Sorting)
// ==========================================================
function updateSummary() {
  const summaryBox = qs("#summary");
  if (!summaryBox) return;

  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pending = total - completed;

  summaryBox.innerHTML =
    `<strong>Total Plans:</strong> ${total} | ` +
    `<strong>Completed:</strong> ${completed} | ` +
    `<strong>Pending:</strong> ${pending}`;
}

function applyFiltersAndSort(list) {
  let result = [...list];

  // Status filter
  if (viewState.status === "completed") result = result.filter((t) => t.completed);
  if (viewState.status === "pending") result = result.filter((t) => !t.completed);

  // Priority filter
  if (viewState.priority !== "all") {
    result = result.filter((t) => t.priority === viewState.priority);
  }

  // Sorting
  if (viewState.sort === "name") {
    result.sort((a, b) => a.name.localeCompare(b.name));
  }
  if (viewState.sort === "date") {
    result.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  return result;
}

function renderTasks() {
  const tbody = qs("#taskTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const visibleTasks = applyFiltersAndSort(tasks);

  if (visibleTasks.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML =
      `<td colspan="6" class="text-center">No tasks match your filters.</td>`;
    tbody.appendChild(row);
    updateSummary();
    return;
  }

  visibleTasks.forEach((task) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${task.name}</td>
      <td class="desc-cell">
      <div class="desc-scroll">${task.description}</div>
      </td>
      <td>${task.date}</td>
      <td class="priority-${task.priority.toLowerCase()}">${task.priority}</td>
      <td>${task.completed ? "Completed" : "Pending"}</td>
      <td class="actions-cell">
        <div class="action-buttons">
        <button class="btn btn-success btn-sm complete-btn" data-id="${task.id}" aria-label="Mark completed">✔</button>
        <button class="btn btn-warning btn-sm edit-btn" data-id="${task.id}" aria-label="Edit task">✎</button>
        <button class="btn btn-danger btn-sm delete-btn" data-id="${task.id}" aria-label="Delete task">🗑</button>
        </div>
    </td>
    `;

    tbody.appendChild(row);
  });

  updateSummary();
}

// ---------- Task handlers ----------
function handleTaskSubmit(e) {
  e.preventDefault();

  const name = (qs("#taskName")?.value || "").trim();
  const description = (qs("#taskDesc")?.value || "").trim();
  const date = qs("#dueDate")?.value || "";
  const priority = qs("#priority")?.value || "Medium";

  if (!name || !description || !date) {
    alert("Please fill all fields.");
    return;
  }

  tasks.push({
    id: makeId(),
    name,
    description,
    date,
    priority,
    completed: false
  });

  saveTasks();
  addActivity(`Added: "${name}" (${priority})`);
  showToast(`Added: ${name}`);
  renderTasks();
  renderActivity();

  qs("#taskForm")?.reset();
}

function toggleTaskComplete(index) {
  tasks[index].completed = !tasks[index].completed;
  saveTasks();
  addActivity(`${tasks[index].completed ? "Completed" : "Reopened"}: "${tasks[index].name}"`);
  showToast(tasks[index].completed ? "Marked as completed" : "Marked as pending");
  renderTasks();
  renderActivity();
}

function deleteTask(index) {
  const removed = tasks[index];
  tasks.splice(index, 1);
  saveTasks();
  addActivity(`Deleted: "${removed.name}"`);
  showToast("Task deleted");
  renderTasks();
  renderActivity();
}

function handleTableClick(e) {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;

  const id = target.dataset.id;
  if (!id) return;

  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return;

  if (target.classList.contains("complete-btn")) {
    toggleTaskComplete(index);
  } else if (target.classList.contains("delete-btn")) {
    deleteTask(index);
  } else if (target.classList.contains("edit-btn")) {
    openEditModal(tasks[index]);
  }
}

function openEditModal(task) {
  const modalEl = qs("#editTaskModal");
  if (!modalEl) return;

  qs("#editTaskId").value = task.id;
  qs("#editTaskName").value = task.name;
  qs("#editTaskDesc").value = task.description;
  qs("#editDueDate").value = task.date;
  qs("#editPriority").value = task.priority;

  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

function handleSaveEdit() {
  const id = qs("#editTaskId")?.value || "";
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return;

  const name = (qs("#editTaskName")?.value || "").trim();
  const description = (qs("#editTaskDesc")?.value || "").trim();
  const date = qs("#editDueDate")?.value || "";
  const priority = qs("#editPriority")?.value || "Medium";

  if (!name || !description || !date) {
    alert("Please fill all edit fields.");
    return;
  }

  tasks[index].name = name;
  tasks[index].description = description;
  tasks[index].date = date;
  tasks[index].priority = priority;

  saveTasks();
  addActivity(`Edited: "${name}" (${priority})`);
  showToast("Task updated");
  renderTasks();
  renderActivity();

  const modalEl = qs("#editTaskModal");
  if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
}

function initTasksPage() {
  const taskForm = qs("#taskForm");
  const tbody = qs("#taskTable tbody");
  const saveBtn = qs("#saveEditBtn");

  if (taskForm) taskForm.addEventListener("submit", handleTaskSubmit);
  if (tbody) tbody.addEventListener("click", handleTableClick);
  if (saveBtn) saveBtn.addEventListener("click", handleSaveEdit);

  const filterStatus = qs("#filterStatus");
  if (filterStatus) {
    filterStatus.addEventListener("change", function () {
      viewState.status = this.value;
      renderTasks();
    });
  }

  const filterPriority = qs("#filterPriority");
  if (filterPriority) {
    filterPriority.addEventListener("change", function () {
      viewState.priority = this.value;
      renderTasks();
    });
  }

  const sortTasks = qs("#sortTasks");
  if (sortTasks) {
    sortTasks.addEventListener("change", function () {
      viewState.sort = this.value;
      renderTasks();
    });
  }

  // Initial render
  renderTasks();
}

// ==========================================================
// 4) API INTEGRATION (Next Race) with fallback
// ==========================================================
async function fetchWithFallback(urls) {
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      return await res.json();
    } catch (err) {
      // try next
    }
  }
  throw new Error("All API endpoints failed");
}

async function fetchNextRace() {
  const raceNameEl = qs(".race-name");
  const raceLocationEl = qs(".race-location");
  const raceDateEl = qs(".race-date");

  if (!raceNameEl) return;

  raceNameEl.textContent = "Loading next race...";
  if (raceLocationEl) raceLocationEl.textContent = "";
  if (raceDateEl) raceDateEl.textContent = "";

  try {
    const data = await fetchWithFallback([
      "https://api.jolpi.ca/ergast/f1/current.json",
      "https://ergast.com/api/f1/current.json"
    ]);

    const races = data.MRData?.RaceTable?.Races || [];
    const today = new Date();

    let nextRace = null;
    for (const r of races) {
      if (new Date(r.date) >= today) {
        nextRace = r;
        break;
      }
    }

    if (!nextRace) {
      raceNameEl.textContent = "No upcoming race found.";
      return;
    }

    raceNameEl.textContent = nextRace.raceName;

    if (raceLocationEl) {
      raceLocationEl.textContent =
        `${nextRace.Circuit.circuitName} - ` +
        `${nextRace.Circuit.Location.locality}, ${nextRace.Circuit.Location.country}`;
    }

    if (raceDateEl) {
      raceDateEl.textContent = nextRace.date;
    }
  } catch (err) {
    raceNameEl.textContent = "Unable to load race data";
    console.error(err);
  }
}

// ==========================================================
// 5) CONTACT FORM (Validation + Modal)
// ==========================================================
function handleContactSubmit(e) {
  e.preventDefault();

  const form = qs("#contactForm");
  if (!form) return;

  if (!form.checkValidity()) {
    form.classList.add("was-validated");
    return;
  }

  const name = (qs("#contactName")?.value || "").trim();
  const email = (qs("#contactEmail")?.value || "").trim();
  const subject = (qs("#contactSubject")?.value || "").trim();
  const message = (qs("#contactMessage")?.value || "").trim();

  qs("#confirmName").textContent = name;
  qs("#confirmEmail").textContent = email;
  qs("#confirmSubject").textContent = subject;
  qs("#confirmMessage").textContent = message;

  const modalEl = qs("#contactConfirmModal");
  if (modalEl) new bootstrap.Modal(modalEl).show();

  // Reset form + validation state
  form.reset();
  form.classList.remove("was-validated");

  // Disable submit again until inputs are valid 
  const submitBtn = qs("#contactSubmitBtn", form);
  if (submitBtn) submitBtn.disabled = true;
}

function initContactPage() {
  const form = qs("#contactForm");
  if (!form) return;

  const submitBtn = qs("#contactSubmitBtn", form);

  // Small helper inside init 
  function updateButton() {
    if (submitBtn) submitBtn.disabled = !form.checkValidity();
  }

  form.addEventListener("input", updateButton);
  form.addEventListener("submit", handleContactSubmit);
  updateButton();
}

// ==========================================================
// 6) ANALYTICS PAGE (Chart)
// ==========================================================

function renderAnalyticsCharts() {
  const statusCanvas = qs("#statusChart");
  const priorityCanvas = qs("#priorityChart");

  // If not on analytics page, stop
  if (!statusCanvas || !priorityCanvas || typeof Chart === "undefined") return;

  // Calculate data
  const completed = tasks.filter(t => t.completed).length;
  const pending = tasks.length - completed;

  const high = tasks.filter(t => t.priority === "High").length;
  const medium = tasks.filter(t => t.priority === "Medium").length;
  const low = tasks.filter(t => t.priority === "Low").length;

  // Status Bar Chart
  new Chart(statusCanvas, {
    type: "bar",
    data: {
      labels: ["Completed", "Pending"],
      datasets: [{
        label: "Tasks",
        data: [completed, pending],
        backgroundColor: ["#28a745", "#dc3545"]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      }
    }
  });

  // Priority Pie Chart
  new Chart(priorityCanvas, {
    type: "pie",
    data: {
      labels: ["High", "Medium", "Low"],
      datasets: [{
        data: [high, medium, low],
        backgroundColor: ["#dc3545", "#ffc107", "#28a745"]
      }]
    },
    options: {
      responsive: true
    }
  });
}

// Back to Top button
function initBackToTop() {
  const btn = qs(".back-to-top");
  if (!btn) return;

  window.addEventListener("scroll", () => {
    if (window.scrollY > 250) btn.classList.add("show");
    else btn.classList.remove("show");
  });

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// ==========================================================
// INIT (Single DOMContentLoaded)
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
  initDarkMode();
  initTasksPage();
  initContactPage();
  initBackToTop();

  // These only do something on pages that contain the elements
renderActivity();
fetchNextRace();
renderAnalyticsCharts();
});