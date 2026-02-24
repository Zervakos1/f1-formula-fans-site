// @ts-nocheck
/* ==========================================================
   F1 Fan Hub - script.js (Simplified / Student Style)
   - Dark mode toggle (saved in localStorage)
   - Task management (Add / Edit / Delete / Complete)
   - Filtering + Sorting + Priority filter
   - Latest Activity log on Home
   - Next Race API integration (with fallback)
   - Contact form validation + confirmation modal (shows details)
   ========================================================== */

// ------------------------------
// Small helper (only one)
// ------------------------------
function qs(selector, root = document) {
  return root.querySelector(selector);
}

// ------------------------------
// Load stored data
// ------------------------------
let tasks = JSON.parse(localStorage.getItem("fanTasks") || "[]");
let activityLog = JSON.parse(localStorage.getItem("fanActivity") || "[]");

// Save helpers
function saveTasks() {
  localStorage.setItem("fanTasks", JSON.stringify(tasks));
}
function saveActivity() {
  localStorage.setItem("fanActivity", JSON.stringify(activityLog));
}

// Make a simple unique ID for tasks (needed for edit/delete buttons)
function makeId() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

// ==========================================================
// 1) DARK MODE (works on all pages)
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
  const darkToggle = qs("#darkModeToggle");

  // Apply saved theme on page load
  if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark-mode");
  }

  // Toggle theme
  if (darkToggle) {
    darkToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");

      if (document.body.classList.contains("dark-mode")) {
        localStorage.setItem("darkMode", "enabled");
      } else {
        localStorage.setItem("darkMode", "disabled");
      }
    });
  }
});

// ==========================================================
// 2) LATEST ACTIVITY (Home page)
// ==========================================================
function addActivity(message) {
  // Newest first
  activityLog.unshift({
    message: message,
    time: new Date().toISOString()
  });

  // Keep only last 10
  activityLog = activityLog.slice(0, 10);
  saveActivity();
}

function renderActivity() {
  const ul = qs("#latestActivity");
  if (!ul) return; // Only exists on Home

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
    li.className = "list-group-item d-flex justify-content-between align-items-start";

    const left = document.createElement("div");
    left.textContent = a.message;

    const right = document.createElement("small");
    right.textContent = new Date(a.time).toLocaleString();

    li.appendChild(left);
    li.appendChild(right);
    ul.appendChild(li);
  });
}

// ==========================================================
// 3) TASKS (Tasks page)
// ==========================================================

// These store the filter/sort selections
const viewState = {
  status: "all",     // all | completed | pending
  priority: "all",   // all | High | Medium | Low
  sort: "none"       // none | name | date
};

function updateSummary() {
  const summaryBox = qs("#summary");
  if (!summaryBox) return;

  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;

  summaryBox.innerHTML =
    `<strong>Total Plans:</strong> ${total} |
     <strong>Completed:</strong> ${completed} |
     <strong>Pending:</strong> ${pending}`;
}

function applyFiltersAndSort(list) {
  let result = [...list];

  // Filter by status
  if (viewState.status === "completed") result = result.filter(t => t.completed);
  if (viewState.status === "pending") result = result.filter(t => !t.completed);

  // Filter by priority
  if (viewState.priority !== "all") result = result.filter(t => t.priority === viewState.priority);

  // Sort
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
  if (!tbody) return; // Only exists on tasks.html

  tbody.innerHTML = "";

  const visibleTasks = applyFiltersAndSort(tasks);

  if (visibleTasks.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="6" class="text-center">No tasks match your filters.</td>`;
    tbody.appendChild(row);
    updateSummary();
    return;
  }

  visibleTasks.forEach((task) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${task.name}</td>
      <td>${task.description}</td>
      <td>${task.date}</td>
      <td class="priority-${task.priority.toLowerCase()}">${task.priority}</td>
      <td>${task.completed ? "Completed" : "Pending"}</td>
      <td class="d-flex gap-2 justify-content-center flex-wrap">
        <button class="btn btn-success btn-sm complete-btn" data-id="${task.id}" aria-label="Mark completed">✔</button>
        <button class="btn btn-warning btn-sm edit-btn" data-id="${task.id}" aria-label="Edit task">✎</button>
        <button class="btn btn-danger btn-sm delete-btn" data-id="${task.id}" aria-label="Delete task">🗑</button>
      </td>
    `;

    tbody.appendChild(row);
  });

  updateSummary();
}

// Add task + events on the Tasks page
document.addEventListener("DOMContentLoaded", () => {
  const taskForm = qs("#taskForm");
  const tbody = qs("#taskTable tbody");

  // Add a new task
  if (taskForm) {
    taskForm.addEventListener("submit", (e) => {
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
      renderTasks();
      renderActivity();
      taskForm.reset();
    });
  }

  // Table buttons (event delegation)
  if (tbody) {
    tbody.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;

      const id = target.dataset.id;
      if (!id) return;

      const index = tasks.findIndex(t => t.id === id);
      if (index === -1) return;

      // Complete toggle
      if (target.classList.contains("complete-btn")) {
        tasks[index].completed = !tasks[index].completed;
        saveTasks();
        addActivity(`${tasks[index].completed ? "Completed" : "Reopened"}: "${tasks[index].name}"`);
        renderTasks();
        renderActivity();
      }

      // Delete
      if (target.classList.contains("delete-btn")) {
        const removed = tasks[index];
        tasks.splice(index, 1);
        saveTasks();
        addActivity(`Deleted: "${removed.name}"`);
        renderTasks();
        renderActivity();
      }

      // Edit (open modal)
      if (target.classList.contains("edit-btn")) {
        openEditModal(tasks[index]);
      }
    });
  }

  // Filters and sorting dropdowns
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

  // Initial render (tasks page)
  renderTasks();
});

// Edit modal functions
function openEditModal(task) {
  const modalEl = qs("#editTaskModal");
  if (!modalEl) return;

  qs("#editTaskId").value = task.id;
  qs("#editTaskName").value = task.name;
  qs("#editTaskDesc").value = task.description;
  qs("#editDueDate").value = task.date;
  qs("#editPriority").value = task.priority;

  // Bootstrap modal
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

document.addEventListener("DOMContentLoaded", () => {
  const saveBtn = qs("#saveEditBtn");
  if (!saveBtn) return;

  saveBtn.addEventListener("click", () => {
    const id = qs("#editTaskId")?.value || "";
    const index = tasks.findIndex(t => t.id === id);
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
    renderTasks();
    renderActivity();

    const modalEl = qs("#editTaskModal");
    if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
  });
});

// ==========================================================
// 4) API Integration: Next Race (Home)
// ==========================================================
async function fetchWithFallback(urls) {
  // Try endpoints one by one until one works
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

  if (!raceNameEl) return; // Only on Home

  raceNameEl.textContent = "Loading next race...";

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
        `${nextRace.Circuit.circuitName} - ${nextRace.Circuit.Location.locality}, ${nextRace.Circuit.Location.country}`;
    }

    if (raceDateEl) {
      raceDateEl.textContent = nextRace.date;
    }
  } catch (err) {
    raceNameEl.textContent = "Unable to load race data";
    if (raceLocationEl) raceLocationEl.textContent = "";
    if (raceDateEl) raceDateEl.textContent = "";
    console.error(err);
  }
}

// ==========================================================
// 5) CONTACT FORM (Validation + Modal with details)
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
  const form = qs("#contactForm");
  if (!form) return; // Only on contact page

  const submitBtn = qs("#contactSubmitBtn", form);

  // Enable button only when all fields are valid
  function updateButton() {
    if (submitBtn) submitBtn.disabled = !form.checkValidity();
  }

  form.addEventListener("input", updateButton);
  updateButton();

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // If invalid, show bootstrap validation style
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      updateButton();
      return;
    }

    // Get values
    const name = (qs("#contactName")?.value || "").trim();
    const email = (qs("#contactEmail")?.value || "").trim();
    const subject = (qs("#contactSubject")?.value || "").trim();
    const message = (qs("#contactMessage")?.value || "").trim();

    // Put values in confirmation modal
    qs("#confirmName").textContent = name;
    qs("#confirmEmail").textContent = email;
    qs("#confirmSubject").textContent = subject;
    qs("#confirmMessage").textContent = message;

    // Show modal
    const modalEl = qs("#contactConfirmModal");
    if (modalEl) new bootstrap.Modal(modalEl).show();

    // Reset form completely after submit
    form.reset();
    form.classList.remove("was-validated");
    updateButton();
  });
});

// ==========================================================
// Run page features on load
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
  renderActivity();  // Home only
  fetchNextRace();   // Home only
});