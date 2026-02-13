# ai-friendly-boilerplate

A modern TypeScript boilerplate designed to work seamlessly with AI coding assistants. Built with the hook-app framework for modular, event-driven applications with a feature-based architecture.

## Overview

This project provides a solid foundation for building Node.js applications with:
- **AI-Friendly**: Structured agents and conventions for all AI coding tools
- **Feature-based Architecture**: Modular design using hook-app
- **Type Safety**: TypeScript with strict mode enabled
- **Testing**: Comprehensive setup with Vitest
- **Code Quality**: Biome for fast linting and formatting
- **Git Hooks**: Automated checks before commits
- **CI/CD**: GitHub Actions for continuous integration

## Prerequisites

- Node.js (version specified by package manager)
- pnpm 10.28.1 (specified as package manager)

## Getting Started

### Installation

```bash
pnpm install
```

### Development

Run the application in development mode with hot reload:

```bash
pnpm dev
```

### Building

Compile TypeScript to JavaScript:

```bash
pnpm build
```

### Running Production Build

```bash
pnpm start
```

## Project Structure

```
ai-friendly-boilerplate/
├── src/
│   ├── index.ts                    # Application entry point
│   └── features/                   # Feature modules
│       └── feature-example/        # Example feature implementation
│           └── index.ts
├── dist/                           # Compiled output (generated)
├── coverage/                       # Test coverage reports (generated)
├── .github/                        # GitHub configuration
├── .husky/                         # Git hooks
├── .vscode/                        # VSCode settings
├── AGENTS.md                       # AI assistant instructions
├── TASKS.md                        # Project task tracking
├── biome.json                      # Biome configuration
├── tsconfig.json                   # TypeScript configuration
├── tsconfig.build.json             # Build-specific TypeScript config
├── tsconfig.test.json              # Test-specific TypeScript config
├── vitest.config.ts                # Vitest configuration
├── .secretlintrc.json              # Secret scanning configuration
└── package.json                    # Project dependencies and scripts
```

## Available Scripts

### Development
- `pnpm dev` - Run application in development mode with tsx
- `pnpm build` - Compile TypeScript to JavaScript
- `pnpm start` - Run compiled application

### Testing
- `pnpm test` - Run tests once
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:ui` - Run tests with Vitest UI
- `pnpm test:coverage` - Generate test coverage report
- `pnpm test:bench` - Run benchmark tests

### Code Quality
- `pnpm type-check` - Run TypeScript type checking
- `pnpm lint` - Lint code with Biome
- `pnpm lint:fix` - Lint and auto-fix issues
- `pnpm format` - Format code with Biome
- `pnpm format:check` - Check code formatting
- `pnpm check` - Run type-check, tests, and linting all at once

### Git Hooks
- `pnpm prepare` - Set up Husky git hooks

## AI Agents

This project includes specialized AI agents that work with **any** AI coding assistant (Cursor, Claude Code, OpenCode, GitHub Copilot, etc.):

- **[Code Review Agent](.ai/agents/code-review.md)** - Review code for quality and conventions
- **[Testing Agent](.ai/agents/testing.md)** - Generate and maintain tests
- **[Documentation Agent](.ai/agents/documentation.md)** - Create and update documentation
- **[Architecture Agent](.ai/agents/architecture.md)** - Design and validate architecture
- **[Performance Agent](.ai/agents/performance.md)** - Optimize and improve performance
- **[Security Agent](.ai/agents/security.md)** - Identify and fix security issues

### Using AI Agents

Simply reference an agent when working with your AI assistant:

```
Use the testing agent to generate tests for src/features/calculator/add.ts
```

Or:

```
Follow the code review agent to review my staged changes
```

The agents provide detailed, step-by-step instructions that any AI assistant can follow. See [.ai/agents/README.md](.ai/agents/README.md) for comprehensive usage guide.

### Example Workflows

**Before committing code:**
```
Please follow the code review agent to review my staged changes
```

**Adding a new feature:**
```
1. Use the architecture agent to design the user notification feature
2. Use the testing agent to generate comprehensive tests
3. Use the documentation agent to document the new API
4. Use the security agent to review for vulnerabilities
```

**Improving performance:**
```
Follow the performance agent to optimize src/data/processor.ts
```

## Architecture

### Hook-App Framework

This project uses [@hook-app](https://www.npmjs.com/package/@hook-app) for a hook-based architecture that allows features to communicate through events.

### Features

Features are self-contained modules that register:
- **Hooks**: Custom events that features can emit
- **Actions**: Handlers that respond to hooks

Example feature structure (see `src/features/feature-example/`):

```typescript
export default ({ registerAction, registerHook }: RegisterContext) => {
  // Register custom hooks
  registerHook({ EXAMPLE_HOOK: 'feature-hook' });

  // Register actions for lifecycle hooks
  registerAction({
    hook: '$INIT_FEATURE',
    name: 'feature-name',
    handler: () => {
      // Initialization logic
    },
  });
};
```

### Lifecycle Hooks

- `$INIT_FEATURE` - Called when feature is being initialized
- `$START_FEATURE` - Called when feature starts (has access to full context)

## Adding a New Feature

1. Create a new directory under `src/features/`:
   ```bash
   mkdir src/features/my-feature
   ```

2. Create an `index.ts` file with your feature logic:
   ```typescript
   import type { RegisterContext } from '@hook-app';

   const FEATURE_NAME = 'my-feature';

   export default ({ registerAction, registerHook }: RegisterContext) => {
     registerAction({
       hook: '$INIT_FEATURE',
       name: FEATURE_NAME,
       handler: () => {
         console.log('[My Feature] Initializing...');
       },
     });
   };
   ```

3. Register the feature in `src/index.ts`:
   ```typescript
   import myFeature from './features/my-feature/index.js';

   hookApp({
     features: [featureExample, myFeature],
     // ... other config
   });
   ```


## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Vitest Documentation](https://vitest.dev/)
- [Biome Documentation](https://biomejs.dev/)
- [Hook App Documentation](https://www.npmjs.com/package/@hook-app)

## License

ISC
