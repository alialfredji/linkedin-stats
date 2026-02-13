# Hook App Framework - Comprehensive Guide

## Overview

Hook App is a dynamic framework for Node.js that brings WordPress-style hooks to your applications. It enables you to build modular, traceable, and extensible applications through a lifecycle-based architecture with hooks, actions, services, and features.

**Repository:** https://github.com/hook-app  
**Version:** 1.0.4  
**License:** ISC

## Core Architecture

### The Five Pillars

1. **Hooks** - Named extension points where code can attach
2. **Actions** - Functions that execute when hooks are triggered
3. **Services** - Infrastructure components (databases, APIs, caching, logging)
4. **Features** - Business logic components built on top of services
5. **Settings & Context** - Configuration and shared state management

### Why Hook App?

**Benefits:**
- **Modularity** - Features and services are independent, self-contained modules
- **Extensibility** - Add or remove functionality without modifying core code
- **Traceability** - Built-in tracing shows exact execution order and timing
- **Debuggability** - Clear lifecycle makes it easy to understand what runs when
- **Testability** - Isolated modules are easier to test independently

## Lifecycle System

### Boot Sequence

Hook App executes in a strict lifecycle order during application startup:

```
$START
  ↓
$SETTINGS
  ↓
$INIT_SERVICES (parallel)
  ↓
$INIT_SERVICE (serie, one per service)
  ↓
$INIT_FEATURES (parallel)
  ↓
$INIT_FEATURE (serie, one per feature)
  ↓
$START_SERVICES (parallel)
  ↓
$START_SERVICE (serie, one per service)
  ↓
$START_FEATURES (parallel)
  ↓
$START_FEATURE (serie, one per feature)
  ↓
$FINISH
```

### Lifecycle Hook Reference

| Hook | Execution Mode | When It Runs | Use For |
|------|----------------|--------------|---------|
| `$START` | serie | Very first hook | App-level initialization |
| `$SETTINGS` | serie | After start | Modifying application settings |
| `$INIT_SERVICES` | parallel | Before services init | Preparing for services |
| `$INIT_SERVICE` | serie | During services init | Initializing each service (async ok) |
| `$INIT_FEATURES` | parallel | Before features init | Preparing for features |
| `$INIT_FEATURE` | serie | During features init | Initializing each feature (sync only) |
| `$START_SERVICES` | parallel | Before services start | Preparing to start services |
| `$START_SERVICE` | serie | During services start | Starting each service (async ok) |
| `$START_FEATURES` | parallel | Before features start | Preparing to start features |
| `$START_FEATURE` | serie | During features start | Starting each feature (async ok) |
| `$FINISH` | serie | Very last hook | App fully ready |

**Important Distinctions:**

- **INIT vs START:**
  - `$INIT_*` - Setup phase (create connections, prepare resources)
  - `$START_*` - Activation phase (start listening, begin operations)

- **Sync vs Async:**
  - `$INIT_FEATURE` - Synchronous only (quick setup)
  - `$START_FEATURE` - Async allowed (database queries, API calls, etc.)

## Hook Registration and Execution

### Register Context API

Every service and feature receives a `RegisterContext` object with these methods:

```typescript
type RegisterContext = {
  // Action registration
  registerAction: (config: ActionConfig | string, handler?: Function, options?: ActionOptions) => void;
  
  // Hook registration
  registerHook: (hooks: Record<string, string>) => void;
  
  // Hook execution
  createHook: {
    sync: (name: string, args?: any) => any[];
    serie: (name: string, args?: any) => Promise<any[]>;
    parallel: (name: string, args?: any) => Promise<any[]>;
    waterfall: (name: string, initial: any) => { value: any; results: any[] };
  };
  
  // Settings management
  getConfig: <T>(path: string, defaultValue?: T) => T;
  setConfig: (path: string, value: any) => void;
  
  // Context management
  getContext: <T>(path: string, defaultValue?: T) => T;
  setContext: (path: string, value: any) => void;
  
  // Introspection
  knownHooks: Record<string, string>;
};
```

### Registering Actions

**Full Object Syntax:**
```typescript
registerAction({
  hook: '$INIT_FEATURE',
  name: 'my-feature',
  priority: 10,
  handler: (args, ctx) => {
    // Your logic here
  },
});
```

**Shorthand Syntax:**
```typescript
// Simple handler
registerAction('$INIT_FEATURE', () => {
  console.log('Feature initialized');
});

// With priority
registerAction('$INIT_FEATURE', handler, { priority: 10 });
```

**Action Priority:**
- Higher numbers run first (default: 0)
- Use for controlling execution order within a hook
- Example: priority 10 runs before priority 5

### Hook Execution Modes

#### 1. Synchronous (`sync`)

Blocks execution until all handlers complete. Use for quick, synchronous operations.

```typescript
const results = createHook.sync('my-hook', { data: 'example' });
// results is array of return values from all handlers
```

**When to use:**
- Synchronous operations only
- When you need results immediately
- For quick transformations or checks

#### 2. Sequential Async (`serie`)

Executes handlers one at a time, waiting for each to complete.

```typescript
const results = await createHook.serie('my-hook', { data: 'example' });
// Handlers run: handler1 → wait → handler2 → wait → handler3
```

**When to use:**
- Async operations that depend on order
- Database queries that must run sequentially
- Operations where timing matters

#### 3. Parallel Async (`parallel`)

Executes all handlers simultaneously, waits for all to complete.

```typescript
const results = await createHook.parallel('my-hook', { data: 'example' });
// All handlers run at the same time
```

**When to use:**
- Independent async operations
- Maximum performance needed
- Operations that don't depend on each other

#### 4. Waterfall

Passes the result from one handler to the next, like a data pipeline.

```typescript
const { value, results } = createHook.waterfall('transform', 10);

// Example handlers:
registerAction('transform', (value: number) => value + 5);  // 10 + 5 = 15
registerAction('transform', (value: number) => value * 2);  // 15 * 2 = 30
// Final value: 30
```

**When to use:**
- Data transformation pipelines
- Validation chains
- Middleware-style processing

## Feature Development

### Standard Feature Pattern

```typescript
import type { RegisterContext } from '@hook-app';

const FEATURE_NAME = 'my-feature';

const hooks = {
  MY_HOOK: 'my-custom-hook',
  DATA_LOADED: 'data-loaded',
};

export default ({ registerAction, registerHook, getConfig, setConfig, createHook }: RegisterContext) => {
  // 1. Register custom hooks
  registerHook(hooks);

  // 2. Initialize (synchronous only)
  registerAction({
    hook: '$INIT_FEATURE',
    name: FEATURE_NAME,
    handler: () => {
      console.log('[My Feature] Initializing');
      // Quick, synchronous setup only
    },
  });

  // 3. Start (async allowed)
  registerAction({
    hook: '$START_FEATURE',
    name: FEATURE_NAME,
    handler: async ({ getConfig, createHook }: RegisterContext) => {
      console.log('[My Feature] Starting');
      
      // Get configuration
      const apiUrl = getConfig<string>('api.url', 'http://localhost:3000');
      
      // Perform async operations
      const data = await fetchData(apiUrl);
      
      // Trigger custom hook
      createHook.sync(hooks.DATA_LOADED, { data });
    },
  });

  // 4. Listen to other hooks
  registerAction({
    hook: '$DATA_LOADED',
    name: FEATURE_NAME,
    handler: ({ data }) => {
      console.log('[My Feature] Data received:', data);
    },
  });
};
```

### Feature Best Practices

**DO:**
- Use descriptive, kebab-case feature names (`'user-auth'`, `'data-sync'`)
- Register custom hooks at the top of your feature
- Use `$INIT_FEATURE` only for quick, synchronous setup
- Put async operations in `$START_FEATURE`
- Type your handler arguments properly
- Return meaningful values from handlers
- Log important actions for debugging

**DON'T:**
- Don't use async operations in `$INIT_FEATURE`
- Don't rely on feature execution order (they run in parallel)
- Don't store state in module-level variables (use context)
- Don't mutate settings directly (use `setConfig`)
- Don't forget to export your feature as default

## Service Development

### Standard Service Pattern

```typescript
import type { RegisterContext } from '@hook-app';

const SERVICE_NAME = 'database';

export default ({ registerAction, setContext, getContext }: RegisterContext) => {
  // 1. Initialize service
  registerAction({
    hook: '$INIT_SERVICE',
    name: SERVICE_NAME,
    handler: async ({ setContext, getConfig }: RegisterContext) => {
      console.log('[Database] Initializing connection');
      
      // Get config
      const dbUrl = getConfig<string>('database.url');
      
      // Create connection (async ok)
      const connection = await createConnection(dbUrl);
      
      // Store in context for features to use
      setContext('database.connection', connection);
      setContext('database.ready', false);
    },
  });

  // 2. Start service
  registerAction({
    hook: '$START_SERVICE',
    name: SERVICE_NAME,
    handler: async ({ getContext, setContext }: RegisterContext) => {
      console.log('[Database] Starting');
      
      const connection = getContext('database.connection');
      
      // Perform startup operations
      await connection.connect();
      
      // Mark as ready
      setContext('database.ready', true);
      console.log('[Database] Ready');
    },
  });
};
```

### Service Best Practices

**DO:**
- Use `$INIT_SERVICE` for creating resources (connections, clients)
- Use `$START_SERVICE` for activating resources (connect, listen)
- Store shared resources in context with descriptive paths
- Provide clear API for features to consume
- Handle errors gracefully
- Log startup progress

**DON'T:**
- Don't expose internal implementation details
- Don't forget to mark service as ready in context
- Don't block startup with non-critical operations

## Settings Management

### Reading Settings

Settings use dot-notation for nested access:

```typescript
// Get top-level setting
const appName = getConfig<string>('app.name', 'Default App');

// Get nested setting
const dbHost = getConfig<string>('database.host', 'localhost');

// Get entire object
const dbConfig = getConfig<DatabaseConfig>('database');

// Provide defaults
const timeout = getConfig<number>('api.timeout', 5000);
```

### Modifying Settings

Use `setConfig` to add or update settings:

```typescript
// Set new value
setConfig('api.timeout', 10000);

// Set nested value
setConfig('database.pool.max', 20);

// Set entire object
setConfig('cache', {
  enabled: true,
  ttl: 3600,
});
```

### Settings in $SETTINGS Hook

The `$SETTINGS` hook runs early in the lifecycle and is designed for programmatic settings modifications:

```typescript
registerAction({
  hook: '$SETTINGS',
  handler: ({ setConfig, getConfig }: RegisterContext) => {
    // Compute settings based on environment
    const isDev = process.env.NODE_ENV === 'development';
    setConfig('app.debug', isDev);
    
    // Override defaults
    if (isDev) {
      setConfig('logging.level', 'debug');
    }
  },
});
```

## Context Management

Context is used for sharing state between features and services.

### Storing in Context

```typescript
// Store primitive values
setContext('app.started', true);

// Store objects
setContext('cache.client', redisClient);

// Store nested data
setContext('users.active', []);
```

### Retrieving from Context

```typescript
// Get with type
const client = getContext<RedisClient>('cache.client');

// Get with default
const count = getContext<number>('users.count', 0);

// Check if exists
const isReady = getContext<boolean>('database.ready', false);
```

### Context Best Practices

**DO:**
- Use descriptive, namespaced paths (`service.resource`, not just `resource`)
- Store only what needs to be shared
- Provide defaults when retrieving
- Document what you store in context

**DON'T:**
- Don't mutate objects retrieved from context (create new objects)
- Don't store sensitive data without encryption
- Don't use context as a dumping ground for everything

## Custom Hooks

Custom hooks enable cross-feature communication without tight coupling.

### Defining Custom Hooks

```typescript
const hooks = {
  USER_CREATED: 'user-created',
  USER_DELETED: 'user-deleted',
  DATA_SYNCED: 'data-synced',
};

registerHook(hooks);
```

### Triggering Custom Hooks

```typescript
registerAction({
  hook: '$START_FEATURE',
  name: 'user-manager',
  handler: ({ createHook }: RegisterContext) => {
    // Create user...
    const user = createUser();
    
    // Notify other features
    createHook.sync(hooks.USER_CREATED, { user });
  },
});
```

### Listening to Custom Hooks

```typescript
registerAction({
  hook: '$USER_CREATED',
  name: 'email-service',
  handler: ({ user }: { user: User }) => {
    sendWelcomeEmail(user);
  },
});

registerAction({
  hook: '$USER_CREATED',
  name: 'analytics',
  handler: ({ user }: { user: User }) => {
    trackUserSignup(user);
  },
});
```

## Advanced Patterns

### Conditional Feature Loading

```typescript
export default ({ registerAction, getConfig }: RegisterContext) => {
  registerAction({
    hook: '$INIT_FEATURE',
    name: 'optional-feature',
    handler: ({ getConfig }: RegisterContext) => {
      const enabled = getConfig<boolean>('features.optional.enabled', false);
      
      if (!enabled) {
        console.log('[Optional Feature] Disabled, skipping');
        return;
      }
      
      // Continue with initialization
    },
  });
};
```

### Inter-Feature Dependencies

```typescript
registerAction({
  hook: '$START_FEATURE',
  name: 'dependent-feature',
  handler: async ({ getContext }: RegisterContext) => {
    // Wait for dependency to be ready
    const dbReady = getContext<boolean>('database.ready', false);
    
    if (!dbReady) {
      throw new Error('Database not ready');
    }
    
    const connection = getContext('database.connection');
    // Use connection...
  },
});
```

### Dynamic Hook Registration

```typescript
export default ({ registerAction, registerHook }: RegisterContext) => {
  // Register hooks dynamically
  const hooks = {};
  const events = ['created', 'updated', 'deleted'];
  
  events.forEach(event => {
    hooks[`USER_${event.toUpperCase()}`] = `user-${event}`;
  });
  
  registerHook(hooks);
};
```

## Tracing and Debugging

### Enable Tracing

```typescript
import hookApp from '@hook-app';

await hookApp({
  features: [myFeature],
  trace: 'compact',  // 'full' | 'normal' | 'compact' | null
});
```

**Trace Levels:**
- `full` - Detailed timing and execution info
- `normal` - Standard execution flow
- `compact` - Minimal output (recommended for development)
- `null` - No tracing (production)

### Understanding Trace Output

```
[Hook App] $START (serie)
  → action-1 (10ms)
  → action-2 (5ms)
[Hook App] $INIT_FEATURE (serie)
  → my-feature (2ms)
  → another-feature (3ms)
```

## Error Handling

### Catching Errors in Handlers

```typescript
registerAction({
  hook: '$START_FEATURE',
  name: 'my-feature',
  handler: async () => {
    try {
      await riskyOperation();
    } catch (error) {
      console.error('[My Feature] Error:', error);
      // Handle or rethrow
      throw error;
    }
  },
});
```

### Global Error Handling

```typescript
hookApp({
  features: [myFeature],
})
  .then(() => {
    console.log('App started successfully');
  })
  .catch((error) => {
    console.error('Failed to start app:', error);
    process.exit(1);
  });
```

## Testing Hook App Features

### Testing a Feature

```typescript
import { describe, it, expect, vi } from 'vitest';
import hookApp from '@hook-app';
import myFeature from './my-feature.js';

describe('MyFeature', () => {
  it('should initialize correctly', async () => {
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
});
```

## Common Pitfalls

### 1. Async in $INIT_FEATURE
**WRONG:**
```typescript
registerAction({
  hook: '$INIT_FEATURE',
  handler: async () => {
    await fetchData(); // ❌ This will NOT work as expected
  },
});
```

**RIGHT:**
```typescript
registerAction({
  hook: '$START_FEATURE',
  handler: async () => {
    await fetchData(); // ✅ Correct
  },
});
```

### 2. Relying on Feature Order
**WRONG:**
```typescript
// Feature A sets a value
registerAction('$INIT_FEATURE', () => {
  globalVar = 'value';
});

// Feature B expects it to exist
registerAction('$INIT_FEATURE', () => {
  console.log(globalVar); // ❌ May not be set yet
});
```

**RIGHT:**
```typescript
// Feature A stores in context
registerAction('$INIT_FEATURE', ({ setContext }) => {
  setContext('app.value', 'value');
});

// Feature B retrieves from context
registerAction('$START_FEATURE', ({ getContext }) => {
  const value = getContext('app.value'); // ✅ Correct
});
```

### 3. Direct Settings Mutation
**WRONG:**
```typescript
const settings = getConfig('app');
settings.name = 'New Name'; // ❌ Mutation
```

**RIGHT:**
```typescript
setConfig('app.name', 'New Name'); // ✅ Correct
```

## Performance Considerations

1. **Use Parallel Hooks When Possible** - `parallel` execution is fastest
2. **Minimize Sync Operations** - Async operations should go in `$START_*` hooks
3. **Lazy Load Heavy Dependencies** - Import only when needed
4. **Cache Expensive Computations** - Store results in context
5. **Avoid Deep Hook Nesting** - Keep hook chains shallow

## Summary

Hook App provides a powerful, flexible architecture for Node.js applications:

- **Lifecycle hooks** provide predictable execution order
- **Features and services** enable modular code organization
- **Custom hooks** allow decoupled communication
- **Settings and context** manage configuration and state
- **Multiple execution modes** fit different use cases
- **Built-in tracing** aids debugging

Follow the patterns in this guide to build maintainable, extensible applications with Hook App.
