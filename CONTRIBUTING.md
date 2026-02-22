# Contributing to ISKOlarship

Thank you for your interest in contributing to ISKOlarship! This document provides guidelines and instructions for contributing to the project.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Commit Guidelines](#commit-guidelines)
6. [Pull Request Process](#pull-request-process)
7. [Issue Guidelines](#issue-guidelines)
8. [Testing](#testing)
9. [Documentation](#documentation)

---

## Code of Conduct

### Our Pledge

We are committed to making participation in this project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes:**
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate

---

## Getting Started

### Prerequisites

1. **Fork the repository** to your GitHub account
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/ISKOlarship.git
   cd ISKOlarship
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/original-owner/ISKOlarship.git
   ```
4. **Install dependencies**:
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```
5. **Set up environment** - See [INSTALLATION.md](docs/INSTALLATION.md)

### Project Structure Overview

```
ISKOlarship/
├── backend/           # Express.js API server
│   ├── src/
│   │   ├── middleware/  # Express middleware
│   │   ├── models/      # Mongoose schemas
│   │   ├── routes/      # API endpoints
│   │   └── services/    # Business logic
│   └── tests/           # Backend tests
├── frontend/          # React + TypeScript frontend
│   └── src/
│       ├── components/  # React components
│       ├── pages/       # Page components
│       ├── services/    # API clients
│       └── types/       # TypeScript types
└── docs/              # Documentation
```

---

## Development Workflow

### Branching Strategy

We follow a simplified Git Flow:

```
main (production)
  │
  └── develop (integration)
        │
        ├── feature/feature-name
        ├── fix/bug-description
        └── docs/documentation-update
```

### Branch Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/short-description` | `feature/add-email-verification` |
| Bug Fix | `fix/short-description` | `fix/login-token-expiry` |
| Documentation | `docs/short-description` | `docs/update-api-reference` |
| Refactor | `refactor/short-description` | `refactor/prediction-service` |
| Test | `test/short-description` | `test/add-auth-tests` |

### Workflow Steps

1. **Sync with upstream**:
   ```bash
   git checkout main
   git fetch upstream
   git merge upstream/main
   ```

2. **Create feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make changes** and commit frequently

4. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request** to `upstream/develop`

---

## Coding Standards

### JavaScript/Node.js (Backend)

```javascript
// Use ES6+ features
const { something } = require('./module');

// Use async/await over callbacks
async function fetchData() {
  try {
    const result = await Model.find();
    return result;
  } catch (error) {
    throw new Error(`Failed to fetch: ${error.message}`);
  }
}

// Use descriptive variable names
const scholarshipApplications = await Application.find();

// Document functions with JSDoc
/**
 * Calculates eligibility score for a student
 * @param {Object} student - Student profile object
 * @param {Object} scholarship - Scholarship requirements
 * @returns {Object} Eligibility result with score and details
 */
function calculateEligibility(student, scholarship) {
  // Implementation
}
```

### TypeScript/React (Frontend)

```typescript
// Use TypeScript interfaces
interface User {
  id: string;
  email: string;
  role: 'student' | 'admin';
  profile: StudentProfile | AdminProfile;
}

// Use functional components with hooks
const ScholarshipCard: React.FC<ScholarshipCardProps> = ({ scholarship }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="scholarship-card">
      {/* Component content */}
    </div>
  );
};

// Use custom hooks for shared logic
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### Style Guidelines

| Category | Rule |
|----------|------|
| Indentation | 2 spaces |
| Quotes | Single quotes for JS/TS |
| Semicolons | Required |
| Trailing commas | ES5 compatible |
| Line length | Max 100 characters |
| File naming | `kebab-case.js` or `PascalCase.tsx` |

### ESLint Configuration

The project uses ESLint. Run before committing:

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code change that neither fixes nor adds |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `chore` | Maintenance tasks |

### Examples

```bash
# Feature
feat(auth): add email verification flow

# Bug fix
fix(prediction): correct GWA normalization formula

# Documentation
docs(api): update scholarship endpoints documentation

# With body and footer
feat(ocr): implement document verification service

- Add Google Cloud Vision integration
- Create OCR extraction for transcripts
- Add field comparison logic

Closes #123
```

### Commit Best Practices

- **Atomic commits**: Each commit should represent one logical change
- **Present tense**: "Add feature" not "Added feature"
- **Imperative mood**: "Fix bug" not "Fixes bug"
- **No period** at the end of subject line
- **Body**: Explain *what* and *why*, not *how*

---

## Pull Request Process

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Documentation updated if needed
- [ ] Commit messages follow convention
- [ ] Branch is up-to-date with `develop`

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update

## How Has This Been Tested?
Describe testing approach

## Checklist
- [ ] My code follows the project style guidelines
- [ ] I have performed a self-review
- [ ] I have commented hard-to-understand code
- [ ] I have updated documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests for my changes
- [ ] All tests pass locally

## Related Issues
Closes #(issue number)
```

### Review Process

1. **Automated checks** must pass (CI/CD)
2. **Code review** by at least one maintainer
3. **Address feedback** via additional commits
4. **Squash and merge** when approved

---

## Issue Guidelines

### Bug Reports

Use the bug report template:

```markdown
**Describe the bug**
Clear description of the bug

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen

**Screenshots**
If applicable

**Environment:**
- OS: [e.g., macOS 14.0]
- Browser: [e.g., Chrome 120]
- Node.js: [e.g., 20.10.0]

**Additional context**
Any other information
```

### Feature Requests

```markdown
**Is your feature request related to a problem?**
Description of the problem

**Describe the solution you'd like**
What you want to happen

**Describe alternatives you've considered**
Other solutions you've thought about

**Additional context**
Any other information or screenshots
```

### Labels

| Label | Description |
|-------|-------------|
| `bug` | Something isn't working |
| `enhancement` | New feature or request |
| `documentation` | Documentation improvements |
| `good first issue` | Good for newcomers |
| `help wanted` | Extra attention needed |
| `priority: high` | Urgent issues |
| `priority: low` | Nice to have |

---

## Testing

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Run specific test file
npm test -- auth.test.js

# Run with coverage
npm test -- --coverage

# Frontend (if implemented)
cd frontend
npm test
```

### Writing Tests

```javascript
// Example test structure
describe('Prediction Service', () => {
  describe('calculateEligibility', () => {
    it('should return eligible when all criteria met', async () => {
      // Arrange
      const student = createMockStudent({ gwa: 1.5 });
      const scholarship = createMockScholarship({ maxGWA: 2.0 });
      
      // Act
      const result = await calculateEligibility(student, scholarship);
      
      // Assert
      expect(result.eligible).toBe(true);
      expect(result.score).toBeGreaterThan(0);
    });

    it('should return ineligible when GWA exceeds maximum', async () => {
      const student = createMockStudent({ gwa: 2.5 });
      const scholarship = createMockScholarship({ maxGWA: 2.0 });
      
      const result = await calculateEligibility(student, scholarship);
      
      expect(result.eligible).toBe(false);
    });
  });
});
```

### Test Coverage Goals

| Category | Target |
|----------|--------|
| Statements | > 80% |
| Branches | > 75% |
| Functions | > 80% |
| Lines | > 80% |

---

## Documentation

### When to Update Docs

- Adding new API endpoints → Update `API_REFERENCE.md`
- Changing installation steps → Update `INSTALLATION.md`
- Architectural changes → Update `ARCHITECTURE.md`
- Database schema changes → Update `DATABASE_SCHEMA.md`
- New features → Update `README.md` features section

### Documentation Style

- **Clear and concise** language
- **Code examples** where applicable
- **Tables** for structured information
- **Diagrams** for complex flows (use Mermaid or ASCII)
- **Keep up-to-date** with code changes

### In-Code Documentation

```javascript
/**
 * Service for managing scholarship predictions using logistic regression.
 * 
 * @module predictionService
 * @see {@link ../docs/ML_PREDICTION_FACTORS.md} for algorithm details
 */

/**
 * Calculates the approval probability for a student-scholarship pair.
 * 
 * @param {Object} student - Student profile with academic and financial info
 * @param {Object} scholarship - Scholarship with eligibility requirements
 * @param {Object} [options] - Optional parameters
 * @param {boolean} [options.useGlobalModel=false] - Force use of global model
 * @returns {Promise<PredictionResult>} Prediction with probability and breakdown
 * 
 * @example
 * const prediction = await calculateProbability(student, scholarship);
 * console.log(prediction.probability); // 72.5
 */
async function calculateProbability(student, scholarship, options = {}) {
  // Implementation
}
```

---

## Questions?

- **General questions**: Open a [Discussion](https://github.com/your-username/ISKOlarship/discussions)
- **Bug reports**: Open an [Issue](https://github.com/your-username/ISKOlarship/issues)
- **Email**: Contact maintainers at [email]

---

Thank you for contributing to ISKOlarship! Your efforts help make scholarship management more accessible for UPLB students. 🎓
