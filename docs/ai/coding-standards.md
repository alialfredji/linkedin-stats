# Coding Standards

## TypeScript Configuration

### Required Compiler Settings

The project MUST use strict TypeScript configuration. Never compromise on type safety.

**tsconfig.json required settings:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Type Safety Rules

**DO:**
- ✅ Use explicit types for all function parameters
- ✅ Use explicit return types for all functions
- ✅ Use `unknown` when type is truly unknown
- ✅ Use type guards to narrow types
- ✅ Use const assertions for literal types
- ✅ Use generics for reusable type-safe code

**DON'T:**
- ❌ Never use `any` (use `unknown` instead)
- ❌ Never use `@ts-ignore` or `@ts-expect-error` (fix the issue)
- ❌ Never disable strict mode
- ❌ Never use type assertions unless absolutely necessary

### Type vs Interface

**Use `type` for:**
- Object shapes
- Union types
- Intersection types
- Mapped types
- Utility types

```typescript
type User = {
  id: string;
  name: string;
  email: string;
};

type Result = Success | Error;
type ReadonlyUser = Readonly<User>;
```

**Use `interface` for:**
- Extensible contracts
- Object-oriented patterns
- When you need declaration merging

```typescript
interface Pluggable {
  init(): void;
  destroy(): void;
}

interface ExtendedPluggable extends Pluggable {
  configure(options: Options): void;
}
```

## Naming Conventions

### File and Folder Names

**Files:** Always use kebab-case
```
user-service.ts
api-handler.ts
database-connection.ts
feature-example.ts
```

**Folders:** Always use kebab-case
```
src/features/user-management/
src/services/cache-service/
test/integration-tests/
```

**Test Files:** Mirror source file names with `.test.ts` or `.spec.ts`
```
user-service.ts → user-service.test.ts
api-handler.ts → api-handler.spec.ts
```

### Variable and Function Names

**Use camelCase:**
```typescript
// Variables
const userName = 'John';
const isActive = true;
const userCount = 10;

// Functions
function getUserData() { }
function calculateTotal() { }
async function fetchUserProfile() { }
```

**Boolean variables:** Prefix with `is`, `has`, `should`, `can`
```typescript
const isValid = true;
const hasPermission = false;
const shouldRetry = true;
const canEdit = false;
```

### Type and Interface Names

**Use PascalCase:**
```typescript
type UserData = { /* ... */ };
type ApiResponse = { /* ... */ };
interface DatabaseConnection { /* ... */ }
interface RequestHandler { /* ... */ }
```

### Constants

**Use UPPER_SNAKE_CASE for true constants:**
```typescript
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';
const DEFAULT_TIMEOUT = 5000;
```

**Use camelCase for computed/derived values:**
```typescript
const maxConnections = getEnvVar('MAX_CONNECTIONS', 10);
const apiKey = process.env.API_KEY;
```

### Feature and Service Names

**Use kebab-case strings:**
```typescript
const FEATURE_NAME = 'user-authentication';
const SERVICE_NAME = 'database-connection';
```

## Import/Export Standards

### Module System

**CRITICAL:** This project uses ES modules. Always use ES module syntax.

**DO:**
```typescript
import hookApp from '@hook-app';
import type { RegisterContext } from '@hook-app';
import myFeature from './features/my-feature/index.js';
```

**DON'T:**
```typescript
const hookApp = require('@hook-app'); // ❌ Never use require
```

### Import Extensions

**CRITICAL:** Always use `.js` extension in imports, even for `.ts` files.

This is required by TypeScript's ES module resolution when `type: "module"` is set in package.json.

**Correct:**
```typescript
import myFeature from './features/my-feature/index.js'; // ✅
import { helper } from './utils/helper.js'; // ✅
```

**Incorrect:**
```typescript
import myFeature from './features/my-feature/index'; // ❌
import { helper } from './utils/helper'; // ❌
import myFeature from './features/my-feature/index.ts'; // ❌
```

### Import Organization

Group imports in this order, with blank lines between groups:

1. External packages
2. Internal modules (absolute paths)
3. Relative imports (same directory)
4. Type imports

```typescript
// 1. External packages
import hookApp from '@hook-app';
import { z } from 'zod';

// 2. Internal modules
import { config } from '@/config/index.js';
import { logger } from '@/utils/logger.js';

// 3. Relative imports
import { helper } from './helper.js';
import { constants } from './constants.js';

// 4. Type imports
import type { RegisterContext } from '@hook-app';
import type { User } from './types.js';
```

### Export Standards

**Features and Services:** Use default export
```typescript
// src/features/my-feature/index.ts
export default ({ registerAction }: RegisterContext) => {
  // Feature implementation
};
```

**Utilities and Helpers:** Use named exports
```typescript
// src/utils/helpers.ts
export function formatDate(date: Date): string { }
export function validateEmail(email: string): boolean { }
```

**Types:** Always use named exports
```typescript
// src/types/user.ts
export type User = {
  id: string;
  name: string;
};

export type UserRole = 'admin' | 'user' | 'guest';
```

**Re-exporting:**
```typescript
// src/features/index.ts
export { default as userAuth } from './user-auth/index.js';
export { default as dataSync } from './data-sync/index.js';
```

## Function Standards

### Function Signatures

**Always type parameters and return values:**

```typescript
// ✅ Good
function calculateTotal(items: Item[], tax: number): number {
  return items.reduce((sum, item) => sum + item.price, 0) * (1 + tax);
}

// ❌ Bad
function calculateTotal(items, tax) {
  return items.reduce((sum, item) => sum + item.price, 0) * (1 + tax);
}
```

### Async Functions

**Always use `async/await` over promises:**

```typescript
// ✅ Good
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

// ❌ Bad
function fetchUser(id: string): Promise<User> {
  return fetch(`/api/users/${id}`).then(res => res.json());
}
```

### Arrow Functions vs Regular Functions

**Use arrow functions for:**
- Inline callbacks
- Short utility functions
- When you need lexical `this`

```typescript
const double = (n: number): number => n * 2;
items.map(item => item.id);
setTimeout(() => console.log('Done'), 1000);
```

**Use regular functions for:**
- Top-level functions
- Methods that use `this`
- Functions with complex logic

```typescript
function processUserData(user: User): ProcessedUser {
  // Multi-line logic
  const normalized = normalizeData(user);
  const validated = validateData(normalized);
  return validated;
}
```

## Error Handling

### Try-Catch Blocks

**Always catch errors in async operations:**

```typescript
registerAction({
  hook: '$START_FEATURE',
  name: 'my-feature',
  handler: async () => {
    try {
      await riskyOperation();
    } catch (error) {
      console.error('[My Feature] Operation failed:', error);
      throw error; // Re-throw if feature should fail
    }
  },
});
```

### Error Types

**Use typed errors:**

```typescript
class DatabaseError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

try {
  await query();
} catch (error) {
  if (error instanceof DatabaseError) {
    console.error('Database error:', error.code);
  } else {
    console.error('Unknown error:', error);
  }
}
```

### Error Messages

**Be specific and actionable:**

```typescript
// ✅ Good
throw new Error('Failed to connect to database at localhost:5432. Check if PostgreSQL is running.');

// ❌ Bad
throw new Error('Database error');
```

## Code Organization

### File Structure

**One feature/service per file:**

```typescript
// src/features/user-auth/index.ts
import type { RegisterContext } from '@hook-app';

const FEATURE_NAME = 'user-auth';

export default ({ registerAction }: RegisterContext) => {
  // All feature logic here
};
```

**Complex features can be split into modules:**

```
src/features/user-auth/
├── index.ts          # Main feature export
├── handlers.ts       # Handler functions
├── validators.ts     # Validation logic
├── types.ts          # Type definitions
└── constants.ts      # Constants
```

### Function Length

**Keep functions focused and short:**

- Maximum 50 lines per function (guideline, not hard rule)
- One responsibility per function
- Extract complex logic into helper functions

```typescript
// ✅ Good - focused functions
function validateUser(user: User): ValidationResult {
  return {
    valid: isValidEmail(user.email) && isValidAge(user.age),
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidAge(age: number): boolean {
  return age >= 18 && age <= 120;
}

// ❌ Bad - doing too much
function validateAndSaveUser(user: User): SaveResult {
  // 100 lines of validation, transformation, and database logic
}
```

### Code Comments

**Write self-documenting code first, then add comments for complex logic:**

```typescript
// ✅ Good - code is clear without comments
function calculateDiscountedPrice(price: number, discountPercent: number): number {
  return price * (1 - discountPercent / 100);
}

// ✅ Good - comment explains WHY, not WHAT
function retryWithBackoff(fn: () => Promise<void>): Promise<void> {
  // Exponential backoff prevents overwhelming the server during recovery
  // and gives transient errors time to resolve
  return retry(fn, { maxAttempts: 3, backoff: 'exponential' });
}

// ❌ Bad - comment states the obvious
function add(a: number, b: number): number {
  // Add a and b together
  return a + b;
}
```

**Use JSDoc for public APIs:**

```typescript
/**
 * Fetches user data from the API
 * @param userId - The unique identifier for the user
 * @returns Promise resolving to user data
 * @throws {NotFoundError} When user doesn't exist
 */
async function fetchUser(userId: string): Promise<User> {
  // Implementation
}
```

## Hook App Specific Standards

### Feature Registration Pattern

**Always follow this structure:**

```typescript
import type { RegisterContext } from '@hook-app';

const FEATURE_NAME = 'feature-name'; // kebab-case

const hooks = {
  HOOK_NAME: 'hook-name', // kebab-case
};

export default ({ registerAction, registerHook }: RegisterContext) => {
  // 1. Register hooks first
  registerHook(hooks);

  // 2. Register actions
  registerAction({
    hook: '$INIT_FEATURE',
    name: FEATURE_NAME,
    handler: () => {
      // Implementation
    },
  });
};
```

### Hook Names

**Lifecycle hooks:** Prefixed with `$`, UPPER_CASE
```typescript
'$START'
'$INIT_FEATURE'
'$START_SERVICE'
```

**Custom hooks:** Lowercase with hyphens
```typescript
'user-created'
'data-loaded'
'cache-cleared'
```

### Context Keys

**Use descriptive, namespaced paths:**

```typescript
// ✅ Good
setContext('database.connection', conn);
setContext('cache.redis.client', client);
setContext('features.auth.initialized', true);

// ❌ Bad
setContext('db', conn);
setContext('client', client);
setContext('initialized', true);
```

## Biome Configuration

This project uses **Biome** for linting and formatting (NOT ESLint or Prettier).

### Running Biome

```bash
# Check for issues
pnpm lint

# Auto-fix issues
pnpm lint:fix

# Format code
pnpm format

# Check formatting without writing
pnpm format:check

# Run all checks
pnpm check
```

### Biome Rules

Biome configuration is in `biome.json`. Key rules:

- Line length: 100 characters
- Indentation: 2 spaces
- Quotes: Single quotes for strings
- Semicolons: Required
- Trailing commas: ES5 (arrays, objects)

**The pre-commit hook will enforce these automatically.**

## Package Management

### Using pnpm

**CRITICAL:** This project uses pnpm exclusively.

**DO:**
```bash
pnpm add package-name
pnpm add -D dev-package
pnpm update
pnpm install
```

**DON'T:**
```bash
npm install package-name  # ❌ Never
yarn add package-name     # ❌ Never
```

### Adding Dependencies

**Before adding a package:**

1. Check if it's the latest stable version
2. Check bundle size (use bundlephobia.com)
3. Check maintenance status (recent commits, active issues)
4. Prefer packages with TypeScript support

**Never add outdated packages.**

### Dependency Types

```bash
# Runtime dependency
pnpm add @hook-app

# Development dependency
pnpm add -D vitest @types/node

# Peer dependency (add to package.json manually)
# For library packages only
```

## Code Style Guidelines

### Spacing and Formatting

```typescript
// ✅ Good spacing
function example(a: number, b: number): number {
  const result = a + b;
  return result;
}

// Object literals
const user = {
  id: '123',
  name: 'John',
  age: 30,
};

// Destructuring
const { id, name } = user;

// Arrays
const numbers = [1, 2, 3, 4, 5];
```

### Line Length

**Maximum 100 characters per line** (enforced by Biome)

```typescript
// ✅ Good - break long lines
const result = await someFunction(
  firstParameter,
  secondParameter,
  thirdParameter,
);

// ✅ Good - break long strings
const message =
  'This is a very long message that would exceed ' +
  'the maximum line length if written on one line';
```

### Object and Array Patterns

```typescript
// ✅ Good - consistent formatting
const config = {
  host: 'localhost',
  port: 5432,
  database: 'myapp',
};

const features = [
  featureOne,
  featureTwo,
  featureThree,
];

// ✅ Good - multiline for readability
registerAction({
  hook: '$INIT_FEATURE',
  name: 'my-feature',
  priority: 10,
  handler: () => {
    console.log('Initialized');
  },
});
```

## Best Practices Summary

### Type Safety
1. ✅ Use strict TypeScript mode
2. ✅ Type all function parameters and returns
3. ✅ Use `unknown` instead of `any`
4. ✅ Use type guards to narrow types

### Naming
5. ✅ Files and folders: kebab-case
6. ✅ Variables and functions: camelCase
7. ✅ Types and interfaces: PascalCase
8. ✅ Constants: UPPER_SNAKE_CASE

### Imports
9. ✅ Use ES modules only
10. ✅ Add `.js` extension to imports
11. ✅ Group imports logically
12. ✅ Use type imports for types

### Code Organization
13. ✅ One feature/service per file
14. ✅ Keep functions focused and short
15. ✅ Write self-documenting code
16. ✅ Add comments only when necessary

### Error Handling
17. ✅ Always catch errors in async operations
18. ✅ Use typed error classes
19. ✅ Write specific error messages
20. ✅ Re-throw when appropriate

### Package Management
21. ✅ Always use pnpm
22. ✅ Never add outdated packages
23. ✅ Check package quality before adding
24. ✅ Use latest stable versions

### Code Quality
25. ✅ Run Biome before committing
26. ✅ Fix all type errors
27. ✅ Write tests for new code
28. ✅ Follow Hook App patterns

These standards ensure consistent, maintainable, and high-quality code across the project.
