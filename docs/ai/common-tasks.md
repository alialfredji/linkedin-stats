# Common Tasks

This guide provides step-by-step instructions for common development tasks in this project.

## Table of Contents

1. [Adding a New Feature](#adding-a-new-feature)
2. [Adding a New Service](#adding-a-new-service)
3. [Creating Custom Hooks](#creating-custom-hooks)
4. [Working with Settings](#working-with-settings)
5. [Working with Context](#working-with-context)
6. [Adding Dependencies](#adding-dependencies)
7. [Running Tests](#running-tests)
8. [Debugging](#debugging)
9. [Building for Production](#building-for-production)
10. [Common Issues and Solutions](#common-issues-and-solutions)

---

## Adding a New Feature

### Step 1: Create Feature Directory

```bash
mkdir -p src/features/my-feature
```

### Step 2: Create Feature File

Create `src/features/my-feature/index.ts`:

```typescript
import type { RegisterContext } from '@hook-app';

const FEATURE_NAME = 'my-feature';

const hooks = {
  // Define custom hooks if needed
  MY_HOOK: 'my-custom-hook',
};

export default ({ registerAction, registerHook, getConfig, createHook }: RegisterContext) => {
  // Register custom hooks
  registerHook(hooks);

  // Initialize feature (sync only)
  registerAction({
    hook: '$INIT_FEATURE',
    name: FEATURE_NAME,
    handler: () => {
      console.log('[My Feature] Initializing...');
      // Quick, synchronous setup only
    },
  });

  // Start feature (async allowed)
  registerAction({
    hook: '$START_FEATURE',
    name: FEATURE_NAME,
    handler: async ({ getConfig, createHook }: RegisterContext) => {
      console.log('[My Feature] Starting...');
      
      // Get configuration
      const config = getConfig('myFeature.config');
      
      // Perform async operations
      await setupFeature(config);
      
      // Trigger custom hook if needed
      createHook.sync(hooks.MY_HOOK, { status: 'ready' });
    },
  });
};
```

### Step 3: Create Test File

Create `src/features/my-feature/index.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import hookApp from '@hook-app';
import myFeature from './index.js';

describe('MyFeature', () => {
  it('should initialize correctly', async () => {
    const mockHandler = vi.fn();
    
    const testFeature = ({ registerAction }) => {
      registerAction({
        hook: '$INIT_FEATURE',
        name: 'test',
        handler: mockHandler,
      });
    };
    
    await hookApp({ features: [testFeature] });
    
    expect(mockHandler).toHaveBeenCalled();
  });
});
```

### Step 4: Register Feature

In `src/index.ts`:

```typescript
import hookApp from '@hook-app';
import featureExample from './features/feature-example/index.js';
import myFeature from './features/my-feature/index.js'; // Add this

hookApp({
  settings: {
    app: {
      name: 'Simple Hook App',
      version: '1.0.0',
    },
    myFeature: { // Add feature configuration
      config: 'value',
    },
  },
  features: [
    featureExample,
    myFeature, // Add this
  ],
  trace: 'compact',
});
```

### Step 5: Run Tests

```bash
pnpm test my-feature
```

### Step 6: Verify

```bash
pnpm dev
```

Look for your feature's log messages in the output.

---

## Adding a New Service

### Step 1: Create Service Directory

```bash
mkdir -p src/services/my-service
```

### Step 2: Create Service File

Create `src/services/my-service/index.ts`:

```typescript
import type { RegisterContext } from '@hook-app';

const SERVICE_NAME = 'my-service';

export default ({ registerAction, setContext, getContext }: RegisterContext) => {
  // Initialize service
  registerAction({
    hook: '$INIT_SERVICE',
    name: SERVICE_NAME,
    handler: async ({ getConfig, setContext }: RegisterContext) => {
      console.log('[My Service] Initializing...');
      
      // Get configuration
      const config = getConfig('myService');
      
      // Create resources (connection, client, etc.)
      const resource = await createResource(config);
      
      // Store in context for features to use
      setContext('myService.resource', resource);
      setContext('myService.ready', false);
    },
  });

  // Start service
  registerAction({
    hook: '$START_SERVICE',
    name: SERVICE_NAME,
    handler: async ({ getContext, setContext }: RegisterContext) => {
      console.log('[My Service] Starting...');
      
      const resource = getContext('myService.resource');
      
      // Activate the resource
      await resource.start();
      
      // Mark as ready
      setContext('myService.ready', true);
      console.log('[My Service] Ready');
    },
  });
};

// Helper function
async function createResource(config: any) {
  // Implementation
  return {
    start: async () => {},
    stop: async () => {},
  };
}
```

### Step 3: Create Test File

Create `src/services/my-service/index.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import hookApp from '@hook-app';
import myService from './index.js';

describe('MyService', () => {
  it('should initialize and start correctly', async () => {
    let ready = false;
    
    const checkService = ({ registerAction, getContext }) => {
      registerAction({
        hook: '$START_FEATURE',
        handler: () => {
          ready = getContext<boolean>('myService.ready', false);
        },
      });
    };
    
    await hookApp({
      services: [myService],
      features: [checkService],
    });
    
    expect(ready).toBe(true);
  });
});
```

### Step 4: Register Service

In `src/index.ts`:

```typescript
import hookApp from '@hook-app';
import myService from './services/my-service/index.js'; // Add this
import featureExample from './features/feature-example/index.js';

hookApp({
  settings: {
    app: {
      name: 'Simple Hook App',
      version: '1.0.0',
    },
    myService: { // Add service configuration
      host: 'localhost',
      port: 5432,
    },
  },
  services: [myService], // Add this
  features: [featureExample],
  trace: 'compact',
});
```

### Step 5: Use Service in Features

Features can access the service via context:

```typescript
registerAction({
  hook: '$START_FEATURE',
  name: 'my-feature',
  handler: async ({ getContext }: RegisterContext) => {
    const resource = getContext('myService.resource');
    const isReady = getContext<boolean>('myService.ready');
    
    if (!isReady) {
      throw new Error('Service not ready');
    }
    
    // Use the resource
    await resource.doSomething();
  },
});
```

---

## Creating Custom Hooks

### Step 1: Define Hook Names

In your feature:

```typescript
const hooks = {
  USER_CREATED: 'user-created',
  USER_UPDATED: 'user-updated',
  USER_DELETED: 'user-deleted',
};
```

### Step 2: Register Hooks

```typescript
export default ({ registerHook }: RegisterContext) => {
  registerHook(hooks);
  
  // Rest of feature...
};
```

### Step 3: Trigger Hooks

```typescript
registerAction({
  hook: '$START_FEATURE',
  name: 'user-manager',
  handler: ({ createHook }: RegisterContext) => {
    // When user is created
    const user = createUser();
    createHook.sync(hooks.USER_CREATED, { user });
  },
});
```

### Step 4: Listen to Hooks

Other features can listen:

```typescript
export default ({ registerAction }: RegisterContext) => {
  registerAction({
    hook: '$USER_CREATED',
    name: 'email-service',
    handler: ({ user }: { user: User }) => {
      sendWelcomeEmail(user);
    },
  });
};
```

---

## Working with Settings

### Reading Settings

```typescript
registerAction({
  hook: '$START_FEATURE',
  handler: ({ getConfig }: RegisterContext) => {
    // Get with default value
    const timeout = getConfig<number>('api.timeout', 5000);
    
    // Get nested setting
    const dbHost = getConfig<string>('database.host');
    
    // Get entire object
    const apiConfig = getConfig<ApiConfig>('api');
  },
});
```

### Modifying Settings

```typescript
registerAction({
  hook: '$SETTINGS',
  handler: ({ getConfig, setConfig }: RegisterContext) => {
    // Check environment
    const isDev = process.env.NODE_ENV === 'development';
    
    // Set based on environment
    if (isDev) {
      setConfig('logging.level', 'debug');
      setConfig('api.timeout', 30000);
    }
    
    // Compute and set
    const existingTimeout = getConfig<number>('api.timeout', 5000);
    setConfig('api.retryTimeout', existingTimeout * 2);
  },
});
```

### Settings from Environment Variables

In `src/index.ts`:

```typescript
hookApp({
  settings: {
    app: {
      name: process.env.APP_NAME || 'Default App',
      env: process.env.NODE_ENV || 'development',
    },
    database: {
      url: process.env.DATABASE_URL,
      pool: {
        min: Number(process.env.DB_POOL_MIN) || 2,
        max: Number(process.env.DB_POOL_MAX) || 10,
      },
    },
  },
});
```

---

## Working with Context

### Storing in Context

```typescript
registerAction({
  hook: '$INIT_SERVICE',
  handler: ({ setContext }: RegisterContext) => {
    // Store connection
    setContext('database.connection', dbConnection);
    
    // Store configuration
    setContext('database.config', {
      host: 'localhost',
      port: 5432,
    });
    
    // Store state
    setContext('database.ready', false);
  },
});
```

### Retrieving from Context

```typescript
registerAction({
  hook: '$START_FEATURE',
  handler: ({ getContext }: RegisterContext) => {
    // Get with type
    const connection = getContext<DatabaseConnection>('database.connection');
    
    // Get with default
    const isReady = getContext<boolean>('database.ready', false);
    
    // Check if exists
    if (!connection) {
      throw new Error('Database not initialized');
    }
    
    // Use the resource
    await connection.query('SELECT 1');
  },
});
```

### Context Namespacing

Use descriptive, namespaced paths:

```typescript
// ✅ Good - clear hierarchy
setContext('services.database.connection', conn);
setContext('services.cache.client', client);
setContext('features.auth.user', user);

// ❌ Bad - unclear
setContext('db', conn);
setContext('cache', client);
setContext('user', user);
```

---

## Adding Dependencies

### Install Package

```bash
# Always use pnpm
pnpm add package-name

# For dev dependencies
pnpm add -D package-name
```

### Check Package Info

```bash
# View package information
pnpm info package-name

# Check for outdated packages
pnpm outdated

# Update packages
pnpm update
```

### Import and Use

```typescript
// Import in your feature
import { someFunction } from 'package-name';

registerAction({
  hook: '$START_FEATURE',
  handler: async () => {
    const result = await someFunction();
  },
});
```

### Add Type Definitions

If the package doesn't include types:

```bash
pnpm add -D @types/package-name
```

---

## Running Tests

### Run All Tests

```bash
pnpm test
```

### Watch Mode

```bash
pnpm test:watch
```

### Run Specific Test File

```bash
pnpm test my-feature
```

### With Coverage

```bash
pnpm test:coverage

# View coverage report
open coverage/index.html
```

### With UI

```bash
pnpm test:ui
```

### Debug a Test

Add `.only` to run single test:

```typescript
it.only('should test this specifically', () => {
  // Test code
});
```

---

## Debugging

### Enable Tracing

In `src/index.ts`:

```typescript
hookApp({
  features: [myFeature],
  trace: 'full', // 'full' | 'normal' | 'compact' | null
});
```

### Console Logging

```typescript
registerAction({
  hook: '$START_FEATURE',
  handler: ({ getConfig }: RegisterContext) => {
    console.log('[My Feature] Config:', getConfig('myFeature'));
    console.log('[My Feature] Starting...');
  },
});
```

### Debug with VSCode

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug App",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["dev"],
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["test"],
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### Check Type Errors

```bash
pnpm type-check
```

### Check Linting

```bash
pnpm lint
```

---

## Building for Production

### Build the Project

```bash
pnpm build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### Run Production Build

```bash
pnpm start
```

This runs `node dist/index.js`.

### Pre-Build Checks

```bash
# Run all checks
pnpm check

# This runs:
# - Type checking
# - Tests
# - Linting
```

### Clean Build

```bash
# Remove dist folder
rm -rf dist

# Rebuild
pnpm build
```

---

## Common Issues and Solutions

### Issue: Import Path Error

**Error:** `Cannot find module './features/my-feature/index'`

**Solution:** Add `.js` extension to imports:

```typescript
// ❌ Wrong
import myFeature from './features/my-feature/index';

// ✅ Correct
import myFeature from './features/my-feature/index.js';
```

### Issue: Type Error in Handler

**Error:** `Argument of type 'unknown' is not assignable to parameter...`

**Solution:** Add proper types to handler:

```typescript
// ❌ Wrong
handler: (args) => {
  console.log(args.message); // Error: args is unknown
}

// ✅ Correct
handler: (args: { message: string }) => {
  console.log(args.message);
}
```

### Issue: Async in INIT_FEATURE Not Working

**Problem:** Async operations in `$INIT_FEATURE` don't wait

**Solution:** Use `$START_FEATURE` for async operations:

```typescript
// ❌ Wrong
registerAction({
  hook: '$INIT_FEATURE',
  handler: async () => {
    await fetchData(); // Won't wait
  },
});

// ✅ Correct
registerAction({
  hook: '$START_FEATURE',
  handler: async () => {
    await fetchData(); // Will wait
  },
});
```

### Issue: Context Value Undefined

**Problem:** `getContext()` returns undefined

**Solution:** Check initialization order and ensure service initialized:

```typescript
registerAction({
  hook: '$START_FEATURE',
  handler: ({ getContext }: RegisterContext) => {
    // Check if service is ready
    const isReady = getContext<boolean>('database.ready', false);
    
    if (!isReady) {
      throw new Error('Database service not initialized');
    }
    
    const connection = getContext('database.connection');
  },
});
```

### Issue: Pre-commit Hook Fails

**Problem:** Commit is blocked by Husky

**Solution:**

```bash
# Check what's failing
pnpm type-check  # TypeScript errors?
pnpm lint        # Linting errors?
pnpm test        # Test failures?

# Fix issues and try again
git add .
git commit -m "message"
```

### Issue: Package Not Found After Install

**Problem:** `Cannot find module 'package-name'`

**Solution:**

```bash
# Reinstall dependencies
rm -rf node_modules
pnpm install

# Or clear pnpm cache
pnpm store prune
pnpm install
```

### Issue: Wrong Package Manager Used

**Problem:** `npm` or `yarn` was accidentally used

**Solution:**

```bash
# Remove wrong lock files
rm -f package-lock.json yarn.lock

# Reinstall with pnpm
pnpm install
```

---

## Quick Reference Commands

```bash
# Development
pnpm dev              # Start with hot reload
pnpm build            # Build for production
pnpm start            # Run production build

# Testing
pnpm test             # Run tests once
pnpm test:watch       # Watch mode
pnpm test:coverage    # With coverage
pnpm test:ui          # Visual UI

# Code Quality
pnpm type-check       # TypeScript validation
pnpm lint             # Check linting
pnpm lint:fix         # Fix linting issues
pnpm format           # Format code
pnpm check            # Run all checks

# Package Management
pnpm add pkg          # Add dependency
pnpm add -D pkg       # Add dev dependency
pnpm update           # Update packages
pnpm outdated         # Check outdated packages
```

---

## Next Steps

For more detailed information, see:

- [Hook App Guide](./hook-app-guide.md) - Comprehensive framework documentation
- [Coding Standards](./coding-standards.md) - TypeScript and code style rules
- [Testing Guide](./testing-guide.md) - Testing patterns and best practices
- [Architecture](./architecture.md) - Project structure and design patterns

---

## Getting Help

If you're stuck:

1. Check this common tasks guide
2. Review the detailed documentation in `docs/ai/`
3. Check the example feature in `src/features/feature-example/`
4. Review Hook App documentation: https://github.com/hook-app
5. Run with tracing enabled to see execution flow
