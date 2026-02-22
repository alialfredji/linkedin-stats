# AGENTS.md

TypeScript Node.js app using the Hook App framework (`hook-app`). ES modules, strict TypeScript, Biome for linting/formatting, Vitest for tests.

## Commands

```bash
pnpm dev                # Run dev mode (tsx src/index.ts)
pnpm build              # Production build (tsc --project tsconfig.build.json)
pnpm start              # Run production build (node dist/index.js)
pnpm type-check         # TypeScript type checking (tsc --noEmit)
pnpm check              # Run ALL checks: type-check + test + biome check

# Testing (Vitest)
pnpm test               # Run all tests once
pnpm test -- --run src/path/to/file.test.ts        # Run a single test file
pnpm test -- --run -t "test name"                   # Run tests matching a name
pnpm test:watch         # Watch mode
pnpm test:coverage      # With coverage (v8, 80% threshold)

# Linting & Formatting (Biome)
pnpm lint               # Check lint issues
pnpm lint:fix           # Auto-fix lint issues
pnpm format             # Format all files
pnpm format:check       # Check formatting without writing
```

**Package manager**: pnpm only. Never use npm or yarn.

**Pre-commit hooks** (Husky + lint-staged): Runs biome check, tsc --noEmit, tests, and secretlint on staged files. Commits will be blocked if any check fails.

## Code Style

### Formatting (enforced by Biome)

- 2-space indentation, LF line endings
- 100-character line width
- Single quotes, semicolons always, trailing commas (ES5)
- Arrow parentheses always: `(x) => x`
- Bracket spacing: `{ key: value }`

### TypeScript

- **Strict mode** with all strict options enabled plus: `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noFallthroughCasesInSwitch`
- **No `any`** — use `unknown` instead (biome: `noExplicitAny: error`)
- **No `@ts-ignore`** — fix the type issue (biome: `noTsIgnore: error`)
- **No `!` non-null assertions** (biome: `noNonNullAssertion: error`)
- **No `var`** — use `const` or `let` (biome: `noVar: error`, `useConst: error`)
- **No CommonJS** — ES modules only (biome: `noCommonJs: error`)
- Use `type` for object shapes, `interface` for extensible contracts
- Target: ES2022, Module: NodeNext

### Imports

- **Use `.js` extension** in all relative imports, even for `.ts` files:
  ```typescript
  import myFeature from './features/my-feature/index.js';  // correct
  import myFeature from './features/my-feature/index';     // WRONG
  ```
- **Separate type imports** (biome: `useImportType` with `separatedType`):
  ```typescript
  import hookApp from 'hook-app';
  import type { RegisterContext } from 'hook-app';
  ```
- **Use `export type`** for type-only exports (biome: `useExportType: error`)
- Order: external packages → internal modules → relative imports → type imports

### Naming Conventions

| Element              | Convention        | Example                          |
|----------------------|-------------------|----------------------------------|
| Files and folders    | kebab-case        | `user-service.ts`, `my-feature/` |
| Variables/functions  | camelCase         | `getUserData`, `isActive`        |
| Types/Interfaces     | PascalCase        | `UserData`, `ApiResponse`        |
| Constants            | UPPER_SNAKE_CASE  | `MAX_RETRIES`, `API_ENDPOINT`    |
| Feature/service name | kebab-case string | `'user-auth'`, `'data-sync'`     |

### Error Handling

- Always catch errors in async operations
- Use typed error classes when possible
- Services should fail fast (throw) — features should handle errors gracefully
- Write specific error messages, not generic ones

## Project Structure

```
src/
├── index.ts                        # Entry point — initializes Hook App
├── features/                       # Business logic (one feature per folder)
│   └── feature-example/index.ts    # Example feature
└── services/                       # Infrastructure (databases, APIs, etc.)
```

- Tests live next to source: `index.test.ts` beside `index.ts`
- Default export for features/services, named exports for utilities/types
- Extended docs in `docs/ai/`: hook-app-guide, coding-standards, testing-guide, architecture, common-tasks

## Hook App Patterns

### Feature Template

```typescript
import type { RegisterContext } from 'hook-app';

const FEATURE_NAME = 'my-feature';

const hooks = {
  MY_HOOK: 'my-custom-hook',
};

export default ({ registerAction, registerHook }: RegisterContext) => {
  registerHook(hooks);

  registerAction({
    hook: '$INIT_FEATURE',
    name: FEATURE_NAME,
    handler: () => {
      // Sync-only setup
    },
  });

  registerAction({
    hook: '$START_FEATURE',
    name: FEATURE_NAME,
    handler: async ({ getConfig, createHook }: RegisterContext) => {
      // Async operations go here, not in $INIT_FEATURE
      const appName = getConfig<string>('app.name', 'Default');
      createHook.sync(hooks.MY_HOOK, { data: 'value' });
    },
  });
};
```

### Lifecycle Order

`$START` → `$SETTINGS` → `$INIT_SERVICES` → `$INIT_SERVICE` → `$INIT_FEATURES` → `$INIT_FEATURE` → `$START_SERVICES` → `$START_SERVICE` → `$START_FEATURES` → `$START_FEATURE` → `$FINISH`

### Key Rules

- **`$INIT_FEATURE` is sync-only** — put async work in `$START_FEATURE`
- **Don't rely on feature execution order** — features run in parallel
- **Use context for shared state** — `setContext('db.conn', conn)` / `getContext<T>('db.conn')`
- **Use settings for config** — `getConfig<T>('key', defaultValue)` / `setConfig('key', value)`
- Hook execution modes: `createHook.sync()`, `createHook.serie()`, `createHook.parallel()`, `createHook.waterfall()`

### Register in Entry Point

Add new features/services to the arrays in `src/index.ts`:

```typescript
hookApp({
  settings: { /* ... */ },
  services: [myService],
  features: [featureExample, myFeature],
  trace: 'compact',
});
```

## Testing

- Framework: Vitest (v4+) with `globals: true`
- Pattern: `*.test.ts` or `*.spec.ts` next to source files
- Coverage: v8 provider, 80% threshold (statements/branches/functions/lines)
- Use `describe`/`it`/`expect` from vitest, `vi.fn()` / `vi.mock()` for mocking

## Git

- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `chore:`
- Pre-commit runs: biome check, type-check, tests, secretlint
