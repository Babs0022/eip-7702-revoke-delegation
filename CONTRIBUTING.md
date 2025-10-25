# Contributing to EIP-7702 Revoke Delegation

Thank you for your interest in contributing to the EIP-7702 Revoke Delegation project! We welcome contributions from the community and appreciate your efforts to improve this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Guidelines](#development-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)
- [Security Considerations](#security-considerations)
- [Recognition](#recognition)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors. We pledge to:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

Unacceptable behaviors include:

- Harassment, intimidation, or discrimination in any form
- Offensive comments related to gender, sexual orientation, disability, physical appearance, race, or religion
- Posting others' private information without permission
- Any conduct which could reasonably be considered inappropriate in a professional setting

## How to Contribute

### Reporting Issues

- Use the GitHub issue tracker to report bugs or request features
- Search existing issues before creating a new one to avoid duplicates
- Provide detailed information including:
  - Steps to reproduce the issue
  - Expected vs. actual behavior
  - Environment details (OS, Node.js version, etc.)
  - Relevant logs or error messages

### Suggesting Enhancements

- Open an issue with the "enhancement" label
- Clearly describe the proposed feature and its benefits
- Provide use cases and examples if possible
- Discuss implementation approaches

### Contributing Code

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes following our development guidelines
4. Write or update tests as needed
5. Ensure all tests pass
6. Submit a pull request

## Development Guidelines

### TypeScript Standards

#### Code Style

- Use TypeScript strict mode
- Follow consistent naming conventions:
  - `camelCase` for variables and functions
  - `PascalCase` for classes and types
  - `UPPER_SNAKE_CASE` for constants
- Prefer `const` over `let`, avoid `var`
- Use explicit types; avoid `any` unless absolutely necessary

#### Type Safety

```typescript
// Good
interface DelegationParams {
  delegatee: Address;
  nonce: bigint;
  chainId: number;
}

function createDelegation(params: DelegationParams): Authorization {
  // Implementation
}

// Avoid
function createDelegation(params: any) {
  // Implementation
}
```

#### Error Handling

- Use proper error handling with try-catch blocks
- Create custom error types for specific error cases
- Provide meaningful error messages

```typescript
try {
  await revokeDelegation(params);
} catch (error) {
  if (error instanceof RevokeError) {
    console.error('Revocation failed:', error.message);
  }
  throw error;
}
```

#### Documentation

- Add JSDoc comments for all public functions and classes
- Document parameters, return types, and thrown errors
- Include usage examples for complex functions

```typescript
/**
 * Revokes an EIP-7702 delegation authorization
 * @param authorization - The authorization object to revoke
 * @param account - The private key account performing the revocation
 * @returns Transaction hash of the revocation transaction
 * @throws {RevokeError} If the revocation fails
 */
async function revokeDelegation(
  authorization: Authorization,
  account: PrivateKeyAccount
): Promise<Hash> {
  // Implementation
}
```

#### File Organization

- Keep files focused and modular
- Separate concerns (e.g., types, utilities, core logic)
- Use index files for cleaner imports
- Follow the existing project structure

### Code Quality

- Run `npm run lint` to check for linting errors
- Run `npm run format` to format code consistently
- Ensure no TypeScript compilation errors
- Write self-documenting code with clear variable names

## Pull Request Process

### Conventional Commits Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages:

#### Commit Message Structure

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes only
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without changing functionality
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates, etc.
- `ci`: CI/CD configuration changes

#### Examples

```
feat: add support for batch delegation revocation

fix(delegate): resolve nonce calculation error

docs: update README with new examples

test: add unit tests for revoke functionality

refactor: simplify authorization signature logic

chore: update viem dependency to v2.x
```

#### Breaking Changes

For breaking changes, add `BREAKING CHANGE:` in the footer:

```
feat!: change revokeDelegation API signature

BREAKING CHANGE: revokeDelegation now requires chainId parameter
```

### Pull Request Guidelines

1. **Title**: Use conventional commit format
2. **Description**: 
   - Explain the changes and their purpose
   - Reference related issues (e.g., "Closes #123")
   - Include screenshots for UI changes
   - List any breaking changes
3. **Checklist**:
   - [ ] Code follows TypeScript standards
   - [ ] Tests pass locally
   - [ ] Documentation is updated
   - [ ] Commit messages follow conventional commits format
   - [ ] No breaking changes (or properly documented)
4. **Review**: Address reviewer feedback promptly and professionally
5. **Squash**: Maintainers may squash commits before merging

## Testing Guidelines

### Writing Tests

- Write tests for all new features and bug fixes
- Use descriptive test names that explain what is being tested
- Follow the AAA pattern: Arrange, Act, Assert
- Mock external dependencies appropriately

#### Test Structure

```typescript
describe('revokeDelegation', () => {
  it('should successfully revoke a valid delegation', async () => {
    // Arrange
    const authorization = createTestAuthorization();
    const account = createTestAccount();
    
    // Act
    const txHash = await revokeDelegation(authorization, account);
    
    // Assert
    expect(txHash).toBeDefined();
    expect(txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });
  
  it('should throw error when revocation fails', async () => {
    // Arrange
    const invalidAuth = createInvalidAuthorization();
    const account = createTestAccount();
    
    // Act & Assert
    await expect(revokeDelegation(invalidAuth, account)).rejects.toThrow();
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Test Coverage

- Aim for at least 80% code coverage
- Focus on critical paths and edge cases
- Don't sacrifice test quality for coverage numbers

## Security Considerations

### Private Key Handling

- **Never** commit private keys or mnemonics
- Use environment variables for sensitive data
- Document required environment variables in `.env.example`
- Use `.gitignore` to exclude sensitive files

### Smart Contract Interactions

- Validate all inputs before signing transactions
- Use appropriate gas limits to prevent stuck transactions
- Handle transaction failures gracefully
- Test on testnets before mainnet deployment

### Dependency Security

- Keep dependencies up to date
- Run `npm audit` regularly to check for vulnerabilities
- Review dependency changes before updating
- Use exact versions in `package.json` for production dependencies

### Reporting Security Vulnerabilities

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Email the maintainer privately with details
3. Wait for acknowledgment before disclosing publicly
4. We will work with you to address the issue promptly

## Recognition

### Contributors

We value all contributions and recognize our contributors in the following ways:

- All contributors are listed in the repository's contributor graph
- Significant contributions are highlighted in release notes
- Major contributors may be added to the README acknowledgments section

### Types of Contributions We Recognize

- **Code**: Features, bug fixes, refactoring
- **Documentation**: README updates, guides, examples
- **Testing**: Writing tests, reporting bugs
- **Design**: UI/UX improvements, diagrams
- **Ideas**: Feature suggestions, architectural improvements
- **Community**: Answering questions, helping other contributors

### Hall of Fame

Outstanding contributors who make significant long-term contributions may be recognized with:

- Maintainer or collaborator status
- Special mentions in project communications
- Opportunities to present the project at conferences or events

## Questions?

If you have questions about contributing:

- Check existing issues and discussions
- Open a new issue with the "question" label
- Reach out to the maintainers

Thank you for contributing to EIP-7702 Revoke Delegation! Your efforts help make this project better for everyone.

---

*Last updated: October 2025*
