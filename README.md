# ISEET Task Register

A simple, dependency-free task management web app. It runs entirely in the browser and stores tasks in `localStorage`, so it needs no server, database, or build step.

## Features

- Add tasks with a title, priority (low, medium, high), and optional due date
- Edit tasks inline (press `Esc` to cancel)
- Mark tasks complete or active, delete tasks, and clear all completed tasks
- Filter by **All / Active / Completed / Overdue**, with live search
- Sort by newest, due date, or priority; completed tasks always sink to the bottom
- Overdue tasks are highlighted, and a summary shows active, completed, and overdue counts
- Data persists across reloads and stays in sync across open browser tabs
- ISEET visual identity (IBM Plex type, institutional navy palette, blue-rule cards); responsive, keyboard and screen-reader friendly

## Run

Open `index.html` directly in a browser, or serve the folder:

```bash
npm start        # serves on http://localhost:8080
```

## Deploy to Replit

The repository includes a `.replit` file configured for a Static Deployment (no server or build step).

1. In Replit, choose **Create App → Import from GitHub** and select this repository and branch.
2. Click **Run** to preview it in the workspace.
3. Click **Deploy → Static**, confirm, and Replit issues a public `*.replit.app` URL.

Each visitor's tasks are stored in their own browser; the deployment holds no shared data.

## Test

Requires Node.js 18 or later. No dependencies to install.

```bash
npm test
```

## Structure

| Path | Purpose |
|------|---------|
| `index.html` | Markup and task item template |
| `src/tasks.js` | Pure task logic (create, update, filter, sort, stats, sanitize); shared by the browser and the tests |
| `src/app.js` | UI layer: rendering, event handling, `localStorage` persistence |
| `src/styles.css` | Styles based on the ISEET Design System tokens, including mobile layout |
| `assets/iseet-logo.png` | ISEET primary logo (from the ISEET Design System) |
| `tests/tasks.test.js` | Unit tests for the task logic (`node:test`) |

## Limitations

- Data lives in a single browser profile on a single device; there is no sync, account system, or backup.
- Clearing browser site data deletes all tasks.
