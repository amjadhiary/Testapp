/* UI layer: renders state and wires DOM events to the pure functions in tasks.js. */
(function () {
  "use strict";

  const STORAGE_KEY = "task-manager.tasks.v1";
  const T = window.Tasks;

  const state = {
    tasks: load(),
    status: "all",
    query: "",
    sortBy: "created",
    editingId: null,
  };

  const el = {
    form: document.getElementById("task-form"),
    title: document.getElementById("task-title"),
    priority: document.getElementById("task-priority"),
    due: document.getElementById("task-due"),
    formError: document.getElementById("form-error"),
    list: document.getElementById("task-list"),
    empty: document.getElementById("empty"),
    summary: document.getElementById("summary"),
    search: document.getElementById("search"),
    sort: document.getElementById("sort"),
    filters: document.querySelectorAll("[data-status]"),
    clear: document.getElementById("clear-completed"),
    template: document.getElementById("task-template"),
  };

  function load() {
    try {
      return T.sanitize(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
    } catch {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
    } catch {
      /* Storage unavailable (private mode, quota): keep working in memory. */
    }
  }

  function commit(nextTasks) {
    state.tasks = nextTasks;
    save();
    render();
  }

  function formatDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }

  function renderTask(task) {
    const node = el.template.content.firstElementChild.cloneNode(true);
    node.dataset.id = task.id;
    node.classList.toggle("is-done", task.completed);
    node.classList.toggle("is-overdue", T.isOverdue(task));

    const toggle = node.querySelector(".task-toggle");
    toggle.checked = task.completed;
    toggle.setAttribute("aria-label", `Mark "${task.title}" as ${task.completed ? "active" : "completed"}`);

    const priority = node.querySelector(".task-priority");
    priority.textContent = task.priority;
    priority.classList.add(`priority-${task.priority}`);

    const due = node.querySelector(".task-due");
    due.textContent = task.dueDate ? `Due ${formatDate(task.dueDate)}${T.isOverdue(task) ? " (overdue)" : ""}` : "";

    const body = node.querySelector(".task-body");
    if (state.editingId === task.id) {
      body.replaceChildren(buildEditor(task));
      node.querySelector(".task-actions").hidden = true;
    } else {
      node.querySelector(".task-title").textContent = task.title;
    }
    return node;
  }

  function buildEditor(task) {
    const form = document.createElement("form");
    form.className = "edit-form";
    form.innerHTML = `
      <input name="title" type="text" maxlength="200" required aria-label="Task title" />
      <select name="priority" aria-label="Priority">
        <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
      </select>
      <input name="dueDate" type="date" aria-label="Due date" />
      <button type="submit" class="btn-primary">Save</button>
      <button type="button" class="btn-link" data-cancel>Cancel</button>`;
    form.elements.title.value = task.title;
    form.elements.priority.value = task.priority;
    form.elements.dueDate.value = task.dueDate || "";
    queueMicrotask(() => form.elements.title.focus());
    return form;
  }

  function render() {
    const visible = T.sortTasks(T.filterTasks(state.tasks, state), state.sortBy);
    el.list.replaceChildren(...visible.map(renderTask));
    el.empty.hidden = visible.length > 0;
    el.empty.textContent = state.tasks.length ? "No tasks match the current filter." : "No tasks yet. Add one above.";

    const s = T.stats(state.tasks);
    el.summary.textContent = `${s.active} active · ${s.completed} completed` + (s.overdue ? ` · ${s.overdue} overdue` : "");
    el.clear.disabled = s.completed === 0;
    el.filters.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.status === state.status)));
  }

  // --- Events ---------------------------------------------------------------

  el.form.addEventListener("submit", (e) => {
    e.preventDefault();
    try {
      commit(T.addTask(state.tasks, { title: el.title.value, priority: el.priority.value, dueDate: el.due.value }));
      el.form.reset();
      el.formError.textContent = "";
      el.title.focus();
    } catch (err) {
      el.formError.textContent = err.message;
    }
  });

  el.list.addEventListener("change", (e) => {
    if (!e.target.classList.contains("task-toggle")) return;
    commit(T.toggleTask(state.tasks, e.target.closest(".task").dataset.id));
  });

  el.list.addEventListener("click", (e) => {
    const item = e.target.closest(".task");
    if (!item) return;
    const id = item.dataset.id;
    if (e.target.closest(".task-delete")) {
      const task = state.tasks.find((t) => t.id === id);
      if (confirm(`Delete "${task.title}"?`)) commit(T.deleteTask(state.tasks, id));
    } else if (e.target.closest(".task-edit")) {
      state.editingId = id;
      render();
    } else if (e.target.closest("[data-cancel]")) {
      state.editingId = null;
      render();
    }
  });

  el.list.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    const id = form.closest(".task").dataset.id;
    try {
      const next = T.updateTask(state.tasks, id, {
        title: form.elements.title.value,
        priority: form.elements.priority.value,
        dueDate: form.elements.dueDate.value,
      });
      state.editingId = null;
      commit(next);
    } catch (err) {
      form.elements.title.setCustomValidity(err.message);
      form.elements.title.reportValidity();
      form.elements.title.setCustomValidity("");
    }
  });

  el.list.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.editingId) {
      state.editingId = null;
      render();
    }
  });

  el.filters.forEach((btn) =>
    btn.addEventListener("click", () => {
      state.status = btn.dataset.status;
      render();
    })
  );

  el.search.addEventListener("input", () => {
    state.query = el.search.value;
    render();
  });

  el.sort.addEventListener("change", () => {
    state.sortBy = el.sort.value;
    render();
  });

  el.clear.addEventListener("click", () => {
    if (confirm("Remove all completed tasks?")) commit(T.clearCompleted(state.tasks));
  });

  // Keep multiple open tabs in sync.
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      state.tasks = load();
      render();
    }
  });

  render();
})();
