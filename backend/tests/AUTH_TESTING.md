# ISKOlarship Authentication Testing Guide

## Overview

The authentication system has been verified to work correctly. This document provides test credentials and instructions for testing the registration and login functionality.

## Profile Update Testing

### Running Profile Update Tests

The profile update functionality for both Student and Admin accounts has been thoroughly tested. Run the tests with:

```bash
cd backend
node tests/profile-update.test.js
```

### Test Coverage (34 Tests)

**Student Profile Tests (17 tests):**
- ✓ Login authentication
- ✓ Fetch current profile
- ✓ Update basic info (firstName, lastName)
- ✓ Update academic info (GWA, classification)
- ✓ Update financial info (income, householdSize, stBracket)
- ✓ Update address info (homeAddress)
- ✓ Update boolean fields (hasExistingScholarship, etc.)
- ✓ Full profile update with all fields
- ✓ Profile completeness check

**Admin Profile Tests (12 tests):**
- ✓ Login authentication
- ✓ Fetch current profile
- ✓ Update basic info (firstName, lastName)
- ✓ Update department info (department, position, college)
- ✓ Update office info (officeLocation, responsibilities)
- ✓ Update address info
- ✓ Full profile update

**Error Handling Tests (3 tests):**
- ✓ Reject unauthenticated updates (401)
- ✓ Reject invalid GWA values
- ✓ Reject invalid household size

**Concurrent Update Tests (2 tests):**
- ✓ Handle multiple rapid updates
- ✓ Profile consistency after concurrent updates

### Test Accounts for Profile Testing

| Email | Password | Role |
|-------|----------|------|
| `testprofile@up.edu.ph` | `Test123!` | Student |
| `testadmin@up.edu.ph` | `Test123!` | Admin |

## Test Credentials

### Test Accounts (Recommended for Testing)

| Email | Password | Role |
|-------|----------|------|
| `student@test.com` | `Student123!` | Student |
| `admin@test.com` | `Admin123!` | Admin |

### Existing User Accounts

All existing user accounts have been reset to use the same password:

**Password: `Test1234!`**

| Email | Role |
|-------|------|
| `admin@iskolarship.uplb.edu.ph` | Admin |
| `cafs.admin@iskolarship.uplb.edu.ph` | Admin |
| `osfa.admin@iskolarship.uplb.edu.ph` | Admin |
| `imahuman@up.edu.ph` | Student |
| `tambourineman@up.edu.ph` | Student |
| `imgreat@up.edu.ph` | Student |
| `markneilautriz@up.edu.ph` | Student |
| And more... | - |

## Password Requirements

When creating new accounts, passwords must meet these requirements:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

Example valid passwords:
- `Password123`
- `Test1234!`
- `MySecure1Password`

## Testing Instructions

### Prerequisites

1. **Start the Backend Server**
   ```bash
   cd ISKOlarship/backend
   npm run dev
   ```
   The backend runs on `http://localhost:5001`

2. **Start the Frontend Server**
   ```bash
   cd ISKOlarship/frontend
   npm run dev
   ```
   The frontend runs on `http://localhost:5173`

### Test Login Flow

1. Open `http://localhost:5173` in your browser
2. Click "Sign In" button in the header
3. Select "Student" or "Administrator" tab
4. Enter credentials:
   - For student: `student@test.com` / `Student123!`
   - For admin: `admin@test.com` / `Admin123!`
5. Click "Sign In"

### Test Registration Flow

1. Open `http://localhost:5173` in your browser
2. Click "Sign In" button in the header
3. Click "Sign Up" tab
4. Enter a unique email (e.g., `yourname@example.com`)
5. Enter a password that meets the requirements (e.g., `Password123`)
6. Confirm your password
7. Click "Sign Up"
8. Complete the profile form

## API Endpoints

### Register
```
POST http://localhost:5001/api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student"
}
```

### Login
```
POST http://localhost:5001/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123"
}
```

### Get Current User
```
GET http://localhost:5001/api/auth/me
Authorization: Bearer <accessToken>
```

### Logout
```
POST http://localhost:5001/api/auth/logout
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "refreshToken": "<refreshToken>"
}
```

## Troubleshooting

### "Invalid credentials" error
- Make sure you're using the correct password
- Check that the email matches an existing account
- For existing accounts, the password is `Test1234!`

### "User not found" error
- The email doesn't exist in the database
- Try registering a new account first

### "Password must contain uppercase, lowercase, and number"
- Ensure your password has at least one uppercase letter (A-Z)
- Ensure your password has at least one lowercase letter (a-z)
- Ensure your password has at least one number (0-9)

### Network/CORS errors
1. Make sure the backend server is running on port 5001
2. Make sure the frontend is running on port 5173 or 3000
3. Check browser console for specific error messages

## Utility Scripts

### Reset All Passwords
To reset all passwords to known values:
```bash
cd ISKOlarship/backend
node scripts/reset-passwords.js
```

### Test Authentication
To run automated authentication tests:
```bash
cd ISKOlarship/backend
node scripts/test-auth.js
```

### Test API Endpoints
To test API endpoints directly:
```bash
cd ISKOlarship/backend
node scripts/test-api-endpoints.js
```

## Architecture Summary

### Backend (Express.js + MongoDB)
- `/src/routes/auth.routes.js` - Authentication endpoints
- `/src/models/User.model.js` - User schema with bcrypt password hashing
- `/src/middleware/auth.middleware.js` - JWT verification

### Frontend (React + TypeScript)
- `/src/services/apiClient.ts` - Axios API client with token management
- `/src/components/AuthModal.tsx` - Login/Signup modal
- `/src/App.tsx` - Authentication state management

### Security Features
- Passwords hashed with bcrypt (12 salt rounds)
- JWT access tokens (7 day expiry)
- JWT refresh tokens (30 day expiry)
- Automatic token refresh on 401 responses
- Tokens stored in localStorage
