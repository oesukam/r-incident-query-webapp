# Testing Guide

## Overview

This project uses Jest with React Testing Library for unit and integration testing.

## Running Tests

```bash
# Run all tests
yarn test

# Run tests in watch mode (for development)
yarn test:watch

# Run tests with coverage report
yarn test:cov

# Run tests for CI (optimized for CI environments)
yarn test:ci
```

## Test Structure

Tests are located in the `__tests__` directory, organized by folder structure:

```
__tests__/
├── lib/              # Tests for utility functions
│   ├── logger.test.ts
│   └── utils.test.ts
└── components/       # Tests for React components
    └── Button.test.tsx
```

## Writing Tests

### Basic Component Test

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();

    render(<MyComponent onClick={handleClick} />);

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### Utility Function Test

```typescript
import { myUtility } from '@/lib/utils';

describe('myUtility', () => {
  it('should process input correctly', () => {
    const result = myUtility('input');
    expect(result).toBe('expected output');
  });
});
```

## Test Coverage

Coverage reports are generated when running `yarn test:cov`. The reports are saved in the `coverage/` directory.

Current coverage thresholds:
- Statements: 1%
- Branches: 1%
- Functions: 1%
- Lines: 1%

## Mocks and Setup

Global test setup is configured in `jest.setup.ts`:

- **Next.js Router**: Mocked automatically
- **Window.matchMedia**: Mocked for responsive components
- **IntersectionObserver**: Mocked for lazy loading
- **Console**: Error and warn suppressed in tests

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the component does, not how it does it
2. **Use Testing Library Queries**: Prefer queries like `getByRole` over `querySelector`
3. **Avoid Testing Implementation Details**: Don't test internal state or private methods
4. **Keep Tests Simple**: One assertion per test when possible
5. **Use Descriptive Test Names**: Test names should describe what they're testing

## Debugging Tests

```bash
# Run a specific test file
yarn test Button.test.tsx

# Run tests matching a pattern
yarn test --testNamePattern="should render"

# Run with verbose output
yarn test --verbose
```

## CI/CD Integration

Tests run automatically in CI using:

```bash
yarn test:ci
```

This command:
- Runs in CI mode (no watch, single run)
- Generates coverage reports
- Uses limited workers (2) for better CI performance
