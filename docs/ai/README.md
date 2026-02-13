# AI Agent Configuration

This project is configured to work seamlessly with all major AI coding assistants.

## Supported AI Tools

- **OpenCode** - Uses `AGENTS.md` + `opencode.json`
- **Any AI Agent** - Can read `AGENTS.md` for context

## Configuration Files

### Root Level

- **`AGENTS.md`** - Primary AI agent instructions (comprehensive, ~14KB)
  - Project overview and technology stack
  - Hook App framework guide with examples
  - Code standards and conventions
  - Common tasks and workflows
  - External documentation references

- **`opencode.json`** - OpenCode structured configuration
  - JSON schema for IDE support
  - References to detailed documentation files
  - Enables modular documentation loading

### GitHub Integration

- **`.github/copilot-instructions.md`** - GitHub Copilot instructions (~8KB)
  - Code completion patterns
  - Template structures
  - Best practices for inline suggestions

### Detailed Documentation

Located in `docs/ai/` for in-depth guidance:

- **`hook-app-guide.md`** (~18KB)
  - Complete Hook App framework documentation
  - Lifecycle hooks reference
  - All execution modes (sync, serie, parallel, waterfall)
  - Advanced patterns and best practices

- **`coding-standards.md`** (~15KB)
  - TypeScript strict mode requirements
  - Naming conventions for all elements
  - Import/export standards (ES modules with .js extensions)
  - Function patterns and error handling

- **`testing-guide.md`** (~17KB)
  - Vitest setup and usage
  - Test structure and patterns (AAA pattern)
  - Mocking and assertions
  - Coverage requirements

- **`architecture.md`** (~17KB)
  - Project structure explanation
  - Module organization (features vs services)
  - Data flow diagrams
  - Design patterns used

- **`common-tasks.md`** (~17KB)
  - Step-by-step guides for frequent operations
  - Adding features and services
  - Working with hooks, settings, and context
  - Debugging and troubleshooting

## How It Works

### For OpenCode

OpenCode reads:
1. `AGENTS.md` for primary context
2. `opencode.json` to load additional documentation:
   - `docs/ai/hook-app-guide.md`
   - `docs/ai/coding-standards.md`
   - `docs/ai/testing-guide.md`
   - `docs/ai/architecture.md`
   - `docs/ai/common-tasks.md`

This modular approach keeps documentation organized and maintainable.

### For Other AI Tools

Most AI coding assistants will read `AGENTS.md` as it follows common markdown documentation patterns.

## Benefits

### Universal Compatibility
Works with any AI coding tool that can read project context

### Modular Structure
Easy to update specific areas without touching everything

### Comprehensive Coverage
~120KB of documentation covering all aspects of the project

### Version Controlled
All configuration is in git, shared with team automatically

### Self-Documenting
The configuration files themselves serve as project documentation

## Maintenance

### When to Update

Update these files when:
- Hook App patterns change
- New coding standards are adopted
- New features or services are added
- Project structure changes
- New tools or technologies are integrated

### How to Update

1. **For high-level changes:** Update `AGENTS.md`
2. **For detailed guides:** Update specific files in `docs/ai/`
4. **Test changes:** Ask an AI assistant questions to verify they understand the updates

## Best Practices

1. **Keep AGENTS.md current** - It's the primary source for most AI tools
2. **Use docs/ai/ for details** - Keep documentation modular and focused
3. **Update examples** - When patterns change, update code examples
4. **Be specific** - Clear, actionable instructions work better than vague guidelines
5. **Test with AI** - Verify AI tools can understand and use the documentation

## Example Usage

After setting up this configuration, you can ask any AI coding assistant:

**"Add a new feature called user-profile that manages user profile data"**

The AI will:
1. Understand the Hook App framework
2. Follow TypeScript strict mode conventions
3. Use proper naming conventions (kebab-case)
4. Implement using RegisterContext pattern
5. Use `$INIT_FEATURE` and `$START_FEATURE` appropriately
6. Create test files following Vitest patterns
7. Register the feature properly in src/index.ts

## Additional Resources

- Hook App Framework: https://github.com/hook-app
- Example Feature: `src/features/feature-example/index.ts`
- Project README: `README.md`

## Questions?

If you're unsure about any configuration:
1. Check the relevant file in `docs/ai/`
2. Review example implementations in `src/`
3. Ask an AI assistant (they now have comprehensive context!)
