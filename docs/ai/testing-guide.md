# Testing Guide

## Overview

This project uses **Vitest** as the testing framework. Vitest is a fast, modern test runner built for Vite but works great with any TypeScript/JavaScript project.

**Key Features:**
- Fast parallel test execution
- Native TypeScript support
- Jest-compatible API
- Built-in coverage reporting
- Watch mode for development
- UI mode for visual testing

## Test File Organization

### File Naming

Test files should mirror the source structure and use `.test.ts` or `.spec.ts` suffix:

```
src/
├── features/
│   └── user-auth/
│       ├── index.ts
│       └── index.test.ts      ← Test file
├── services/
│   └── database/
│       ├── index.ts
│       └── index.test.ts      ← Test file
└── index.ts
    └── index.test.ts          ← Test file
```

### Test File Structure

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { functionToTest } from './index.js';

describe('FeatureName', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  it('should do something specific', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = functionToTest(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

## Running Tests

### Basic Commands

```bash
# Run all tests once
pnpm test

# Run tests in watch mode (re-runs on file changes)
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Open Vitest UI in browser
pnpm test:ui

# Run benchmark tests
pnpm test:bench
```

### Filtering Tests

```bash
# Run tests matching a pattern
pnpm test user-auth

# Run only tests in a specific file
pnpm test src/features/user-auth/index.test.ts

# Run tests in watch mode for specific file
pnpm test:watch user-auth
```

## Test Structure

### Describe Blocks

Group related tests using `describe`:

```typescript
describe('UserAuthentication', () => {
  describe('login', () => {
    it('should authenticate with valid credentials', () => {
      // Test implementation
    });

    it('should reject invalid credentials', () => {
      // Test implementation
    });
  });

  describe('logout', () => {
    it('should clear session on logout', () => {
      // Test implementation
    });
  });
});
```

### Test Cases

Write focused, descriptive test cases:

```typescript
// ✅ Good - descriptive and specific
it('should return user data when authentication succeeds', () => {
  // Test implementation
});

// ✅ Good - tests one behavior
it('should throw AuthenticationError when password is incorrect', () => {
  // Test implementation
});

// ❌ Bad - vague description
it('should work', () => {
  // Test implementation
});

// ❌ Bad - tests multiple behaviors
it('should authenticate and fetch user data and log event', () => {
  // Test implementation
});
```

### Arrange-Act-Assert Pattern

Structure tests using the AAA pattern:

```typescript
it('should calculate discounted price correctly', () => {
  // Arrange - Set up test data
  const originalPrice = 100;
  const discountPercent = 20;
  
  // Act - Execute the function
  const result = calculateDiscount(originalPrice, discountPercent);
  
  // Assert - Verify the result
  expect(result).toBe(80);
});
```

## Assertions

### Basic Assertions

```typescript
// Equality
expect(value).toBe(5);                    // Strict equality (===)
expect(value).toEqual({ id: 1 });         // Deep equality
expect(value).not.toBe(null);             // Negation

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeDefined();
expect(value).toBeUndefined();
expect(value).toBeNull();

// Numbers
expect(value).toBeGreaterThan(5);
expect(value).toBeLessThan(10);
expect(value).toBeCloseTo(0.3, 1);        // Floating point comparison

// Strings
expect(str).toContain('substring');
expect(str).toMatch(/regex/);
expect(str).toHaveLength(5);

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(3);
expect(array).toEqual([1, 2, 3]);

// Objects
expect(obj).toHaveProperty('key');
expect(obj).toHaveProperty('key', 'value');
expect(obj).toMatchObject({ id: 1 });     // Partial match
```

### Async Assertions

```typescript
// Async/await
it('should fetch user data', async () => {
  const user = await fetchUser('123');
  expect(user).toBeDefined();
  expect(user.id).toBe('123');
});

// Promise assertions
it('should resolve with user data', async () => {
  await expect(fetchUser('123')).resolves.toEqual({ id: '123' });
});

it('should reject with error', async () => {
  await expect(fetchUser('invalid')).rejects.toThrow('User not found');
});
```

### Error Assertions

```typescript
// Function that throws
it('should throw error for invalid input', () => {
  expect(() => validateEmail('invalid')).toThrow();
  expect(() => validateEmail('invalid')).toThrow(ValidationError);
  expect(() => validateEmail('invalid')).toThrow('Invalid email format');
});

// Async function that throws
it('should reject with error', async () => {
  await expect(fetchUser('invalid')).rejects.toThrow('User not found');
});
```

## Setup and Teardown

### Lifecycle Hooks

```typescript
describe('DatabaseConnection', () => {
  let connection: DatabaseConnection;

  // Runs once before all tests in this describe block
  beforeAll(async () => {
    connection = await createConnection();
  });

  // Runs before each test
  beforeEach(async () => {
    await connection.clear();
  });

  // Runs after each test
  afterEach(async () => {
    // Cleanup
  });

  // Runs once after all tests in this describe block
  afterAll(async () => {
    await connection.close();
  });

  it('should connect to database', () => {
    expect(connection.isConnected()).toBe(true);
  });
});
```

### When to Use Each Hook

- **beforeAll/afterAll** - Expensive setup (database connections, file I/O)
- **beforeEach/afterEach** - Reset state between tests (clear data, reset mocks)

## Mocking

### Mock Functions

```typescript
import { vi } from 'vitest';

it('should call callback with result', () => {
  const mockCallback = vi.fn();
  
  processData('input', mockCallback);
  
  expect(mockCallback).toHaveBeenCalled();
  expect(mockCallback).toHaveBeenCalledWith('processed');
  expect(mockCallback).toHaveBeenCalledTimes(1);
});
```

### Mock Return Values

```typescript
it('should use mocked return value', () => {
  const mockFn = vi.fn();
  
  // Single return value
  mockFn.mockReturnValue(42);
  
  // Different values on each call
  mockFn.mockReturnValueOnce(1)
        .mockReturnValueOnce(2)
        .mockReturnValue(3);
  
  expect(mockFn()).toBe(1);
  expect(mockFn()).toBe(2);
  expect(mockFn()).toBe(3);
  expect(mockFn()).toBe(3);
});
```

### Mock Async Functions

```typescript
it('should handle async mocked function', async () => {
  const mockFetch = vi.fn();
  
  mockFetch.mockResolvedValue({ id: '123' });
  
  const result = await mockFetch();
  expect(result).toEqual({ id: '123' });
});

it('should handle rejected promise', async () => {
  const mockFetch = vi.fn();
  
  mockFetch.mockRejectedValue(new Error('Network error'));
  
  await expect(mockFetch()).rejects.toThrow('Network error');
});
```

### Mock Modules

```typescript
// Mock entire module
vi.mock('./database.js', () => ({
  default: vi.fn(),
  connect: vi.fn().mockResolvedValue(true),
}));

// Mock specific exports
vi.mock('./utils.js', () => ({
  formatDate: vi.fn(() => '2024-01-01'),
  validateEmail: vi.fn(() => true),
}));
```

### Spy on Functions

```typescript
import { vi } from 'vitest';
import * as utils from './utils.js';

it('should spy on function call', () => {
  const spy = vi.spyOn(utils, 'formatDate');
  
  const result = utils.formatDate(new Date());
  
  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith(expect.any(Date));
  
  spy.mockRestore(); // Restore original implementation
});
```

## Testing Hook App Features

### Testing Feature Registration

```typescript
import { describe, it, expect, vi } from 'vitest';
import hookApp from '@hook-app';
import myFeature from './my-feature.js';

describe('MyFeature', () => {
  it('should register and execute during INIT_FEATURE', async () => {
    const mockHandler = vi.fn();
    
    const testFeature = ({ registerAction }: RegisterContext) => {
      registerAction({
        hook: '$INIT_FEATURE',
        name: 'test-feature',
        handler: mockHandler,
      });
    };
    
    await hookApp({ features: [testFeature] });
    
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });
});
```

### Testing Custom Hooks

```typescript
import { describe, it, expect, vi } from 'vitest';
import hookApp from '@hook-app';

describe('CustomHooks', () => {
  it('should trigger and listen to custom hooks', async () => {
    const listener = vi.fn();
    
    const featureA = ({ registerHook, createHook }: RegisterContext) => {
      registerHook({ MY_HOOK: 'my-hook' });
      
      registerAction({
        hook: '$START_FEATURE',
        handler: () => {
          createHook.sync('my-hook', { data: 'test' });
        },
      });
    };
    
    const featureB = ({ registerAction }: RegisterContext) => {
      registerAction({
        hook: '$MY_HOOK',
        handler: listener,
      });
    };
    
    await hookApp({ features: [featureA, featureB] });
    
    expect(listener).toHaveBeenCalledWith({ data: 'test' });
  });
});
```

### Testing with Context

```typescript
describe('ContextUsage', () => {
  it('should store and retrieve from context', async () => {
    let retrievedValue: string | undefined;
    
    const featureA = ({ registerAction, setContext }: RegisterContext) => {
      registerAction({
        hook: '$INIT_FEATURE',
        handler: () => {
          setContext('test.value', 'hello');
        },
      });
    };
    
    const featureB = ({ registerAction, getContext }: RegisterContext) => {
      registerAction({
        hook: '$START_FEATURE',
        handler: () => {
          retrievedValue = getContext<string>('test.value');
        },
      });
    };
    
    await hookApp({ features: [featureA, featureB] });
    
    expect(retrievedValue).toBe('hello');
  });
});
```

## Coverage

### Generating Coverage Reports

```bash
# Generate coverage report
pnpm test:coverage

# Coverage report is generated in ./coverage/
# - HTML report: coverage/index.html
# - LCOV report: coverage/lcov.info
```

### Coverage Thresholds

The project should maintain high coverage:

- **Statements:** 80% minimum
- **Branches:** 75% minimum
- **Functions:** 80% minimum
- **Lines:** 80% minimum

### What to Test

**Focus coverage on:**
- Business logic in features
- Service initialization and startup
- Error handling paths
- Edge cases and boundary conditions

**Lower priority for coverage:**
- Simple getters/setters
- Type definitions
- Configuration files
- Trivial utility functions

## Best Practices

### Test Independence

Each test should be independent and isolated:

```typescript
// ✅ Good - independent tests
describe('Calculator', () => {
  it('should add numbers', () => {
    expect(add(2, 3)).toBe(5);
  });

  it('should subtract numbers', () => {
    expect(subtract(5, 3)).toBe(2);
  });
});

// ❌ Bad - tests depend on each other
describe('Calculator', () => {
  let result: number;

  it('should add numbers', () => {
    result = add(2, 3);
    expect(result).toBe(5);
  });

  it('should use previous result', () => {
    result = add(result, 1); // Depends on previous test
    expect(result).toBe(6);
  });
});
```

### Test One Thing

Each test should verify one behavior:

```typescript
// ✅ Good - focused tests
it('should hash password', () => {
  const hashed = hashPassword('secret');
  expect(hashed).not.toBe('secret');
});

it('should verify correct password', () => {
  const hashed = hashPassword('secret');
  expect(verifyPassword('secret', hashed)).toBe(true);
});

it('should reject incorrect password', () => {
  const hashed = hashPassword('secret');
  expect(verifyPassword('wrong', hashed)).toBe(false);
});

// ❌ Bad - testing multiple behaviors
it('should hash and verify password', () => {
  const hashed = hashPassword('secret');
  expect(hashed).not.toBe('secret');
  expect(verifyPassword('secret', hashed)).toBe(true);
  expect(verifyPassword('wrong', hashed)).toBe(false);
});
```

### Descriptive Test Names

Test names should clearly describe what is being tested:

```typescript
// ✅ Good - clear what is tested and expected
it('should return null when user is not found', () => {});
it('should throw ValidationError when email is invalid', () => {});
it('should cache result after first call', () => {});

// ❌ Bad - vague or unclear
it('should work correctly', () => {});
it('test user', () => {});
it('handles error', () => {});
```

### Avoid Implementation Details

Test behavior, not implementation:

```typescript
// ✅ Good - tests behavior
it('should authenticate user with valid credentials', async () => {
  const result = await login('user@example.com', 'password');
  expect(result.success).toBe(true);
  expect(result.user.email).toBe('user@example.com');
});

// ❌ Bad - tests implementation details
it('should call hashPassword and compareHash', async () => {
  const hashSpy = vi.spyOn(crypto, 'hashPassword');
  const compareSpy = vi.spyOn(crypto, 'compareHash');
  
  await login('user@example.com', 'password');
  
  expect(hashSpy).toHaveBeenCalled();
  expect(compareSpy).toHaveBeenCalled();
});
```

### Use Test Data Builders

Create reusable test data:

```typescript
// test/helpers/builders.ts
export function createUser(overrides?: Partial<User>): User {
  return {
    id: '123',
    name: 'Test User',
    email: 'test@example.com',
    ...overrides,
  };
}

// In tests
it('should update user name', () => {
  const user = createUser({ name: 'John' });
  const updated = updateUserName(user, 'Jane');
  expect(updated.name).toBe('Jane');
});
```

## Common Testing Patterns

### Testing Async Operations

```typescript
it('should fetch user data', async () => {
  const user = await fetchUser('123');
  
  expect(user).toBeDefined();
  expect(user.id).toBe('123');
});
```

### Testing Error Cases

```typescript
it('should throw error for invalid input', () => {
  expect(() => validateAge(-1)).toThrow('Age must be positive');
});

it('should reject with error', async () => {
  await expect(fetchUser('invalid')).rejects.toThrow('User not found');
});
```

### Testing with Timers

```typescript
import { vi } from 'vitest';

it('should execute after delay', () => {
  vi.useFakeTimers();
  
  const callback = vi.fn();
  setTimeout(callback, 1000);
  
  expect(callback).not.toHaveBeenCalled();
  
  vi.advanceTimersByTime(1000);
  expect(callback).toHaveBeenCalled();
  
  vi.useRealTimers();
});
```

### Testing with Dates

```typescript
import { vi } from 'vitest';

it('should use current date', () => {
  const mockDate = new Date('2024-01-01');
  vi.setSystemTime(mockDate);
  
  const result = getCurrentDate();
  expect(result).toEqual(mockDate);
  
  vi.useRealTimers();
});
```

## Debugging Tests

### Run Single Test

```typescript
// Use .only to run just this test
it.only('should run only this test', () => {
  expect(true).toBe(true);
});

// Or entire describe block
describe.only('OnlyThisBlock', () => {
  it('test 1', () => {});
  it('test 2', () => {});
});
```

### Skip Tests

```typescript
// Skip a test temporarily
it.skip('should be skipped', () => {
  // This won't run
});

// Skip describe block
describe.skip('SkippedBlock', () => {
  // All tests in this block are skipped
});
```

### Console Logging

```typescript
it('should debug values', () => {
  const value = someFunction();
  console.log('Debug value:', value); // Will show in test output
  expect(value).toBeDefined();
});
```

## Performance Testing

### Benchmark Tests

```typescript
import { bench, describe } from 'vitest';

describe('Performance', () => {
  bench('array push', () => {
    const arr = [];
    for (let i = 0; i < 1000; i++) {
      arr.push(i);
    }
  });

  bench('array spread', () => {
    let arr = [];
    for (let i = 0; i < 1000; i++) {
      arr = [...arr, i];
    }
  });
});
```

Run benchmarks:
```bash
pnpm test:bench
```

## Summary

### Key Testing Principles

1. ✅ Write focused, independent tests
2. ✅ Test behavior, not implementation
3. ✅ Use descriptive test names
4. ✅ Follow Arrange-Act-Assert pattern
5. ✅ Mock external dependencies
6. ✅ Aim for high coverage on critical code
7. ✅ Run tests before committing (automated by Husky)
8. ✅ Keep tests maintainable and readable

### Test Checklist

Before considering a feature complete:

- [ ] Unit tests for all business logic
- [ ] Tests for error cases
- [ ] Tests for edge cases and boundaries
- [ ] Tests pass locally
- [ ] Coverage meets thresholds
- [ ] Tests are independent and isolated
- [ ] Test names clearly describe behavior
- [ ] No skipped tests without good reason

Following these guidelines ensures reliable, maintainable tests that give confidence in the codebase.
