// @ts-nocheck

// ============================
// DARK MODE GLOBAL
// ============================

document.addEventListener("DOMContentLoaded", function () {

    const toggleBtn = document.querySelector("#darkModeToggle");

    // Apply saved theme
    if (localStorage.getItem("darkMode") === "enabled") {
        document.body.classList.add("dark-mode");
    }

    if (toggleBtn) {
        toggleBtn.addEventListener("click", function () {

            document.body.classList.toggle("dark-mode");

            if (document.body.classList.contains("dark-mode")) {
                localStorage.setItem("darkMode", "enabled");
            } else {
                localStorage.setItem("darkMode", "disabled");
            }

        });
    }

});

// ===============================
// STORAGE
// ===============================

let tasks = JSON.parse(localStorage.getItem("fanTasks")) || [];

// ===============================
// SELECTORS
// ===============================

const taskForm = document.querySelector("#taskForm");
const tableBody = document.querySelector("#taskTable tbody");
const summaryBox = document.querySelector("#summary");

const filterSelect = document.querySelector("#filterStatus");
const sortSelect = document.querySelector("#sortTasks");

const raceName = document.querySelector(".race-name");
const raceLocation = document.querySelector(".race-location");
const raceDate = document.querySelector(".race-date");

// ===============================
// SAVE
// ===============================

function saveTasks() {
    localStorage.setItem("fanTasks", JSON.stringify(tasks));
}

// ===============================
// RENDER
// ===============================

function renderTasks(filteredTasks = tasks) {
    if (!tableBody) return;

    tableBody.innerHTML = "";

    filteredTasks.forEach((task, index) => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${task.name}</td>
            <td>${task.description}</td>
            <td>${task.date}</td>
            <td class="${task.priority.toLowerCase()}">${task.priority}</td>
            <td>${task.completed ? "Completed" : "Upcoming"}</td>
            <td>
                <button class="btn btn-success btn-sm complete-btn" data-index="${index}">✔</button>
                <button class="btn btn-danger btn-sm delete-btn" data-index="${index}">🗑</button>
            </td>
        `;

        tableBody.appendChild(row);
    });

    updateSummary();
}

// ===============================
// SUMMARY
// ===============================

function updateSummary() {
    if (!summaryBox) return;

    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const upcoming = total - completed;

    summaryBox.innerHTML = `
        <strong>Total Plans:</strong> ${total} |
        <strong>Completed:</strong> ${completed} |
        <strong>Upcoming:</strong> ${upcoming}
    `;
}

// ===============================
// ADD TASK
// ===============================

if (taskForm) {
    taskForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const name = document.querySelector("#taskName").value.trim();
        const description = document.querySelector("#taskDesc").value.trim();
        const date = document.querySelector("#dueDate").value;
        const priority = document.querySelector("#priority").value;

        if (!name || !description || !date) {
            alert("Please fill all fields.");
            return;
        }

        tasks.push({
            name,
            description,
            date,
            priority,
            completed: false
        });

        saveTasks();
        renderTasks();
        taskForm.reset();
    });
}

// ===============================
// COMPLETE / DELETE (Delegation)
// ===============================

if (tableBody) {
    tableBody.addEventListener("click", function (e) {

        if (e.target.classList.contains("complete-btn")) {
            const index = e.target.dataset.index;
            tasks[index].completed = !tasks[index].completed;
        }

        if (e.target.classList.contains("delete-btn")) {
            const index = e.target.dataset.index;
            tasks.splice(index, 1);
        }

        saveTasks();
        renderTasks();
    });
}

// ===============================
// FILTERING
// ===============================

if (sortSelect) {
    sortSelect.addEventListener("change", function () {

        let sorted = [...tasks];

        if (this.value === "name") {
            sorted.sort((a, b) => a.name.localeCompare(b.name));
        }

        if (this.value === "date") {
            sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
        }

        renderTasks(sorted);
    });
}

// ===============================
// NEXT F1 RACE 
// ===============================

async function fetchNextRace() {

    const raceNameEl = document.querySelector(".race-name");
    const raceLocationEl = document.querySelector(".race-location");
    const raceDateEl = document.querySelector(".race-date");

    // Only run on homepage
    if (!raceNameEl) return;

    try {

        const response = await fetch(
            "https://api.jolpi.ca/ergast/f1/current.json"
        );

        const data = await response.json();
        const races = data.MRData.RaceTable.Races;

        const today = new Date();
        let nextRace = null;

        for (let race of races) {
            const raceDate = new Date(race.date);
            if (raceDate >= today) {
                nextRace = race;
                break;
            }
        }

        if (!nextRace) {
            raceNameEl.textContent = "Season Finished";
            raceLocationEl.textContent = "";
            raceDateEl.textContent = "";
            return;
        }

        raceNameEl.textContent = nextRace.raceName;

        raceLocationEl.textContent =
    nextRace.Circuit.circuitName + " - " +
    nextRace.Circuit.Location.locality + ", " +
    nextRace.Circuit.Location.country;

        raceDateEl.textContent = nextRace.date;

    } catch (error) {
        raceNameEl.textContent = "Unable to load race data";
        raceLocationEl.textContent = "";
        raceDateEl.textContent = "";
        console.error(error);
    }
}

fetchNextRace();
renderTasks();