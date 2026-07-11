const STORAGE_KEY = "orbit-applications-v1";
const THEME_KEY = "orbit-theme";

const stages = [
  {
    id: "wishlist",
    label: "Wishlist",
    color: "#a2a5b5"
  },
  {
    id: "applied",
    label: "Applied",
    color: "#6c5ce7"
  },
  {
    id: "interview",
    label: "Interview",
    color: "#e59b2d"
  },
  {
    id: "offer",
    label: "Offer",
    color: "#25a86b"
  }
];

const seed = [
  {
    id: crypto.randomUUID(),
    company: "Vercel",
    role: "Frontend Engineer",
    stage: "wishlist",
    workType: "Remote",
    location: "India",
    date: "",
    link: "",
    notes: "Explore the design systems team."
  },
  {
    id: crypto.randomUUID(),
    company: "Freshworks",
    role: "Frontend Developer",
    stage: "offer",
    workType: "Hybrid",
    location: "Chennai",
    date: today(-20),
    link: "",
    notes: "Offer received â€” review details."
  }
];

let applications = load();
let draggedId = null;

const $ = id => document.getElementById(id);

const board = $("board");
const dialog = $("appDialog");
const form = $("appForm");

function today(offset = 0) {
  const d = new Date();

  d.setDate(d.getDate() + offset);

  return d.toISOString().slice(0, 10);
}

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));

    return Array.isArray(data) ? data : seed;
  } catch {
    return seed;
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
}

function safe(value = "") {
  const div = document.createElement("div");

  div.textContent = value;

  return div.innerHTML;
}

function initials(name) {
  return name
    .split(/\s+/)
    .map(x => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function colorFor(name) {
  const colors = [
    "#6c5ce7",
    "#2f80ed",
    "#0f9d83",
    "#e8734a",
    "#d44f84",
    "#5868c7"
  ];

  return colors[
    [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length
  ];
}

function relativeDate(date) {
  if (!date) {
    return "Not applied yet";
  }

  const days = Math.round(
    (new Date() - new Date(date + "T00:00:00")) / 86400000
  );

  if (days <= 0) {
    return "Applied today";
  }

  if (days === 1) {
    return "Applied yesterday";
  }

  return `Applied ${days} days ago`;
}

function render() {
  const query = $("searchInput").value.trim().toLowerCase();
  const type = $("typeFilter").value;

  const visible = applications.filter(a =>
    (type === "all" || a.workType === type) &&
    (`${a.company} ${a.role} ${a.location}`.toLowerCase().includes(query))
  );

  board.innerHTML = stages.map(stage => {
    const cards = visible.filter(a => a.stage === stage.id);

    return `
      <section class="column" data-stage="${stage.id}">
        <div class="column-head">
          <span class="column-title">
            <i class="column-dot" style="background:${stage.color}"></i>
            ${stage.label}
          </span>

          <span class="count">${cards.length}</span>
        </div>

        <div class="cards">
          ${cards.map(cardHTML).join("") || '<div class="empty-column">Drop an application here</div>'}
        </div>
      </section>
    `;
  }).join("");

  $("noResults").hidden = visible.length > 0 || applications.length === 0;

  bindCards();
  updateStats();
}

function cardHTML(a) {
  return `
    <article class="job-card" draggable="true" data-id="${a.id}">
      <div class="card-top">
        <div class="company-logo" style="background:${colorFor(a.company)}">
          ${safe(initials(a.company))}
        </div>

        <div class="card-title">
          <strong>${safe(a.role)}</strong>
          <small>${safe(a.company)}</small>
        </div>

        <button class="edit-card" aria-label="Edit ${safe(a.company)}">
          -
        </button>
      </div>

      <div class="tags">
        <span class="tag">${safe(a.workType)}</span>
        ${a.location ? `<span class="tag">${safe(a.location)}</span>` : ""}
      </div>

      <div class="card-foot">
        <span>${relativeDate(a.date)}</span>
        ${a.link ? `<a href="${safe(a.link)}" target="_blank" rel="noopener">View job â†—</a>` : ""}
      </div>
    </article>
  `;
}

function bindCards() {
  document.querySelectorAll(".job-card").forEach(card => {
    card.addEventListener("dragstart", () => {
      draggedId = card.dataset.id;
      card.classList.add("dragging");
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
    });

    card.querySelector(".edit-card").addEventListener("click", () => {
      openForm(card.dataset.id);
    });

    card.addEventListener("dblclick", () => {
      openForm(card.dataset.id);
    });
  });

  document.querySelectorAll(".column").forEach(col => {
    col.addEventListener("dragover", e => {
      e.preventDefault();
      col.classList.add("drag-over");
    });

    col.addEventListener("dragleave", () => {
      col.classList.remove("drag-over");
    });

    col.addEventListener("drop", e => {
      e.preventDefault();
      col.classList.remove("drag-over");

      const app = applications.find(a => a.id === draggedId);

      if (app && app.stage !== col.dataset.stage) {
        app.stage = col.dataset.stage;

        save();
        render();

        toast(`Moved to ${stages.find(s => s.id === app.stage).label}`);
      }
    });
  });
}

function updateStats() {
  const interviews = applications.filter(a => a.stage === "interview").length;
  const offers = applications.filter(a => a.stage === "offer").length;

  const responded = interviews + offers;
  const applied = applications.filter(a => a.stage !== "wishlist").length;

  $("statTotal").textContent = applications.length;
  $("statInterviews").textContent = interviews;
  $("statOffers").textContent = offers;
  $("statRate").textContent = applied
    ? Math.round(responded / applied * 100) + "%"
    : "0%";

  $("sideActive").textContent =
    `${applications.filter(a => !["offer"].includes(a.stage)).length} active`;

  const month = new Date().toISOString().slice(0, 7);

  const monthCount = applications.filter(a =>
    a.date?.startsWith(month)
  ).length;

  $("monthCount").textContent =
    `${monthCount} application${monthCount === 1 ? "" : "s"}`;

  const most = stages
    .map(s => ({
      label: s.label,
      n: applications.filter(a => a.stage === s.id).length
    }))
    .sort((a, b) => b.n - a.n)[0];

  $("bestStage").textContent = applications.length
    ? `${most.label} leads your board`
    : "Start your pipeline";
}

function openForm(id) {
  form.reset();

  $("editId").value = id || "";
  $("deleteBtn").hidden = !id;

  $("formTitle").textContent = id
    ? "Edit application"
    : "Add application";

  $("formEyebrow").textContent = id
    ? "UPDATE OPPORTUNITY"
    : "NEW OPPORTUNITY";

  if (id) {
    const a = applications.find(x => x.id === id);

    $("company").value = a.company;
    $("role").value = a.role;
    $("stage").value = a.stage;
    $("workType").value = a.workType;
    $("location").value = a.location || "";
    $("appliedDate").value = a.date || "";
    $("jobLink").value = a.link || "";
    $("notes").value = a.notes || "";
  } else {
    $("stage").value = "applied";
    $("appliedDate").value = today();
  }

  dialog.showModal();

  setTimeout(() => $("company").focus(), 50);
}

function closeForm() {
  dialog.close();
}

function toast(message) {
  const el = $("toast");

  el.textContent = message;
  el.classList.add("show");

  clearTimeout(el.timer);

  el.timer = setTimeout(() => {
    el.classList.remove("show");
  }, 2200);
}

form.addEventListener("submit", e => {
  e.preventDefault();

  const id = $("editId").value;

  const entry = {
    id: id || crypto.randomUUID(),
    company: $("company").value.trim(),
    role: $("role").value.trim(),
    stage: $("stage").value,
    workType: $("workType").value,
    location: $("location").value.trim(),
    date: $("appliedDate").value,
    link: $("jobLink").value.trim(),
    notes: $("notes").value.trim()
  };

  if (id) {
    applications = applications.map(a => a.id === id ? entry : a);
  } else {
    applications.unshift(entry);
  }

  save();
  render();
  closeForm();

  toast(id ? "Application updated" : "Application added");
});

$("deleteBtn").addEventListener("click", () => {
  const id = $("editId").value;

  if (confirm("Delete this application?")) {
    applications = applications.filter(a => a.id !== id);

    save();
    render();
    closeForm();

    toast("Application deleted");
  }
});

$("addBtn").addEventListener("click", () => openForm());

$("closeDialog").addEventListener("click", closeForm);

$("cancelBtn").addEventListener("click", closeForm);

dialog.addEventListener("click", e => {
  if (e.target === dialog) {
    closeForm();
  }
});

$("searchInput").addEventListener("input", render);

$("typeFilter").addEventListener("change", render);

$("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("dark");

  localStorage.setItem(
    THEME_KEY,
    document.body.classList.contains("dark") ? "dark" : "light"
  );

  $("themeBtn").textContent =
    document.body.classList.contains("dark") ? "☾" : "☾";
});

if (localStorage.getItem(THEME_KEY) === "dark") {
  document.body.classList.add("dark");
  $("themeBtn").textContent = "☾";
}

const hour = new Date().getHours();

$("greeting").textContent =
  hour < 12
    ? "GOOD MORNING"
    : hour < 17
      ? "GOOD AFTERNOON"
      : "GOOD EVENING";

render();
