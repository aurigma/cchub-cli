# AGENTS.md (cchub-cli)

Node.js CLI utility for interacting with Customer's Canvas Hub API.

## Commands

Install:

```bash
npm install
```

Dev (run TypeScript directly):

```bash
npm run dev -- <command> [subcommand] [options]
```

Build:

```bash
npm run build
```

Run (compiled CLI):

```bash
npm start -- <command> [subcommand] [options]
```

Notes:

- CLI entry is `src/index.ts`.
- Command definitions are in `src/commands/*.ts` (see those files for args/options).
- Output binary is `dist/cchub-cli.js` (CommonJS). `package.json/bin` maps the CLI name to this file.

## Global Rules

- Keep changes small and focused; do not refactor unrelated code.
- Do not introduce new dependencies without explicit approval.
- Respect folder responsibilities and dependency direction.
- Prefer consistency with existing code. If unclear, ask for clarification rather than inventing new patterns.

## Runtime / Build Assumptions

- TypeScript target: ES2020, module: CommonJS (`type: commonjs`).
- `experimentalDecorators` + `emitDecoratorMetadata` are enabled for tsyringe.
- `reflect-metadata` must be imported once during startup (typically in `src/index.ts` or a dedicated bootstrap module).
- `dotenv` is available; prefer loading env vars during startup (before creating clients).

## Architecture

### Folder Layout

- `src/index.ts`
  - Application entry point (like `main` in C).
  - Contains only app bootstrap and top-level command registration.
  - Do NOT add business logic here.

- `src/commands/`
  - One file per top-level command (e.g., `pipelines.ts`).
  - `src/commands/shared/` contains reusable Commander-specific option parsers and helpers. These files do not register commands and do not expose `addCli()`.
  - Shared command helpers may depend on Commander, but must not depend on services or views.
  - Commands deeper than 2 levels must be split into subfolders by top-level command:
    - Example: `assets fonts list` -> `src/commands/assets/fonts.ts`
    - Example: `projects create render-hires` -> `src/commands/projects/create.ts`
  - Top-level command files (e.g., `assets.ts`, `projects.ts`) should act as aggregators for nested command modules.
  - Commands with depth 1 or 2 should stay in the top-level command file.
  - Each command exposes `addCli(rootCommand)` that:
    - registers CLI interface (args/options/subcommands)
    - wires an action handler
  - The action handler implementation must be in a separate private function/method.
  - TypeScript annotations do not convert Commander option values at runtime. Use shared parsers for numbers and non-empty values, and use `Option.choices()` for enums.
  - Keep filesystem and business validation in handlers, use cases, or services rather than Commander option parsers.
  - Commands orchestrate: parse inputs -> call use cases or services -> render via views -> set exit code.

- `src/use-cases/`
  - Multi-step Customer's Canvas workflows that are useful as standalone, copyable examples.
  - Use cases accept typed input objects and return typed results.
  - Keep generated Customer's Canvas API client calls visible when that improves the example.
  - Use cases MUST NOT depend on Commander, views, `console.*`, or `process.exitCode`.
  - Do not add repository interfaces or wrappers around every generated client without a concrete need.

- `src/services/`
  - Business logic and API integration lives here.
  - Services MUST NOT:
    - read from stdin
    - write to stdout/stderr (`console.*`)
  - Services may throw for unexpected failures, but prefer returning structured results/errors where it improves clarity.
  - Services may use DI (tsyringe) and the logger for diagnostics.

- `src/views/`
  - Console output rendering lives here (formatting, tables, JSON output, etc.).
  - Views MAY use `console.log` / `console.error` for user-facing output.
  - Views should be deterministic and not perform business logic.

- `src/utils/`
  - Shared helpers that do not belong to commands/services/views.

### Dependency Direction (strict)

- `commands` -> may depend on `use-cases`, `services`, `views`, `utils`.
- `use-cases` -> may depend on `services`, generated API clients, `types`, and `utils`.
- `views` -> may depend on `utils`.
- `services` -> may depend on `utils` (and other services if needed).
- `use-cases` must not import from `commands` or `views`.
- `services` must not import from `commands` or `views`.
- `utils` must not import from `commands/use-cases/services/views` (keep it generic).

## Dependency Injection (tsyringe)

- DI container setup lives in `src/di/container.ts`.
- Register dependencies only via `registerDependencies()`.
- Keep registration organized:
  - views in `registerViews()`
  - commands in `registerCommands()`
  - use cases and services in `registerServices()`
- Prefer constructor injection in services/views/commands.
- Do not instantiate services/views manually in command handlers unless explicitly requested.

## Logging vs Output

- Use `winston` logger for diagnostics and operational messages (debug/info/warn/error).
- Use `console.log` for user-facing command output (result data), typically in `views/`.
- Do not use the logger to print result data that is intended for the user to consume.
- Use `logger.error(...)` for errors (see Error Handling section).

## Error Handling & Exit Codes

### Principle

- Commands MUST catch errors at the command action boundary.
- On failure:
  - log the error via `winston` at **error** level (`logger.error(...)`)
  - print a short user-facing message if appropriate (prefer via view or `console.error`)
  - set an appropriate `process.exitCode` (do not call `process.exit()` unless explicitly required)

### Recommended Exit Codes

- 0  : success
- 1  : unexpected/unhandled error
- 2  : invalid usage / bad arguments (commander validation or manual validation)
- 3  : authentication/authorization error (e.g., missing/invalid token)
- 4  : network error / cannot reach API
- 5  : API returned a non-success HTTP status (4xx/5xx) that is not auth-related

Use the closest match. Keep this mapping stable across commands.

### Error Types (optional but recommended)

Prefer using small typed errors in `src/utils/errors.ts` (or similar) to map to exit codes consistently:

- `CliUsageError`
- `CliAuthError`
- `CliNetworkError`
- `CliApiError` (include status/code if available)

Commands should translate thrown errors to an exit code consistently.

## Command Implementation Guidelines

When adding a new command:

1) Create `src/commands/<name>.ts`
    - implement `addCli(rootCommand)` to register CLI interface
    - keep the action handler private (no heavy logic in `addCli`)
    - action handler must:
        - validate inputs
        - call services
        - call views to render output
        - handle errors + set exit codes (see above)

2) Implement multi-step workflows in `src/use-cases/<domain>/<scenario>.ts`
    - use a typed input object and structured result
    - keep API calls visible and avoid console I/O
    - use `src/services/<domain>.ts` for shared integration infrastructure

3) Implement output in `src/views/<domain>.ts`
    - format results for console (e.g., `cli-table3`, `chalk`)
    - keep formatting separate from data retrieval
    - Prefer `src/utils/dto-as-table.ts` to format arrays of items, see `src/views/pipeline.ts` as an example.

4) Register command + view + use case in `src/di/container.ts`

## Environment / Configuration

- Prefer loading environment variables during startup (before creating API clients).
- If adding new env vars, document them in README and keep names consistent.
- Keep config parsing/validation in one place (e.g., `src/utils/config.ts`) and inject config into services.

## Testing

- There are currently no tests.
- Do not introduce a test framework unless explicitly requested.
- Prefer writing services and utilities in a testable way (pure functions, typed inputs/outputs).
- If tests are introduced later, prioritize unit testing `services/` and `utils/`.
