# Repository Guidelines

## Project Structure & Module Organization
- `src/routes/`: TanStack Start file-based routes (`/monitor`, `/workspace`, API handlers under `src/routes/api/`).
- `src/components/`: UI by domain (`monitor/`, `workspace/`, `navigation/`, `ani/`).
- `src/integrations/`: external/system integrations (`openclaw/`, `trpc/`, `query/`).
- `src/lib/`: shared utilities (graph layout, workspace FS helpers, demo data).
- `public/`: static assets (images, fonts, skill metadata).
- Runtime and packaging files: `Dockerfile`, `docker-compose.yml`, `bin/clawtrace`.

## Architecture Overview
- Stack: TanStack Start + Router, tRPC, TanStack Query/DB, ReactFlow, Tailwind v4, React 19.
- Monitor flow: OpenClaw gateway WebSocket -> server integration (`src/integrations/openclaw/`) -> tRPC router (`src/integrations/trpc/router.ts`) -> client collections/graph UI.
- API entrypoint: `src/routes/api/trpc.$.ts`; router setup in `src/router.tsx`.

## Build, Test, and Development Commands
- `npm run dev`: starts local dev server on `http://localhost:3000`.
- `npm run build`: creates production build with Vite/TanStack Start.
- `npm start`: runs the built server from `.output/server/index.mjs`.
- `docker-compose up -d`: run containerized app (set `CLAWDBOT_API_TOKEN` first).

## Coding Style & Naming Conventions
- Language: TypeScript + React function components.
- Style in current codebase: 2-space indentation, single quotes, semicolon-light formatting.
- Components/files: `PascalCase` for React components (example: `SessionNode.tsx`).
- Hooks/utilities: `camelCase` exports, hooks prefixed with `use` (example: `useIsMobile.ts`).
- Route files follow TanStack conventions, e.g. `src/routes/monitor/index.tsx`, `src/routes/api/trpc.$.ts`.
- Use path alias `~/` for imports from `src`.

## Testing Guidelines
- No dedicated automated test script is currently defined in `package.json`.
- Minimum pre-PR validation: run `npm run build`, then verify `/monitor` connectivity and `/workspace` file operations in `npm run dev`.
- If adding tests, colocate as `*.test.ts` / `*.test.tsx` near the feature and prefer fast unit tests for parsing/state logic.

## Commit & Pull Request Guidelines
- Follow Conventional Commit style used in history: `feat(scope): ...`, `fix(scope): ...`, `docs: ...`, `chore: ...`.
- Keep scopes aligned with feature areas (`monitor`, `workspace`, `nav`, `openclaw`).
- PRs should include:
  - clear summary of behavior changes,
  - linked issue(s) when applicable,
  - screenshots/GIFs for UI changes,
  - notes on env/config changes (tokens, gateway URL, workspace mounts).

## Security & Configuration Tips
- Never commit secrets. Use `.env` or runtime env vars (`CLAWDBOT_API_TOKEN`, `CLAWDBOT_URL`).
- Keep `.env.example` updated when introducing new required configuration.
