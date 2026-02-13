# Project Architecture

## Overview

This is a TypeScript Node.js boilerplate built on the **Hook App framework**. The architecture is designed around modularity, extensibility, and maintainability using a hooks-based system similar to WordPress, but for Node.js applications.

## Architectural Principles

### 1. Separation of Concerns

The project separates infrastructure (services) from business logic (features):

- **Services** handle infrastructure concerns (databases, caching, logging, external APIs)
- **Features** handle business logic and application-specific functionality
- **Settings** manage configuration
- **Context** manages shared state

### 2. Loose Coupling

Components communicate through hooks rather than direct dependencies:

- Features don't directly call other features
- Custom hooks enable event-driven communication
- Services provide shared resources via context
- No tight coupling between modules

### 3. High Cohesion

Each module has a single, well-defined responsibility:

- One feature per folder
- One service per folder
- Clear boundaries between modules
- Self-contained implementations

### 4. Extensibility

New functionality can be added without modifying existing code:

- Add new features by creating new feature modules
- Add new services by creating new service modules
- Register custom hooks for cross-module communication
- Override behavior using hook priorities

## Project Structure

```
ai-friendly-boilerplate/
├── src/                          # Source code
│   ├── features/                 # Business logic features
│   │   └── feature-example/
│   │       ├── index.ts          # Feature implementation
│   │       ├── index.test.ts     # Feature tests
│   │       ├── handlers.ts       # Handler functions (optional)
│   │       ├── types.ts          # Type definitions (optional)
│   │       └── constants.ts      # Constants (optional)
│   ├── services/                 # Infrastructure services
│   │   └── database/
│   │       ├── index.ts          # Service implementation
│   │       ├── index.test.ts     # Service tests
│   │       └── client.ts         # Database client (optional)
│   └── index.ts                  # Application entry point
│
├── test/                         # Test files (mirrors src/)
├── dist/                         # Build output (generated)
│
├── docs/                         # Documentation
│   └── ai/                       # AI agent documentation
│       ├── hook-app-guide.md
│       ├── coding-standards.md
│       ├── testing-guide.md
│       ├── architecture.md       # This file
│       └── common-tasks.md
│
├── .github/                      # GitHub configuration
│   └── workflows/                # CI/CD pipelines
│       └── ci.yml
│
├── .husky/                       # Git hooks
│   └── pre-commit                # Pre-commit validation
│
├── AGENTS.md                     # AI agent instructions
├── opencode.json                 # OpenCode configuration
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── tsconfig.build.json           # Build configuration
├── biome.json                    # Biome linter/formatter config
└── vitest.config.ts              # Test configuration
```

## Module Architecture

### Entry Point (src/index.ts)

The main entry point initializes the Hook App with settings, services, and features:

```typescript
import hookApp from '@hook-app';
import featureExample from './features/feature-example/index.js';

hookApp({
  settings: {
    app: {
      name: 'Simple Hook App',
      version: '1.0.0',
    },
  },
  features: [featureExample],
  trace: 'compact',
})
  .then(() => {
    console.log('App started successfully');
  })
  .catch((error) => {
    console.error('Error starting app:', error);
    process.exit(1);
  });
```

**Responsibilities:**
- Initialize Hook App with configuration
- Register all features and services
- Handle startup errors
- Configure tracing level

### Features Directory

Features contain business logic and application-specific functionality.

**Standard Feature Structure:**
```
src/features/user-auth/
├── index.ts          # Main feature export (required)
├── index.test.ts     # Feature tests
├── handlers.ts       # Action handlers (optional)
├── validators.ts     # Validation logic (optional)
├── types.ts          # Type definitions (optional)
└── constants.ts      # Constants (optional)
```

**Feature Characteristics:**
- Default export implementing RegisterContext
- Registers actions on lifecycle hooks
- Can register custom hooks for communication
- Accesses settings via getConfig
- Can store state in context
- Independent and self-contained

**Example Feature:**
```typescript
import type { RegisterContext } from '@hook-app';

const FEATURE_NAME = 'user-auth';

export default ({ registerAction, registerHook }: RegisterContext) => {
  registerAction({
    hook: '$INIT_FEATURE',
    name: FEATURE_NAME,
    handler: () => {
      console.log('[User Auth] Initialized');
    },
  });

  registerAction({
    hook: '$START_FEATURE',
    name: FEATURE_NAME,
    handler: async ({ getConfig }: RegisterContext) => {
      const secret = getConfig<string>('auth.secret');
      // Setup authentication logic
    },
  });
};
```

### Services Directory

Services handle infrastructure concerns and provide shared resources.

**Standard Service Structure:**
```
src/services/database/
├── index.ts          # Main service export (required)
├── index.test.ts     # Service tests
├── client.ts         # Database client (optional)
└── queries.ts        # Query builders (optional)
```

**Service Characteristics:**
- Default export implementing RegisterContext
- Uses $INIT_SERVICE for initialization
- Uses $START_SERVICE for starting
- Stores shared resources in context
- Provides API for features to consume

**Example Service:**
```typescript
import type { RegisterContext } from '@hook-app';

const SERVICE_NAME = 'database';

export default ({ registerAction, setContext }: RegisterContext) => {
  registerAction({
    hook: '$INIT_SERVICE',
    name: SERVICE_NAME,
    handler: async ({ getConfig, setContext }: RegisterContext) => {
      const dbUrl = getConfig<string>('database.url');
      const connection = await createConnection(dbUrl);
      setContext('database.connection', connection);
    },
  });

  registerAction({
    hook: '$START_SERVICE',
    name: SERVICE_NAME,
    handler: async ({ getContext, setContext }: RegisterContext) => {
      const connection = getContext('database.connection');
      await connection.connect();
      setContext('database.ready', true);
    },
  });
};
```

## Data Flow

### Application Lifecycle Flow

```
1. hookApp() called
   ↓
2. $START hook
   ↓
3. $SETTINGS hook (modify settings)
   ↓
4. $INIT_SERVICES (parallel)
   ↓
5. $INIT_SERVICE (serie, per service)
   ↓
6. $INIT_FEATURES (parallel)
   ↓
7. $INIT_FEATURE (serie, per feature)
   ↓
8. $START_SERVICES (parallel)
   ↓
9. $START_SERVICE (serie, per service)
   ↓
10. $START_FEATURES (parallel)
    ↓
11. $START_FEATURE (serie, per feature)
    ↓
12. $FINISH hook
    ↓
13. Application ready
```

### Settings Flow

```
Initial Settings (from hookApp call)
   ↓
$SETTINGS hook (modifications)
   ↓
Features/Services access via getConfig()
   ↓
Can modify via setConfig()
   ↓
Final Settings available in returned object
```

### Context Flow

```
Services initialize resources
   ↓
Store in context via setContext()
   ↓
Features access via getContext()
   ↓
Shared state available across modules
```

### Custom Hook Communication Flow

```
Feature A registers hook
   ↓
Feature A triggers hook via createHook.sync()
   ↓
Feature B listens to hook via registerAction()
   ↓
Feature B handler executes with hook data
   ↓
Loose coupling maintained
```

## Design Patterns

### 1. Dependency Injection

Services inject dependencies via context:

```typescript
// Service provides
setContext('database.client', dbClient);

// Feature consumes
const dbClient = getContext<DbClient>('database.client');
```

### 2. Event-Driven Architecture

Custom hooks enable event-driven communication:

```typescript
// Producer
createHook.sync('user-created', { user });

// Consumer
registerAction({
  hook: '$USER_CREATED',
  handler: ({ user }) => {
    sendWelcomeEmail(user);
  },
});
```

### 3. Strategy Pattern

Different execution modes for hooks:

```typescript
createHook.sync('hook');      // Synchronous
createHook.serie('hook');     // Sequential async
createHook.parallel('hook');  // Parallel async
createHook.waterfall('hook'); // Data pipeline
```

### 4. Plugin Pattern

Features and services act as plugins:

```typescript
hookApp({
  services: [database, cache, logger],
  features: [userAuth, dataSync, analytics],
});
```

### 5. Registry Pattern

Actions register on hooks, forming a registry:

```typescript
registerAction({
  hook: '$INIT_FEATURE',
  name: 'my-feature',
  priority: 10,
  handler: () => {},
});
```

## Module Communication

### Direct Context Access (Services → Features)

```typescript
// Service stores
setContext('cache.client', redisClient);

// Feature retrieves
const cache = getContext('cache.client');
```

### Custom Hooks (Feature → Feature)

```typescript
// Feature A
registerHook({ DATA_READY: 'data-ready' });
createHook.sync('data-ready', { data });

// Feature B
registerAction({
  hook: '$DATA_READY',
  handler: ({ data }) => {
    processData(data);
  },
});
```

### Settings (Configuration)

```typescript
// Set during initialization
setConfig('api.url', 'https://api.example.com');

// Access anywhere
const url = getConfig<string>('api.url');
```

## Scalability Considerations

### Adding New Features

1. Create new folder in `src/features/`
2. Implement feature following standard pattern
3. Export default from index.ts
4. Import and add to features array in src/index.ts
5. No changes to existing features required

### Adding New Services

1. Create new folder in `src/services/`
2. Implement service following standard pattern
3. Store shared resources in context
4. Import and add to services array in src/index.ts
5. Features can access via context

### Feature Dependencies

**Avoid direct dependencies between features:**

```typescript
// ❌ Bad - direct dependency
import { processUser } from '../other-feature/index.js';

// ✅ Good - use custom hooks
registerAction({
  hook: '$USER_PROCESSED',
  handler: ({ user }) => {
    // React to event
  },
});
```

### Service Dependencies

Services should be independent, but can have initialization order:

```typescript
// Database service initializes first (priority)
registerAction({
  hook: '$INIT_SERVICE',
  name: 'database',
  priority: 100, // Higher priority = runs first
  handler: async () => {
    // Initialize database
  },
});

// Cache service can depend on database being ready
registerAction({
  hook: '$START_SERVICE',
  name: 'cache',
  handler: async ({ getContext }: RegisterContext) => {
    const dbReady = getContext<boolean>('database.ready');
    if (!dbReady) throw new Error('Database not ready');
    // Initialize cache
  },
});
```

## Build and Deployment

### Development Build

```bash
# TypeScript compilation with tsx (development)
pnpm dev

# Runs: tsx src/index.ts
# Hot reload on file changes
```

### Production Build

```bash
# TypeScript compilation (production)
pnpm build

# Runs: tsc --project tsconfig.build.json
# Output: dist/ directory
# Creates: dist/index.js and dist/**/*.d.ts
```

### Build Output Structure

```
dist/
├── index.js              # Compiled main entry
├── index.d.ts            # Type declarations
├── features/
│   └── feature-example/
│       ├── index.js
│       └── index.d.ts
└── services/
    └── ...
```

### Running Production Build

```bash
pnpm start

# Runs: node dist/index.js
```

## Testing Architecture

### Test Organization

Tests mirror source structure:

```
src/features/user-auth/index.ts
src/features/user-auth/index.test.ts  ← Tests here

OR

test/features/user-auth/index.test.ts ← Tests here
```

### Test Types

1. **Unit Tests** - Test individual functions and modules
2. **Integration Tests** - Test feature interactions via hooks
3. **End-to-End Tests** - Test complete application flow

### Testing Hooks and Features

```typescript
import hookApp from '@hook-app';
import { vi } from 'vitest';

it('should execute feature during lifecycle', async () => {
  const mockHandler = vi.fn();
  
  const testFeature = ({ registerAction }) => {
    registerAction({
      hook: '$INIT_FEATURE',
      handler: mockHandler,
    });
  };
  
  await hookApp({ features: [testFeature] });
  
  expect(mockHandler).toHaveBeenCalled();
});
```

## Configuration Management

### Configuration Layers

1. **Default settings** - Hardcoded in hookApp() call
2. **Environment variables** - Via process.env
3. **$SETTINGS hook** - Programmatic modifications
4. **Runtime modifications** - Via setConfig()

```typescript
hookApp({
  settings: {
    app: {
      name: process.env.APP_NAME || 'Default App',
      debug: process.env.NODE_ENV === 'development',
    },
  },
  features: [
    ({ registerAction, setConfig }: RegisterContext) => {
      registerAction({
        hook: '$SETTINGS',
        handler: ({ getConfig, setConfig }: RegisterContext) => {
          // Modify settings programmatically
          if (getConfig('app.debug')) {
            setConfig('logging.level', 'debug');
          }
        },
      });
    },
  ],
});
```

## Error Handling Strategy

### Service Errors

Services should fail fast during initialization:

```typescript
registerAction({
  hook: '$INIT_SERVICE',
  name: 'database',
  handler: async () => {
    try {
      await connectToDatabase();
    } catch (error) {
      console.error('[Database] Failed to connect:', error);
      throw error; // Application should not start
    }
  },
});
```

### Feature Errors

Features should handle errors gracefully:

```typescript
registerAction({
  hook: '$START_FEATURE',
  name: 'analytics',
  handler: async () => {
    try {
      await initAnalytics();
    } catch (error) {
      console.error('[Analytics] Failed to initialize:', error);
      // Don't throw - analytics is not critical
    }
  },
});
```

### Global Error Handler

```typescript
hookApp({ features })
  .then(() => {
    console.log('App started successfully');
  })
  .catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });
```

## Performance Considerations

### Parallel Execution

Features and services initialize in parallel by default:

```typescript
// All $INIT_FEATURES hooks run in parallel
// All $START_FEATURES hooks run in parallel
```

### Lazy Loading

Load heavy dependencies only when needed:

```typescript
registerAction({
  hook: '$START_FEATURE',
  name: 'image-processor',
  handler: async () => {
    // Only import when feature starts
    const sharp = await import('sharp');
    // Use sharp...
  },
});
```

### Caching

Cache expensive computations in context:

```typescript
registerAction({
  hook: '$INIT_SERVICE',
  handler: ({ setContext }: RegisterContext) => {
    const expensiveComputation = computeOnce();
    setContext('cache.computed', expensiveComputation);
  },
});
```

## Security Considerations

### Environment Variables

Never commit secrets:

```typescript
// ✅ Good
const apiKey = process.env.API_KEY;
if (!apiKey) throw new Error('API_KEY is required');

// ❌ Bad
const apiKey = 'hardcoded-secret-key';
```

### Settings Protection

Don't expose sensitive settings:

```typescript
// Store sensitive data in context, not settings
setContext('api.key', process.env.API_KEY);

// Settings are returned from hookApp and may be logged
```

### Input Validation

Validate all external input:

```typescript
function validateUserInput(input: unknown): User {
  if (typeof input !== 'object' || input === null) {
    throw new ValidationError('Invalid input');
  }
  // Validate and return typed object
  return validatedUser;
}
```

## Summary

This architecture provides:

- **Modularity** through features and services
- **Extensibility** through hooks and actions
- **Maintainability** through clear separation of concerns
- **Testability** through isolated, independent modules
- **Scalability** through loose coupling and plugin architecture
- **Type Safety** through strict TypeScript
- **Developer Experience** through clear patterns and conventions

The Hook App framework enables building complex applications with simple, focused modules that communicate through well-defined interfaces.
