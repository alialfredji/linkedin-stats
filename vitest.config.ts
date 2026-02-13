import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Test file patterns
    include: ['**/*.{test,spec}.{ts,tsx,mts,cts}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/*.bench.{ts,tsx,mts,cts}',
    ],

    // In-source testing configuration
    includeSource: ['src/**/*.{ts,tsx,mts,cts}'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.{js,ts,mjs,cjs}',
        '**/*.d.ts',
        '**/types/**',
        '**/*.test.{ts,tsx,mts,cts}',
        '**/*.spec.{ts,tsx,mts,cts}',
        '**/*.bench.{ts,tsx,mts,cts}',
        '**/__tests__/**',
        '**/__mocks__/**',
      ],
      // 80% coverage thresholds (standard)
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },

    // Globals (optional, but convenient for testing)
    globals: true,

    // Benchmark configuration
    benchmark: {
      include: ['**/*.bench.{ts,tsx,mts,cts}'],
    },

    // Reporter configuration
    reporters: ['verbose'],

    // Type checking
    typecheck: {
      enabled: false, // Use tsc for type checking, not vitest
    },
  },

  // Define configuration for in-source testing
  define: {
    'import.meta.vitest': 'undefined',
  },
});
