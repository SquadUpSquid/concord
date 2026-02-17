# Contributing to Concord

Thank you for your interest in contributing to Concord! This document explains
our contribution process, coding standards, and the Contributor License
Agreement (CLA) you need to accept before we can merge your work.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Contributor License Agreement (CLA)](#contributor-license-agreement-cla)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).
By participating, you are expected to uphold this code. Please report
unacceptable behavior to **concord@squadupsquid.com**.

## Contributor License Agreement (CLA)

Before we can accept your first pull request, you must sign our Contributor
License Agreement. This is a one-time process that protects both you and the
project.

**How it works:**

1. Open a pull request.
2. If you haven't signed the CLA yet, a bot will post a comment on your PR with
   instructions.
3. Reply to that comment with the exact text:

   > I have read the CLA Document and I hereby sign the CLA

4. The bot will record your signature and update the PR check. You only need to
   do this once — it applies to all future contributions.

**What the CLA covers:**

- You confirm that your contribution is your original work (or you have the
  right to submit it).
- You grant the project a perpetual, worldwide, non-exclusive, royalty-free
  license to use, reproduce, modify, and distribute your contribution under the
  project's license (AGPL-3.0).
- You retain copyright to your contribution — the CLA is a license grant, not a
  copyright transfer.

The full CLA text is available at [CLA.md](CLA.md).

## Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/concord.git
   cd concord
   ```
3. **Add the upstream remote:**
   ```bash
   git remote add upstream https://github.com/SquadUpSquid/concord.git
   ```

## Development Setup

### Prerequisites

- **Node.js** 20+ (see `.nvmrc`)
- **Rust** (latest stable) — required for the Tauri backend
- **pnpm** or **npm**

### Install & Run

```bash
# Install dependencies
npm install

# Start the Vite dev server (web only)
npm run dev

# Start the Tauri desktop app (requires Rust)
npm run tauri dev

# Run tests
npm test

# Type check
npx tsc --noEmit
```

## Making Changes

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
   Use prefixes: `feature/`, `bugfix/`, `refactor/`, `docs/`.

2. **Write your code.** Follow the [coding standards](#coding-standards) below.

3. **Test your changes:**
   ```bash
   npm test              # Unit tests
   npx tsc --noEmit      # Type checking
   ```

4. **Commit with clear messages:**
   ```
   Add emoji autocomplete to message input

   Listens for ':' prefix while typing and shows a filterable popup
   of matching Unicode emoji. Selection inserts the emoji and closes
   the picker.
   ```
   - Use imperative mood ("Add", "Fix", "Update", not "Added", "Fixed").
   - First line: concise summary (72 chars max).
   - Body (optional): explain *why*, not *what*.

## Pull Request Process

1. **Push your branch** to your fork:
   ```bash
   git push -u origin feature/your-feature-name
   ```

2. **Open a Pull Request** against `main` on the upstream repository.

3. **Fill out the PR template** — describe what changed, why, and how to test.

4. **Sign the CLA** if prompted (first-time contributors only).

5. **Address review feedback.** Push additional commits; do not force-push unless
   asked.

6. Once approved, a maintainer will merge your PR.

## Coding Standards

### General

- **TypeScript** for all source files — no `any` unless truly unavoidable (add a
  comment explaining why).
- **Functional React components** with hooks. No class components.
- **Zustand** for state management — one store per domain (rooms, messages,
  calls, etc.).
- Keep files under ~300 lines. Extract components and utilities as needed.

### Style

- Follow the existing code style (Tailwind CSS classes, naming conventions).
- Use `@/` path aliases for imports (e.g., `@/stores/roomStore`).
- Prefer named exports over default exports.

### Testing

- Write tests for stores and utility functions.
- Use **Vitest** as the test runner with **jsdom** environment.
- Test files live next to the code they test: `foo.ts` → `foo.test.ts`.

### Commits

- One logical change per commit.
- Run `npx tsc --noEmit` and `npm test` before committing.
- Do not include generated files, secrets, or environment-specific config.

## Reporting Issues

- Use [GitHub Issues](https://github.com/SquadUpSquid/concord/issues) to report
  bugs or request features.
- Include reproduction steps, expected vs. actual behavior, and your environment
  (OS, browser, Matrix homeserver).
- Check existing issues before opening a duplicate.

---

Thank you for helping make Concord better!
