# ISKOlarship Installation Guide

> Complete guide for setting up ISKOlarship in development and production environments.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Setup](#detailed-setup)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [External Services](#external-services)
7. [Development Workflow](#development-workflow)
8. [Production Deployment](#production-deployment)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Minimum Version | Recommended | Check Command |
|----------|----------------|-------------|---------------|
| Node.js | 18.0.0 | 20.x LTS | `node --version` |
| npm | 9.0.0 | 10.x | `npm --version` |
| MongoDB | 6.0 | 7.x / Atlas | `mongod --version` |
| Git | 2.30 | Latest | `git --version` |

### Optional (for full features)

| Service | Purpose | Required For |
|---------|---------|--------------|
| Cloudinary Account | Document storage | File uploads |
| Google Cloud Account | OCR processing | Document verification |
| Gmail Account | Email notifications | Email features |

---

## Quick Start

For a quick local development setup:

```bash
# 1. Clone the repository
git clone https://github.com/your-username/ISKOlarship.git
cd ISKOlarship

# 2. Run the setup script
chmod +x setup.sh
./setup.sh

# 3. Start development servers
npm run dev
```

The setup script will:
- Install all dependencies
- Create environment files from templates
- Prompt for required configuration values
- Seed the database with sample data

---

## Detailed Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-username/ISKOlarship.git
cd ISKOlarship
```

### Step 2: Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

### Step 3: Configure Environment Variables

#### Backend Configuration

Create `backend/.env`:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your values:

```env
# =============================================================================
# SERVER CONFIGURATION
# =============================================================================
PORT=3001
NODE_ENV=development

# =============================================================================
# DATABASE
# =============================================================================
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/iskolaship

# OR MongoDB Atlas (recommended for production)
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/iskolaship?retryWrites=true&w=majority

# =============================================================================
# AUTHENTICATION
# =============================================================================
# Generate a secure secret: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-token-secret-change-in-production
JWT_EXPIRES_IN=30m
JWT_REFRESH_EXPIRES_IN=30d

# =============================================================================
# FRONTEND URL (for CORS and email links)
# =============================================================================
FRONTEND_URL=http://localhost:5173

# =============================================================================
# CLOUDINARY (Document Storage)
# =============================================================================
# Get credentials from: https://cloudinary.com/console
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# =============================================================================
# GOOGLE CLOUD VISION (OCR)
# =============================================================================
# Get credentials from: https://console.cloud.google.com
# Create a service account and download JSON key
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# =============================================================================
# EMAIL (Nodemailer)
# =============================================================================
# For Gmail, use an App Password: https://myaccount.google.com/apppasswords
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=ISKOlarship <noreply@iskolaship.com>
```

#### Frontend Configuration

Create `frontend/.env`:

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001/api
```

### Step 4: Start MongoDB (Local Development)

If using local MongoDB:

**macOS (Homebrew):**
```bash
brew services start mongodb-community
```

**Ubuntu/Debian:**
```bash
sudo systemctl start mongod
```

**Windows:**
```bash
net start MongoDB
```

**Using Docker:**
```bash
docker run -d -p 27017:27017 --name iskolaship-mongo mongo:7
```

### Step 5: Seed the Database (Optional)

Populate the database with sample data:

```bash
cd backend
npm run seed
```

This creates:
- Sample scholarships
- Test user accounts
- UPLB organizational structure

### Step 6: Start Development Servers

From the root directory:

```bash
# Start both frontend and backend concurrently
npm run dev

# OR start them separately:

# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Step 7: Access the Application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001/api |
| Health Check | http://localhost:3001/api/health |

---

## Environment Configuration

### Development vs Production

| Variable | Development | Production |
|----------|-------------|------------|
| `NODE_ENV` | `development` | `production` |
| `MONGODB_URI` | Local or Atlas | MongoDB Atlas |
| `JWT_SECRET` | Any string | Strong random string |
| `FRONTEND_URL` | `http://localhost:5173` | `https://yourdomain.com` |

### Generating Secure Secrets

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Database Setup

### Option 1: Local MongoDB

1. Install MongoDB Community Edition:
   - **macOS**: `brew install mongodb-community`
   - **Ubuntu**: Follow [MongoDB Ubuntu Guide](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/)
   - **Windows**: Download from [MongoDB Download Center](https://www.mongodb.com/try/download/community)

2. Start MongoDB service

3. Use connection string: `mongodb://localhost:27017/iskolaship`

### Option 2: MongoDB Atlas (Recommended for Production)

1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

2. Create a new cluster (free tier available)

3. Configure network access:
   - Add your IP address
   - Or allow access from anywhere (0.0.0.0/0) for development

4. Create database user with password

5. Get connection string and add to `.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/iskolaship?retryWrites=true&w=majority
   ```

### Database Indexes

Important indexes are created automatically by Mongoose schemas. For manual optimization:

```javascript
// Connect to MongoDB shell
mongosh "your-connection-string"

// Create indexes
use iskolaship

db.users.createIndex({ email: 1 }, { unique: true })
db.applications.createIndex({ applicant: 1, scholarship: 1 })
db.applications.createIndex({ status: 1 })
db.scholarships.createIndex({ status: 1, applicationDeadline: 1 })
```

---

## External Services

### Cloudinary Setup

1. Create account at [Cloudinary](https://cloudinary.com)

2. Go to Dashboard → Settings → Access Keys

3. Copy credentials to `.env`:
   ```
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=123456789012345
   CLOUDINARY_API_SECRET=your-api-secret
   ```

4. Create upload preset (optional):
   - Go to Settings → Upload
   - Create preset named `iskolaship_documents`
   - Set folder to `iskolaship/documents`

### Google Cloud Vision Setup

1. Create project at [Google Cloud Console](https://console.cloud.google.com)

2. Enable Cloud Vision API:
   - Go to APIs & Services → Library
   - Search "Cloud Vision API"
   - Click Enable

3. Create service account:
   - Go to IAM & Admin → Service Accounts
   - Create new service account
   - Grant role "Cloud Vision API User"
   - Create JSON key

4. Extract credentials from JSON key file:
   ```
   GOOGLE_CLOUD_PROJECT_ID=your-project-id
   GOOGLE_CLOUD_CLIENT_EMAIL=name@project.iam.gserviceaccount.com
   GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

### Gmail SMTP Setup

1. Enable 2-Factor Authentication on Gmail

2. Generate App Password:
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Navigate to App passwords
   - Generate password for "Mail"

3. Configure `.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   ```

---

## Development Workflow

### Available Scripts

**Root directory:**
```bash
npm run dev          # Start both frontend and backend
npm run dev:backend  # Start backend only
npm run dev:frontend # Start frontend only
```

**Backend (`/backend`):**
```bash
npm start            # Start production server
npm run dev          # Start with nodemon (hot reload)
npm run seed         # Seed database
npm test             # Run tests
```

**Frontend (`/frontend`):**
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Code Style

The project uses:
- ESLint for JavaScript/TypeScript linting
- Prettier for code formatting (recommended)

```bash
# Install Prettier globally
npm install -g prettier

# Format all files
prettier --write "**/*.{js,ts,tsx,json,md}"
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/your-feature-name
```

---

## Production Deployment

### Railway (Backend)

1. Connect GitHub repository to Railway

2. Set root directory to `/backend` or use `railway.json`

3. Add environment variables in Railway dashboard

4. Railway will auto-deploy on push to `main`

**Configuration files:**
- `railway.json` - Railway-specific settings
- `nixpacks.toml` - Build configuration
- `Procfile` - Process definition

### Vercel (Frontend)

1. Connect GitHub repository to Vercel

2. Configure project:
   - Framework Preset: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. Add environment variables:
   ```
   VITE_API_URL=https://your-backend-url.railway.app/api
   ```

4. Vercel will auto-deploy on push to `main`

### Environment Variables Checklist

**Production Backend:**
- [ ] `NODE_ENV=production`
- [ ] `MONGODB_URI` (Atlas connection string)
- [ ] `JWT_SECRET` (strong random string)
- [ ] `JWT_REFRESH_SECRET` (strong random string)
- [ ] `FRONTEND_URL` (production frontend URL)
- [ ] `CLOUDINARY_*` credentials
- [ ] `GOOGLE_CLOUD_*` credentials
- [ ] `SMTP_*` credentials

**Production Frontend:**
- [ ] `VITE_API_URL` (production backend URL)

---

## Troubleshooting

### Common Issues

#### MongoDB Connection Failed

```
Error: MongooseServerSelectionError: connect ECONNREFUSED
```

**Solutions:**
1. Check if MongoDB is running: `mongosh`
2. Verify connection string in `.env`
3. Check network access if using Atlas

#### CORS Errors

```
Access to XMLHttpRequest blocked by CORS policy
```

**Solutions:**
1. Verify `FRONTEND_URL` in backend `.env`
2. Check CORS configuration in `server.js`
3. Ensure frontend is using correct API URL

#### JWT Token Errors

```
Error: JsonWebTokenError: invalid signature
```

**Solutions:**
1. Verify `JWT_SECRET` matches in both environments
2. Clear browser local storage
3. Try logging in again

#### Cloudinary Upload Failed

```
Error: Invalid API credentials
```

**Solutions:**
1. Verify Cloudinary credentials in `.env`
2. Check Cloudinary dashboard for API status
3. Ensure unsigned uploads are enabled (if applicable)

#### Email Not Sending

```
Error: Connection timeout
```

**Solutions:**
1. Check SMTP credentials
2. Verify App Password (not regular password)
3. Check if 2FA is enabled on Gmail
4. Try port 465 with `SMTP_SECURE=true`

### Getting Help

1. Check existing [GitHub Issues](https://github.com/your-username/ISKOlarship/issues)
2. Search the [documentation](./README.md)
3. Create a new issue with:
   - Error message
   - Steps to reproduce
   - Environment details (OS, Node version, etc.)

---

## Next Steps

After installation:

1. **Create Admin Account**: Register a new user and set role to `admin`
2. **Complete Admin Profile**: Set administrative scope (University/College/Academic Unit)
3. **Add Scholarships**: Create scholarship offerings
4. **Test Workflow**: Submit test applications as a student

For more information:
- [API Reference](./API_REFERENCE.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Contributing Guide](../CONTRIBUTING.md)
