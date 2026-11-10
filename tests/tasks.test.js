const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../src/tasks.js");

const NOW = new Date(2026, 10, 10, 12, 0, 0); // November 10, 2026, local time

test("createTask trims title and applies defaults", () => {
  const t = T.createTask({ title: "  Draft   report " }, NOW);
  assert.equal(t.title, "Draft report");
  assert.equal(t.priority, "medium");
  assert.equal(t.dueDate, null);
  assert.equal(t.completed, false);
});

test("createTask rejects empty and overlong titles", () => {
  assert.throws(() => T.createTask({ title: "   " }), /required/);
  assert.throws(() => T.createTask({ title: "x".repeat(201) }), /200/);
});

test("createTask drops invalid priority and date", () => {
  const t = T.createTask({ title: "A", priority: "urgent", dueDate: "tomorrow" });
  assert.equal(t.priority, "medium");
  assert.equal(t.dueDate, null);
});

test("add, toggle, update, delete, clearCompleted", () => {
  let tasks = T.addTask([], { title: "A" }, NOW);
  tasks = T.addTask(tasks, { title: "B", priority: "high" }, NOW);
  assert.equal(tasks.length, 2);
  const [b, a] = tasks;

  tasks = T.toggleTask(tasks, a.id, NOW);
  assert.equal(tasks.find((t) => t.id === a.id).completed, true);
  assert.ok(tasks.find((t) => t.id === a.id).completedAt);

  tasks = T.updateTask(tasks, b.id, { title: "B2", dueDate: "2026-12-01" });
  assert.equal(tasks.find((t) => t.id === b.id).title, "B2");
  assert.throws(() => T.updateTask(tasks, b.id, { title: "" }), /required/);

  assert.equal(T.clearCompleted(tasks).length, 1);
  assert.equal(T.deleteTask(tasks, b.id).length, 1);
});

test("isOverdue and filterTasks", () => {
  const tasks = [
    { ...T.createTask({ title: "Past", dueDate: "2026-11-01" }, NOW) },
    { ...T.createTask({ title: "Today", dueDate: "2026-11-10" }, NOW) },
    { ...T.createTask({ title: "Done past", dueDate: "2026-11-01" }, NOW), completed: true },
  ];
  assert.equal(T.isOverdue(tasks[0], NOW), true);
  assert.equal(T.isOverdue(tasks[1], NOW), false);
  assert.equal(T.isOverdue(tasks[2], NOW), false);
  assert.deepEqual(T.filterTasks(tasks, { status: "overdue" }, NOW).map((t) => t.title), ["Past"]);
  assert.equal(T.filterTasks(tasks, { status: "active" }, NOW).length, 2);
  assert.equal(T.filterTasks(tasks, { status: "completed" }, NOW).length, 1);
  assert.deepEqual(T.filterTasks(tasks, { query: "TOD" }, NOW).map((t) => t.title), ["Today"]);
});

test("sortTasks orders by priority and due date, completed last", () => {
  const mk = (title, extra) => ({ ...T.createTask({ title, ...extra }, NOW), ...extra });
  const tasks = [
    mk("low", { priority: "low", dueDate: "2026-11-05" }),
    mk("high-done", { priority: "high", completed: true }),
    mk("high", { priority: "high", dueDate: "2026-12-01" }),
    mk("none", { priority: "medium" }),
  ];
  assert.deepEqual(T.sortTasks(tasks, "priority").map((t) => t.title), ["high", "none", "low", "high-done"]);
  assert.deepEqual(T.sortTasks(tasks, "due").map((t) => t.title), ["low", "high", "none", "high-done"]);
});

test("stats counts correctly", () => {
  let tasks = T.addTask([], { title: "A", dueDate: "2026-01-01" }, NOW);
  tasks = T.addTask(tasks, { title: "B" }, NOW);
  tasks = T.toggleTask(tasks, tasks[0].id, NOW);
  assert.deepEqual(T.stats(tasks, NOW), { total: 2, completed: 1, active: 1, overdue: 1 });
});

test("sanitize discards malformed stored data", () => {
  assert.deepEqual(T.sanitize(null), []);
  assert.deepEqual(T.sanitize("oops"), []);
  const out = T.sanitize([{ id: "1", title: "ok", priority: "bogus", dueDate: 5 }, { id: 2, title: "x" }, { id: "3", title: " " }, null]);
  assert.equal(out.length, 1);
  assert.equal(out[0].priority, "medium");
  assert.equal(out[0].dueDate, null);
});
