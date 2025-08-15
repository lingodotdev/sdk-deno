# Contributing to Lingo.dev Deno SDK

Thank you for your interest in contributing to the Lingo.dev Deno SDK! We welcome contributions from the community.

## Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/sdk-deno.git
   cd sdk-deno
   ```

2. **Install Deno**
   ```bash
   # Install Deno if you haven't already
   curl -fsSL https://deno.land/install.sh | sh
   ```

3. **Verify Setup**
   ```bash
   deno task check
   deno task test
   ```

## Development Workflow

### Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   # Format code
   deno task fmt

   # Lint code
   deno task lint

   # Type check
   deno task check

   # Run tests
   deno task test

   # Test JSR configuration
   deno publish --dry-run
   ```

4. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**
   - Use a descriptive title
   - Explain what your changes do
   - Link any related issues

### Code Style

- Use TypeScript for all new code
- Follow Deno's formatting standards (`deno fmt`)
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions focused and small

### Testing

- Add unit tests for all new functionality
- Tests should be in the `tests/` directory
- Use descriptive test names
- Mock external dependencies
- Ensure all tests pass before submitting

### Documentation

- Update README.md for new features
- Add JSDoc comments for public APIs
- Include usage examples
- Update type definitions if needed

## Pull Request Guidelines

### Before Submitting

- [ ] All tests pass
- [ ] Code is formatted (`deno fmt`)
- [ ] Code passes linting (`deno lint`)
- [ ] TypeScript compilation succeeds
- [ ] Documentation is updated
- [ ] Examples work correctly

### PR Requirements

1. **Descriptive Title**: Use conventional commit format
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `chore:` for maintenance tasks

2. **Clear Description**: Explain what the PR does and why

3. **Linked Issues**: Reference any related issues

4. **Breaking Changes**: Clearly document any breaking changes

## Types of Contributions

### Bug Reports

When reporting bugs, please include:

- Deno version
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Code samples (if applicable)

### Feature Requests

For new features:

- Describe the use case
- Explain why it would be valuable
- Consider implementation complexity
- Check if it fits the SDK's scope

### Documentation

Documentation improvements are always welcome:

- Fix typos or unclear explanations
- Add examples
- Improve API documentation
- Update setup instructions

## Development Environment

### Required Tools

- Deno 1.x or 2.x
- Git
- Text editor with TypeScript support

### Recommended VS Code Extensions

- Deno (official Deno extension)
- TypeScript and JavaScript Language Features

### Environment Variables

For testing:

```bash
export LINGO_API_KEY="your-test-api-key"
```

## Release Process

Releases are handled automatically:

1. **Version Bumps**: Use GitHub Actions "Version Bump" workflow
2. **Automated Testing**: All changes are tested in CI
3. **Publishing**: Automatic to JSR and Deno Land
4. **Documentation**: README and examples are automatically updated

## Getting Help

- **Documentation**: [docs.lingo.dev](https://docs.lingo.dev)
- **Discord**: [Join our community](https://discord.gg/lingo-dev)
- **Issues**: [GitHub Issues](https://github.com/lingodotdev/sdk-deno/issues)
- **Email**: [support@lingo.dev](mailto:support@lingo.dev)

## Code of Conduct

Please be respectful and inclusive in all interactions. We're building a welcoming community for developers worldwide.

## License

By contributing, you agree that your contributions will be licensed under the `Apache License 2.0`.
