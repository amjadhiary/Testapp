/* Pure task logic: no DOM access, so it runs in the browser and in Node tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Tasks = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const PRIORITIES = ["low", "medium", "high"];
  const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

  function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function normalizeTitle(title) {
    return String(title == null ? "" : title).replace(/\s+/g, " ").trim();
  }

  function isValidDate(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(value + "T00:00:00Z"));
  }

  function createTask(input, now = new Date()) {
    const title = normalizeTitle(input && input.title);
    if (!title) throw new Error("Task title is required.");
    if (title.length > 200) throw new Error("Task title must be 200 characters or fewer.");
    const priority = PRIORITIES.includes(input.priority) ? input.priority : "medium";
    const dueDate = isValidDate(input.dueDate) ? input.dueDate : null;
    return {
      id: makeId(),
      title,
      priority,
      dueDate,
      completed: false,
      createdAt: now.toISOString(),
      completedAt: null,
    };
  }

  function addTask(tasks, input, now) {
    return [createTask(input, now), ...tasks];
  }

  function updateTask(tasks, id, changes) {
    return tasks.map((t) => {
      if (t.id !== id) return t;
      const next = { ...t };
      if ("title" in changes) {
        const title = normalizeTitle(changes.title);
        if (!title) throw new Error("Task title is required.");
        next.title = title;
      }
      if ("priority" in changes && PRIORITIES.includes(changes.priority)) next.priority = changes.priority;
      if ("dueDate" in changes) next.dueDate = isValidDate(changes.dueDate) ? changes.dueDate : null;
      return next;
    });
  }

  function toggleTask(tasks, id, now = new Date()) {
    return tasks.map((t) =>
      t.id === id
        ? { ...t, completed: !t.completed, completedAt: t.completed ? null : now.toISOString() }
        : t
    );
  }

  function deleteTask(tasks, id) {
    return tasks.filter((t) => t.id !== id);
  }

  function clearCompleted(tasks) {
    return tasks.filter((t) => !t.completed);
  }

  function todayKey(now = new Date()) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function isOverdue(task, now = new Date()) {
    return !task.completed && !!task.dueDate && task.dueDate < todayKey(now);
  }

  function filterTasks(tasks, { status = "all", query = "" } = {}, now = new Date()) {
    const q = normalizeTitle(query).toLowerCase();
    return tasks.filter((t) => {
      if (status === "active" && t.completed) return false;
      if (status === "completed" && !t.completed) return false;
      if (status === "overdue" && !isOverdue(t, now)) return false;
      if (q && !t.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function sortTasks(tasks, sortBy = "created") {
    const list = [...tasks];
    const byCreated = (a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0);
    const comparators = {
      created: byCreated,
      due: (a, b) => {
        if (a.dueDate === b.dueDate) return byCreated(a, b);
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate < b.dueDate ? -1 : 1;
      },
      priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byCreated(a, b),
    };
    list.sort(comparators[sortBy] || byCreated);
    // Completed tasks always sink to the bottom; Array#sort is stable.
    return list.sort((a, b) => Number(a.completed) - Number(b.completed));
  }

  function stats(tasks, now = new Date()) {
    const completed = tasks.filter((t) => t.completed).length;
    return {
      total: tasks.length,
      completed,
      active: tasks.length - completed,
      overdue: tasks.filter((t) => isOverdue(t, now)).length,
    };
  }

  /** Accepts untrusted JSON (e.g., from localStorage) and returns only well-formed tasks. */
  function sanitize(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((t) => t && typeof t === "object" && typeof t.id === "string" && normalizeTitle(t.title))
      .map((t) => ({
        id: t.id,
        title: normalizeTitle(t.title).slice(0, 200),
        priority: PRIORITIES.includes(t.priority) ? t.priority : "medium",
        dueDate: isValidDate(t.dueDate) ? t.dueDate : null,
        completed: Boolean(t.completed),
        createdAt: typeof t.createdAt === "string" ? t.createdAt : new Date(0).toISOString(),
        completedAt: typeof t.completedAt === "string" ? t.completedAt : null,
      }));
  }

  return {
    PRIORITIES,
    createTask,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    clearCompleted,
    filterTasks,
    sortTasks,
    isOverdue,
    stats,
    sanitize,
    todayKey,
  };
});
