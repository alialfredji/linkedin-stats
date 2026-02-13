# AI-Friendly Boilerplate Project

## Project Overview

This is a **TypeScript Node.js boilerplate** built with the **Hook App framework** (@hook-app). The project demonstrates modern development practices with a modular, extensible architecture using WordPress-style hooks for building scalable applications.

**Key Characteristics:**
- TypeScript 5.9+ with strict mode enabled
- ES modules (type: "module")
- Hook App framework for modular architecture
- Modern tooling: Biome, Vitest, Husky
- Zero runtime dependencies except Hook App

## Technology Stack

### Core Framework
- **@hook-app** (v1.0.4) - Dynamic framework with hooks system for building modular Node.js applications
  - Provides lifecycle hooks, services, and features architecture
  - Enables traceable, debuggable, and extensible applications
  - WordPress-style hooks pattern for Node.js

### Development Tools
- **TypeScript** (v5.9+) - Strict mode enabled
- **Node.js** - ES modules with modern JavaScript features
- **pnpm** (v10.28.1) - Package manager (REQUIRED - never use npm or yarn)
- **tsx** - TypeScript execution and development
- **Biome** (v2.3.12) - Fast linter and formatter (replaces ESLint + Prettier)
- **Vitest** (v4.0+) - Fast unit test framework with coverage support
- **Husky** (v9.1+) - Git hooks for pre-commit validation
- **lint-staged** - Run linters on staged files
- **secretlint** - Prevent committing secrets

### Build & Quality Tools
- TypeScript compiler for production builds
- Biome for code formatting and linting
- Pre-commit hooks: type checking, linting, testing, secret scanning

## Hook App Framework Guide

### Core Concepts

Hook App is a dynamic framework that uses a **hooks-based architecture** similar to WordPress, but for Node.js applications.

**Key Elements:**
1. **Hooks** - Named extension points where actions can attach (e.g., `$INIT_FEATURE`, `$START`)
2. **Actions** - Functions that execute when a hook is triggered
3. **Services** - Core integrations that set up shared functionality (databases, logging, etc.)
4. **Features** - Application-specific business logic built on top of services
5. **Settings** - Configuration accessible throughout the app
6. **Context** - Custom shared state across the application

### Lifecycle Hooks Reference

Hook App executes these hooks in this specific order during boot:

| Hook | Execution Mode | Purpose |
|------|----------------|---------|
| `$START` | serie | App initialization begins |
| `$SETTINGS` | serie | Configure and modify settings |
| `$INIT_SERVICES` | parallel | Initialize all services simultaneously |
| `$INIT_SERVICE` | serie | Initialize each service sequentially |
| `$INIT_FEATURES` | parallel | Initialize all features simultaneously |
| `$INIT_FEATURE` | serie | Initialize each feature sequentially |
| `$START_SERVICES` | parallel | Start all services simultaneously |
| `$START_SERVICE` | serie | Start each service sequentially |
| `$START_FEATURES` | parallel | Start all features simultaneously |
| `$START_FEATURE` | serie | Start each feature sequentially |
| `$FINISH` | serie | App fully started and ready |

### Code Patterns

#### Feature Structure (Standard Pattern)

```typescript
import type { RegisterContext } from '@hook-app';

const FEATURE_NAME = 'my-feature';

const hooks = {
  MY_CUSTOM_HOOK: 'my-custom-hook',
};

export default ({ registerAction, registerHook, getConfig, setConfig, createHook }: RegisterContext) => {
  // Register custom hooks that other features can listen to
  registerHook(hooks);

  // Initialize feature (runs during INIT_FEATURE phase)
  registerAction({
    hook: '$INIT_FEATURE',
    name: FEATURE_NAME,
    handler: () => {
      console.log('[My Feature] Initializing...');
    },
  });

  // Start feature (runs during START_FEATURE phase)
  registerAction({
    hook: '$START_FEATURE',
    name: FEATURE_NAME,
    handler: ({ getConfig, createHook }: RegisterContext) => {
      const appName = getConfig<string>('app.name', 'Default App');
      console.log(`[My Feature] Starting in ${appName}`);
      
      // Trigger custom hook
      createHook.sync(hooks.MY_CUSTOM_HOOK, { data: 'example' });
    },
  });

  // Listen to custom hooks from other features
  registerAction({
    hook: '$MY_CUSTOM_HOOK',
    name: FEATURE_NAME,
    handler: ({ data }: { data: string }) => {
      console.log('[My Feature] Received custom hook:', data);
    },
  });
};
```

#### Service Structure (Standard Pattern)

Services follow the same structure but focus on infrastructure concerns:

```typescript
import type { RegisterContext } from '@hook-app';

const SERVICE_NAME = 'my-service';

export default ({ registerAction, setContext }: RegisterContext) => {
  registerAction({
    hook: '$INIT_SERVICE',
    name: SERVICE_NAME,
    handler: async ({ setContext }: RegisterContext) => {
      // Initialize service (e.g., database connection)
      const connection = await connectToDatabase();
      
      // Store in context for other features to use
      setContext('database.connection', connection);
    },
  });

  registerAction({
    hook: '$START_SERVICE',
    name: SERVICE_NAME,
    handler: () => {
      console.log('[Service] Started and ready');
    },
  });
};
```

#### Hook Execution Modes

Hook App supports different execution modes for different use cases:

```typescript
// Synchronous execution (blocks until all handlers complete)
const results = createHook.sync('hook-name', args);

// Async sequential (one at a time, waits for each)
const results = await createHook.serie('hook-name', args);

// Async parallel (all at once, wait for all)
const results = await createHook.parallel('hook-name', args);

// Waterfall (pass result through handlers)
const { value, results } = createHook.waterfall('hook-name', initialValue);
// Example: initialValue=5 → handler1 adds 1 → handler2 multiplies by 2 → result=12
```

#### Settings and Configuration

Access and modify settings using dot-notation paths:

```typescript
// Get setting with default value
const timeout = getConfig<number>('api.timeout', 5000);

// Set/modify setting
setConfig('api.timeout', 10000);

// Get nested settings
const dbConfig = getConfig('database');
```

#### Context Management

Share state across features using context:

```typescript
// Store in context
setContext('cache.client', redisClient);

// Retrieve from context
const client = getContext<RedisClient>('cache.client');
```

### Hook App Best Practices

**DO:**
- Use descriptive feature/service names
- Register custom hooks for cross-feature communication
- Use appropriate hook execution modes (sync/serie/parallel/waterfall)
- Store shared resources in context
- Use dot-notation for nested settings
- Add proper TypeScript types to handlers
- Use lifecycle hooks in the correct order

**DON'T:**
- Don't use `$INIT_FEATURE` for async operations (use `$START_FEATURE` instead)
- Don't mutate settings directly (use `setConfig`)
- Don't rely on feature execution order (features run in parallel)
- Don't use global state (use context instead)
- Don't skip error handling in async handlers

## Code Standards

### TypeScript Rules

**Required Settings:**
- Strict mode MUST be enabled (`"strict": true`)
- Use explicit types for function parameters and return values
- Use `type` for object shapes, `interface` for extensible contracts
- Use `unknown` instead of `any` when type is truly unknown
- Enable all strict compiler options in tsconfig.json

**Naming Conventions:**
- Files: kebab-case (`my-feature.ts`, `user-service.ts`)
- Folders: kebab-case (`feature-example`, `user-management`)
- Variables/functions: camelCase (`myVariable`, `getUserData`)
- Types/Interfaces: PascalCase (`UserData`, `ApiResponse`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRIES`, `API_ENDPOINT`)
- Feature names: kebab-case strings (`'user-auth'`, `'data-sync'`)

**Import/Export Standards:**
- Use ES modules (`import`/`export`, not `require`)
- Use `.js` extension in imports (TypeScript requirement for ES modules)
- Default export for features/services
- Named exports for utilities and types
- Group imports: external packages → internal modules → types

### Package Management

**CRITICAL: Always use pnpm**
- ✅ `pnpm install` or `pnpm add <package>`
- ❌ Never use `npm install` or `yarn add`
- ❌ Never add outdated packages - always check for latest stable version
- Use `pnpm add -D` for dev dependencies
- Run `pnpm update` to update dependencies

### Code Quality

**Biome Configuration:**
- Biome handles both linting and formatting
- Configuration: `biome.json` (project root)
- Run `pnpm lint` to check for issues
- Run `pnpm lint:fix` to auto-fix issues
- Run `pnpm format` to format code
- Pre-commit hooks automatically run Biome

**Code Organization:**
- One feature per file/folder
- Keep features independent and self-contained
- Use descriptive file names that match feature names
- Group related features in folders
- Keep business logic in features, infrastructure in services

## Project Structure

```
ai-friendly-boilerplate/
├── src/
│   ├── features/           # Application features
│   │   └── feature-example/
│   │       └── index.ts    # Feature implementation
│   ├── services/           # Infrastructure services (future)
│   └── index.ts           # Main app entry point
├── test/                   # Test files (mirrors src structure)
├── dist/                   # Build output (generated)
├── docs/
│   └── ai/                # AI agent documentation
│       ├── hook-app-guide.md
│       ├── coding-standards.md
│       ├── testing-guide.md
│       ├── architecture.md
│       └── common-tasks.md
├── .husky/                # Git hooks
├── .github/
│   ├── workflows/         # CI/CD pipelines
├── AGENTS.md             # This file (AI agent instructions)
├── .cursorrules          # Cursor IDE configuration
├── opencode.json         # OpenCode configuration
├── package.json          # Project dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── biome.json           # Biome linter/formatter config
```

### Key Files

- **src/index.ts** - Main entry point that initializes Hook App
- **src/features/** - All application features (business logic)
- **src/services/** - Infrastructure services (databases, APIs, etc.)
- **package.json** - Scripts: dev, build, test, lint, type-check
- **tsconfig.json** - TypeScript strict mode configuration
- **biome.json** - Code quality rules
- **.husky/** - Pre-commit hooks (type check, lint, test, secrets)

## Common Tasks

### Development

```bash
# Start development mode with hot reload
pnpm dev

# Run TypeScript type checking
pnpm type-check

# Run tests in watch mode
pnpm test:watch

# Run linter
pnpm lint

# Auto-fix linting issues
pnpm lint:fix

# Format code
pnpm format
```

### Building

```bash
# Build for production
pnpm build

# Run built application
pnpm start

# Run all checks (type check + test + lint)
pnpm check
```

### Testing

```bash
# Run tests once
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run tests with UI
pnpm test:ui

# Run benchmarks
pnpm test:bench
```

### Adding a New Feature

1. Create folder: `src/features/my-feature/`
2. Create file: `src/features/my-feature/index.ts`
3. Implement using Hook App pattern (see examples above)
4. Export feature from index.ts
5. Import and add to features array in `src/index.ts`
6. Create test file: `src/features/my-feature/index.test.ts`
7. Run tests: `pnpm test`

### Adding a New Service

1. Create folder: `src/services/my-service/`
2. Create file: `src/services/my-service/index.ts`
3. Implement using service pattern (use `$INIT_SERVICE` and `$START_SERVICE`)
4. Store shared resources in context using `setContext`
5. Import and add to services array in `src/index.ts`
6. Document service API for features to consume

## Git Workflow

### Pre-commit Hooks

Husky automatically runs these checks before every commit:

1. **Type checking** - Ensures no TypeScript errors
2. **Linting** - Checks code quality with Biome
3. **Testing** - Runs relevant tests for changed files
4. **Secret scanning** - Prevents committing credentials

If any check fails, the commit is blocked. Fix issues before committing.

### Commit Messages

Use conventional commit format:
- `feat: add user authentication feature`
- `fix: resolve database connection timeout`
- `docs: update Hook App usage guide`
- `test: add tests for feature-example`
- `chore: update dependencies`

## CI/CD Pipeline

GitHub Actions runs on every push:

1. Checkout code
2. Setup Node.js and pnpm
3. Install dependencies
4. Run type checking
5. Run linting
6. Run tests
7. Build project

All steps must pass for PR approval.

## External Documentation

For detailed guides, see the `docs/ai/` directory:

- **hook-app-guide.md** - Comprehensive Hook App patterns, lifecycle, and advanced usage
- **coding-standards.md** - TypeScript conventions, naming, imports, and best practices
- **testing-guide.md** - Vitest setup, test patterns, mocking, and coverage
- **architecture.md** - Project structure, module organization, and design decisions
- **common-tasks.md** - Step-by-step guides for frequent operations

## Important Reminders for AI Agents

1. **Always use pnpm** - Never use npm or yarn
2. **Hook App lifecycle matters** - Use correct hooks for initialization vs. starting
3. **TypeScript strict mode** - All code must type-check with strict mode
4. **Test your changes** - Write tests for new features
5. **Follow patterns** - Use the standard feature/service structure shown above
6. **Pre-commit hooks will validate** - Code must pass all checks to commit
7. **ES modules** - Use `.js` in import paths even for `.ts` files
8. **No outdated packages** - Always check for latest versions
9. **Biome, not ESLint/Prettier** - Use Biome commands for linting and formatting
10. **Features are parallel, services are infrastructure** - Organize code accordingly

## Questions or Issues?

- Check Hook App documentation: https://github.com/hook-app
- Review example feature: `src/features/feature-example/index.ts`
- See detailed guides in `docs/ai/` directory
