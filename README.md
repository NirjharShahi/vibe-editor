# 🧠 Vibecode Editor — AI-Powered Web IDE

![Vibecode Editor Thumbnail](public/vibe-code-editor-thumbnaail.svg)

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-blue?logo=typescript&logoColor=white) ![MongoDB](https://img.shields.io/badge/MongoDB-Prisma-47A248?logo=mongodb&logoColor=white) ![WebContainers](https://img.shields.io/badge/Runtime-WebContainers-orange) ![License](https://img.shields.io/badge/License-MIT-green)

**Vibecode Editor** is a browser-based IDE that runs full Node.js projects entirely client-side using **WebContainers**, edits code with a **Monaco Editor** instance wired for AI autocomplete, and includes an **AI chat assistant** powered by a locally-run LLM through **Ollama**. Projects, files, and favorites persist per-user in **MongoDB via Prisma**, behind **NextAuth (Google + GitHub OAuth)** sign-in.

This README documents not just how to run it, but **how the pieces fit together** — which is what you'll actually be asked about in a review or interview.

---

## Table of Contents

1. [Features](#-features)
2. [Tech Stack](#-tech-stack)
3. [Architecture Overview](#-architecture-overview)
4. [Project Structure](#-project-structure)
5. [Data Model](#-data-model-prisma--mongodb)
6. [Getting Started](#-getting-started)
7. [Environment Variables](#-environment-variables)
8. [How the AI Features Work](#-how-the-ai-features-work)
9. [How the In-Browser Runtime Works](#-how-the-in-browser-runtime-works-webcontainers)
10. [API Routes](#-api-routes)
11. [Keyboard Shortcuts](#-keyboard-shortcuts)
12. [Known Limitations & Open TODOs](#-known-limitations--open-todos)
13. [Deployment Notes](#-deployment-notes)
14. [License & Acknowledgements](#-license--acknowledgements)

---

## 🚀 Features

- 🔐 **OAuth Login** — Google & GitHub sign-in via NextAuth, sessions backed by MongoDB through the Prisma adapter.
- 🧱 **Project Templates** — Scaffold a new playground from React, Next.js, Express, Hono, Vue, or Angular starters.
- 🗂️ **Custom File Explorer** — Create, rename, delete, and organize files/folders in a JSON tree that maps 1:1 onto the WebContainer filesystem.
- 🖊️ **Monaco Editor** — Full syntax highlighting, formatting, and keybindings, with AI-driven inline autocomplete.
- 💡 **AI Code Suggestions** — Context-aware completions from a local LLM, triggered on demand and accepted with `Tab`.
- ⚙️ **WebContainers Runtime** — Installs dependencies and runs the dev server for the active project _inside the browser tab_ — no server-side sandbox or container orchestration needed.
- 💻 **Embedded Terminal** — Full interactive shell via `xterm.js`, wired directly to the WebContainer process I/O.
- 🤖 **AI Chat Assistant** — A sidebar chat that can read your open file's content and answer questions, explain code, or suggest refactors.
- ⭐ **Favorites & Dashboard** — Star, search, filter, and duplicate playgrounds from a project dashboard.
- 🌗 **Dark/Light Mode** — Theme toggle via `next-themes`.

---

## 🧱 Tech Stack

| Layer              | Technology                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| Framework          | Next.js 15 (App Router, Turbopack dev server)                                                             |
| Language           | TypeScript                                                                                                |
| Styling            | TailwindCSS v4 + shadcn/ui (Radix primitives)                                                             |
| Auth               | NextAuth v5 (beta) + `@auth/prisma-adapter`                                                               |
| Database           | MongoDB, accessed through Prisma ORM                                                                      |
| Editor             | Monaco Editor (`@monaco-editor/react`), `monacopilot`                                                     |
| In-browser runtime | `@webcontainer/api`                                                                                       |
| Terminal           | `@xterm/xterm` + fit/search/web-links addons                                                              |
| AI backend         | Ollama (local LLM server, e.g. `codellama`)                                                               |
| State              | Zustand, React hooks (no global store for playground state — see [Architecture](#-architecture-overview)) |
| Forms/Validation   | `react-hook-form` + `zod`                                                                                 |

---

## 🏗️ Architecture Overview

The app is organized as a **feature-module monorepo-in-one-app**: instead of one flat `components/` folder, each domain (`auth`, `dashboard`, `playground`, `ai-chat`, `webcontainers`) owns its own `actions/`, `components/`, `hooks/`, and `lib/` — Next.js `app/` only contains routing and page composition, and delegates everything else to `modules/`.

```
Browser
 ├─ NextAuth session (JWT, Prisma-backed) ──► gates /dashboard and /playground/[id]
 │
 ├─ Dashboard (modules/dashboard)
 │    └─ Server Actions (modules/dashboard/actions) ──► Prisma ──► MongoDB
 │
 └─ Playground page (app/playground/[id])
      ├─ usePlayground()            → loads TemplateFile JSON (or scaffolds from /api/template/[id])
      ├─ useFileExplorer()          → in-memory file tree, mirrors DB JSON structure
      ├─ useWebContainer()          → boots a WebContainer, mounts the file tree, runs npm install/dev
      ├─ playground-editor.tsx      → Monaco instance, wired to useAISuggestion() for autocomplete
      ├─ terminal.tsx               → xterm.js, piped to the WebContainer process
      ├─ webcontainer-preview.tsx   → iframe pointed at the WebContainer's exposed dev-server URL
      └─ ai-chat-sidebarpanel.tsx   → independent chat UI, calls /api/chat (server) → Ollama (localhost:11434)
```

**Key design decision worth understanding:** the code _never_ leaves the browser to run. `useWebContainer` boots a WebContainer instance client-side, and `useFileExplorer`'s in-memory JSON tree is written into it via `instance.fs.writeFile`. The Node process, its `npm install`, and its dev server all execute inside the WebContainer sandbox in the tab — the Next.js server is only involved for persistence (saving/loading the JSON tree to Mongo) and for the two things that _do_ need a real backend: authentication and AI calls.

---

## 📁 Project Structure

```
app/
├─ (auth)/auth/sign-in/          Sign-in page (route group, no layout chrome)
├─ (root)/                       Public landing page
├─ dashboard/                    Authenticated project dashboard
├─ playground/[id]/              The actual IDE screen for one project
└─ api/
   ├─ auth/[...nextauth]/        NextAuth handler
   ├─ chat/                      AI chat backend (→ Ollama)
   ├─ code-completion/           AI inline-suggestion backend (→ Ollama)
   └─ template/[id]/             Scaffolds a new playground's file tree from a starter template on disk

modules/
├─ auth/         Server actions (currentUser), sign-in form, user menu, session hook
├─ dashboard/    Project table, add/duplicate/star actions, template picker modal
├─ playground/   File explorer, Monaco editor wrapper, AI-suggestion hook, dialogs (new/rename/delete file & folder)
└─ webcontainers/ useWebContainer hook, terminal component, live-preview iframe

lib/
├─ db.ts         Prisma client singleton
├─ template.ts   Maps a Templates enum value → a starter folder path on disk
└─ utils.ts      cn() class-merging helper (shadcn convention)

prisma/schema.prisma   Data model (see below)
auth.ts / auth.config.ts / middleware.ts / routes.ts   NextAuth wiring & route protection
```

---

## 🗄️ Data Model (Prisma / MongoDB)

```
User ──< Account            (OAuth accounts linked to a user, via Prisma Adapter)
User ──< Playground         (a user's projects)
User ──< StarMark           (favorites — join table between User and Playground)
User ──< ChatMessage        (AI chat history, keyed by user)
Playground ──< StarMark
Playground ──1 TemplateFile (one JSON blob holding the entire file/folder tree for that project)
```

The whole project's file tree — every file, folder, and its content — is stored as a **single JSON document** in `TemplateFile.content`, not as individual rows per file. `useFileExplorer` reshapes this into the `TemplateFolder`/`TemplateFile` tree types (defined in `modules/playground/lib/path-to-json.ts`), and `SaveUpdatedCode` (a server action) upserts the whole tree back on save. This keeps reads/writes to a single round trip, at the cost of the whole project being one document (fine at this scale; would need re-architecting for very large projects or concurrent multi-user editing).

`ChatMessage` exists in the schema but note: as shipped, `ai-chat-sidebarpanel.tsx` keeps chat history in **local React state only** — messages are not currently persisted to this table. See [Known Limitations](#-known-limitations--open-todos).

---

## 🛠️ Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-username/vibecode-editor.git
cd vibecode-editor
npm install
```

### 2. Set up MongoDB + Prisma

You need a MongoDB connection string (a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster works fine — Prisma's Mongo provider requires a replica set, which Atlas gives you by default).

```bash
npx prisma generate
npx prisma db push
```

### 3. Set up OAuth apps

- **Google:** create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials), authorized redirect URI `http://localhost:3000/api/auth/callback/google`.
- **GitHub:** create an OAuth App in [GitHub Developer Settings](https://github.com/settings/developers), callback URL `http://localhost:3000/api/auth/callback/github`.

### 4. Configure environment variables

Create `.env.local` in the project root (see [Environment Variables](#-environment-variables) below for the full list).

### 5. Start Ollama (for AI features)

```bash
ollama serve
ollama pull codellama
```

Both `/api/chat` and `/api/code-completion` call `http://localhost:11434` directly — Ollama must be running on the **same machine** as the Next.js server (see [How the AI Features Work](#-how-the-ai-features-work)).

### 6. Add the starter templates

`lib/template.ts` expects starter project folders to exist on disk at paths like `/vibecode-starters/react-ts`, `/vibecode-starters/nextjs-new`, etc. (relative to the project root). These aren't included in source control by default — you'll need to add minimal starter projects at those paths for the "create new playground" flow to work. Without them, `/api/template/[id]` will 404 with "Invalid template."

### 7. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`.

---

## 🔑 Environment Variables

| Variable             | Required | Purpose                                                            |
| -------------------- | :------: | ------------------------------------------------------------------ |
| `DATABASE_URL`       |    ✅    | MongoDB connection string (replica-set enabled)                    |
| `AUTH_SECRET`        |    ✅    | NextAuth session encryption secret (`npx auth secret` to generate) |
| `AUTH_GOOGLE_ID`     |    ✅    | Google OAuth client ID                                             |
| `AUTH_GOOGLE_SECRET` |    ✅    | Google OAuth client secret                                         |
| `AUTH_GITHUB_ID`     |    ✅    | GitHub OAuth App client ID                                         |
| `AUTH_GITHUB_SECRET` |    ✅    | GitHub OAuth App client secret                                     |
| `NEXTAUTH_URL`       | ✅ (dev) | Base URL of the app, e.g. `http://localhost:3000`                  |

Ollama has no API key — it's reached over plain HTTP at a hardcoded `http://localhost:11434`, so there's nothing to configure there today (see limitations below for why that's a problem outside local dev).

---

## 🤖 How the AI Features Work

There are **two separate AI integrations**, both currently hardcoded to call a local Ollama instance:

**1. AI Chat (`modules/ai-chat/components/ai-chat-sidebarpanel.tsx` → `app/api/chat/route.ts`)**
The sidebar sends the user's message plus conversation history to `/api/chat`. The route builds a single prompt string (system prompt + rolled-up history) and POSTs it to Ollama's `/api/generate` endpoint with `stream: false`, then returns the full response back to the client in one shot.

**2. Inline Code Suggestions (`modules/playground/hooks/useAISuggestion.tsx` → `app/api/code-completion/route.ts`)**
As you type in Monaco, this hook (via `monacopilot`) sends the surrounding code context — text before/after the cursor, detected language/framework, whether you're inside a function or class — to `/api/code-completion`. The route builds a structured prompt from that context and asks Ollama for a completion, strips any Markdown code-fence wrapping from the response, and returns raw code to insert.

**Both routes call the same local Ollama server and the same hardcoded model tag.** This means:

- AI features **only work when Ollama is running on the same machine as the Next.js server** — this is fine for local development, but will silently fail if the app is ever deployed to a remote host (Vercel, etc.), since `localhost:11434` on that host is not your machine.
- The model is not currently configurable from the deployed environment via env vars — it's a literal string in each route file.

---

## 🌐 How the In-Browser Runtime Works (WebContainers)

`useWebContainer` boots a [WebContainer](https://webcontainers.io/) instance directly in the browser tab — this is a WASM-based Node.js runtime, not a server-side container. Once booted:

1. The file tree from `useFileExplorer` (backed by the `TemplateFolder`/`TemplateFile` types) is written into the WebContainer's virtual filesystem via `instance.fs.writeFile` / `mkdir`.
2. `npm install` and the dev server run _inside_ that sandbox.
3. `terminal.tsx` attaches `xterm.js` directly to the WebContainer process's stdin/stdout, giving a real interactive shell.
4. `webcontainer-preview.tsx` listens for the `server-ready` event WebContainers emits once a dev server binds a port, and points an iframe at the URL it provides.

This is why the app can run arbitrary React/Vue/Express/etc. projects without any server-side sandboxing, Docker-in-Docker, or per-user compute allocation — the trade-off is that it only works in browsers with the necessary isolation headers (WebContainers requires `Cross-Origin-Embedder-Policy` / `Cross-Origin-Opener-Policy` to be set), and is bounded by what Node APIs the WebContainer WASM runtime supports.

---

## 🔌 API Routes

| Route                     | Method   | Purpose                                                                       |
| ------------------------- | -------- | ----------------------------------------------------------------------------- |
| `/api/auth/[...nextauth]` | GET/POST | NextAuth sign-in/callback/session handling                                    |
| `/api/chat`               | POST     | AI chat — forwards message + history to Ollama, returns full response         |
| `/api/code-completion`    | POST     | AI inline suggestions — analyzes cursor context, returns a code snippet       |
| `/api/template/[id]`      | GET      | Scaffolds a playground's file tree from the starter template on disk, as JSON |

Everything else (loading/saving a playground's code, creating/duplicating/starring projects) goes through **Next.js Server Actions** in `modules/*/actions/index.ts` rather than REST routes.

---

## 🎯 Keyboard Shortcuts

- `Ctrl + Space` / double `Enter` — Trigger AI code suggestion
- `Tab` — Accept the current AI suggestion

---

## ⚠️ Known Limitations & Open TODOs

Worth knowing before a demo or code review — these are the places a close look will find rough edges:

- **Duplicate project doesn't duplicate code.** `duplicateProjectById` (in `modules/dashboard/actions/index.ts`) copies the playground's title/description/template but has a `// todo: add template files` — the new playground's `TemplateFile` is never created, so the duplicate opens as an empty scaffold, not a copy.
- **AI chat history isn't persisted.** The `ChatMessage` model exists in the Prisma schema, but `ai-chat-sidebarpanel.tsx` only keeps messages in local component state — refreshing the page loses the conversation.
- **AI features are localhost-only by construction.** Both `/api/chat` and `/api/code-completion` hardcode `http://localhost:11434` — see [How the AI Features Work](#-how-the-ai-features-work). Deploying this app anywhere other than a machine that's also running Ollama will silently break both features.
- **Starter templates aren't bundled.** `lib/template.ts` references starter folders on disk that must be added separately (see [Getting Started, step 6](#6-add-the-starter-templates)) — the "new playground" flow will 404 without them.
- **Single-document storage for large projects.** Because a whole project's file tree lives in one `TemplateFile.content` JSON blob, very large projects or concurrent edits from multiple tabs aren't handled — last write wins, with no merge or conflict resolution.

---

## 🚢 Deployment Notes

If you deploy this beyond local development:

- Ollama-backed AI features need a real reachable inference endpoint — either run Ollama on the same host as your deployed app (only realistic for a VM/VPS, not serverless platforms like Vercel), or replace the two Ollama `fetch` calls with a hosted provider (OpenAI, Groq, Anthropic, etc.) behind an environment-variable-configured API key.
- `NEXTAUTH_URL` (and your OAuth app's redirect URIs) need to point at your production domain, not `localhost`.
- WebContainers requires your deployment to serve the correct cross-origin isolation headers (`COEP`/`COOP`) — check the [WebContainers deployment docs](https://webcontainers.io/guides/quickstart) if the in-browser runtime fails to boot in production.

---

## 🤝 Contributing

Contributions are welcome — this is a learning project, so questions and small improvements are just as welcome as big ones.

1. Fork the repo and create a branch: `git checkout -b feature/your-feature`
2. Make your changes and commit: `git commit -m "Add: your feature"`
3. Push and open a Pull Request against `main`

If you're picking up one of the items in [Known Limitations & Open TODOs](#-known-limitations--open-todos) above, mention it in your PR description so effort isn't duplicated.

---

## 📄 License & Acknowledgements

Licensed under the [MIT License](LICENSE).

Built on top of:

- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [WebContainers](https://webcontainers.io/)
- [Ollama](https://ollama.com/)
- [xterm.js](https://xtermjs.org/)
- [NextAuth.js](https://next-auth.js.org/)
- [Prisma](https://www.prisma.io/)
- [shadcn/ui](https://ui.shadcn.com/)
