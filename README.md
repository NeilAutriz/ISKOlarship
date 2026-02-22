# ISKOlarship

<div align="center">

![ISKOlarship Banner](https://img.shields.io/badge/ISKOlarship-Scholarship%20Management%20Platform-blue?style=for-the-badge)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.0-green)](https://www.mongodb.com/)
[![React](https://img.shields.io/badge/React-18.2-61dafb)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6)](https://www.typescriptlang.org/)

**A Web-Based Scholarship Management Platform Using Rule-Based Filtering and Logistic Regression**

[Features](#features) • [Installation](#installation) • [Documentation](#documentation) • [API Reference](#api-reference) • [Contributing](#contributing)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Authors](#authors)
- [License](#license)

---

## 🎯 Overview

**ISKOlarship** is a comprehensive scholarship management system designed for the University of the Philippines Los Baños (UPLB). The platform streamlines the scholarship application process by combining intelligent rule-based eligibility filtering with machine learning-powered prediction to match students with the most suitable scholarships.

### Key Objectives

- **Simplify** the scholarship discovery and application process for students
- **Automate** eligibility screening using rule-based filtering
- **Predict** approval likelihood using Logistic Regression ML models
- **Streamline** administrative workflows for scholarship managers
- **Ensure** transparent and fair scholarship allocation

---

## ✨ Features

### For Students

| Feature | Description |
|---------|-------------|
| 🔍 **Smart Scholarship Discovery** | Browse and filter scholarships based on eligibility criteria |
| 📊 **Likelihood Prediction** | ML-powered prediction showing approval probability for each scholarship |
| 📝 **Easy Application** | Streamlined application process with document upload |
| 📈 **Application Tracking** | Real-time status updates on submitted applications |
| 🔔 **Notifications** | Email and in-app notifications for status changes |
| 📋 **Activity Log** | Complete history of all actions and status changes |

### For Administrators

| Feature | Description |
|---------|-------------|
| 🎓 **Scholarship Management** | Create, edit, and manage scholarship offerings |
| 👥 **Applicant Review** | Comprehensive applicant review dashboard |
| 🔐 **OCR Document Verification** | Automated document verification using Google Cloud Vision |
| 🤖 **ML Model Training** | Train and manage prediction models per scholarship |
| 📊 **Analytics Dashboard** | Real-time statistics and insights |
| 🏛️ **Multi-level Access Control** | University, College, and Academic Unit scoped access |

### Machine Learning Features

- **Rule-Based Filtering**: Hard eligibility checks (GWA, income, college, course, etc.)
- **Logistic Regression Model**: 13-feature prediction system with interaction terms
- **Auto-Training**: Models automatically retrain after application decisions
- **Scholarship-Specific Models**: Individual models per scholarship for accuracy
- **Global Fallback Model**: Used when scholarship-specific data is insufficient

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **React Router v6** - Client-side routing
- **Chart.js** - Data visualization
- **Framer Motion** - Animations
- **Lucide React** - Icons

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Cloudinary** - Document storage
- **Google Cloud Vision** - OCR processing
- **Nodemailer** - Email notifications

### Infrastructure
- **Railway** - Backend hosting
- **Vercel** - Frontend hosting
- **MongoDB Atlas** - Database hosting

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Frontend (React/Vite)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Student UI  │  │   Admin UI   │  │  Auth Modal  │  │  Analytics   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
│                              │                                           │
│                    ┌─────────▼─────────┐                                 │
│                    │    API Client     │                                 │
│                    │  (Axios + JWT)    │                                 │
│                    └─────────┬─────────┘                                 │
└──────────────────────────────┼───────────────────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────▼───────────────────────────────────────────┐
│                              Backend (Express.js)                         │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                         Middleware Layer                            │  │
│  │  ┌─────────┐  ┌─────────────┐  ┌────────────┐  ┌────────────────┐  │  │
│  │  │  CORS   │  │    Auth     │  │   Upload   │  │  Admin Scope   │  │  │
│  │  └─────────┘  └─────────────┘  └────────────┘  └────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                          Route Layer                                │  │
│  │  auth • user • scholarship • application • prediction • statistics │  │
│  │  training • ocr • verification • notification • activityLog        │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                         Service Layer                               │  │
│  │  ┌───────────────┐  ┌────────────────┐  ┌──────────────────────┐   │  │
│  │  │  Eligibility  │  │   Prediction   │  │  Logistic Regression │   │  │
│  │  └───────────────┘  └────────────────┘  └──────────────────────┘   │  │
│  │  ┌───────────────┐  ┌────────────────┐  ┌──────────────────────┐   │  │
│  │  │   Training    │  │      OCR       │  │   Email/Notification │   │  │
│  │  └───────────────┘  └────────────────┘  └──────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
    ┌──────────┐       ┌──────────────┐      ┌──────────────┐
    │ MongoDB  │       │  Cloudinary  │      │ Google Cloud │
    │  Atlas   │       │   (Docs)     │      │  Vision API  │
    └──────────┘       └──────────────┘      └──────────────┘
```

---

## 🚀 Installation

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **MongoDB** (local or MongoDB Atlas)
- **Git**

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/ISKOlarship.git
cd ISKOlarship

# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..

# Set up environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration

# Start development servers (concurrent)
npm run dev
```

### Manual Setup

#### Backend Only
```bash
cd backend
npm install
npm run dev
```
The backend server runs on `http://localhost:3001`

#### Frontend Only
```bash
cd frontend
npm install
npm run dev
```
The frontend server runs on `http://localhost:5173`

---

## ⚙️ Configuration

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/iskolaship

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Cloudinary Configuration (Document Storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Google Cloud Vision (OCR)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Email Configuration (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=ISKOlarship <noreply@iskolaship.com>
```

### Frontend Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:3001/api
```

---

## 📖 Usage

### Student Workflow

1. **Register** - Create an account with your UPLB email
2. **Verify Email** - Confirm your email address
3. **Complete Profile** - Fill in academic and financial information
4. **Browse Scholarships** - View available scholarships with prediction scores
5. **Apply** - Submit applications with required documents
6. **Track** - Monitor application status in your dashboard

### Admin Workflow

1. **Login** - Access with admin credentials
2. **Complete Profile** - Set your administrative scope (University/College/Academic Unit)
3. **Manage Scholarships** - Create or edit scholarship offerings
4. **Review Applications** - Process incoming applications
5. **Verify Documents** - Use OCR to validate uploaded documents
6. **Train Models** - Manage ML prediction models
7. **View Analytics** - Monitor platform statistics

---

## 📚 API Reference

See [docs/API_REFERENCE.md](docs/API_REFERENCE.md) for complete API documentation.

### Quick Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | User login |
| `/api/scholarships` | GET | List scholarships |
| `/api/scholarships/:id` | GET | Get scholarship details |
| `/api/applications` | POST | Submit application |
| `/api/applications/:id` | GET | Get application details |
| `/api/predictions/:scholarshipId` | GET | Get prediction for scholarship |
| `/api/statistics/overview` | GET | Platform statistics |

---

## 📁 Project Structure

```
ISKOlarship/
├── backend/                    # Backend API (Express.js)
│   ├── src/
│   │   ├── middleware/         # Express middleware
│   │   │   ├── auth.middleware.js
│   │   │   ├── adminScope.middleware.js
│   │   │   └── upload.middleware.js
│   │   ├── models/             # Mongoose models
│   │   │   ├── User.model.js
│   │   │   ├── Scholarship.model.js
│   │   │   ├── Application.model.js
│   │   │   ├── TrainedModel.model.js
│   │   │   └── ...
│   │   ├── routes/             # API routes
│   │   │   ├── auth.routes.js
│   │   │   ├── scholarship.routes.js
│   │   │   ├── application.routes.js
│   │   │   └── ...
│   │   ├── services/           # Business logic
│   │   │   ├── eligibility.service.js
│   │   │   ├── prediction.service.js
│   │   │   ├── logisticRegression.service.js
│   │   │   ├── autoTraining.service.js
│   │   │   ├── ocrVerification.service.js
│   │   │   └── ...
│   │   └── server.js           # Entry point
│   ├── scripts/                # Utility scripts
│   │   ├── migrations/         # Database migrations
│   │   ├── verification/       # Testing scripts
│   │   └── cleanup/            # Maintenance scripts
│   ├── tests/                  # Test files
│   └── uploads/                # Temporary upload storage
│
├── frontend/                   # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   ├── pages/              # Page components
│   │   │   ├── admin/          # Admin pages
│   │   │   └── student/        # Student pages
│   │   ├── services/           # API services
│   │   ├── types/              # TypeScript types
│   │   ├── utils/              # Utility functions
│   │   ├── styles/             # Global styles
│   │   ├── App.tsx             # Main app component
│   │   └── main.tsx            # Entry point
│   └── public/                 # Static assets
│
├── docs/                       # Documentation
│   ├── API_REFERENCE.md
│   ├── INSTALLATION.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── ML_PREDICTION_FACTORS.md
│   ├── EVENT_DRIVEN_AUTO_TRAINING.md
│   ├── OCR_DOCUMENT_VERIFICATION.md
│   └── ADMIN_SCOPE_ROUTE_PROTECTION_PLAN.md
│
├── package.json                # Root package.json
├── railway.json                # Railway deployment config
└── README.md                   # This file
```

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm test
```

Test coverage includes:
- Authentication and authorization
- Application submission workflow
- Prediction service accuracy
- Document verification (OCR)
- Email notifications
- Activity logging

### Running Specific Tests

```bash
# Run a specific test file
npm test -- auth.test.js

# Run tests with coverage
npm test -- --coverage
```

### Verification Scripts

```bash
# Check database integrity
node scripts/verification/check-database.js

# Audit model selection
node scripts/verification/audit-model-selection.js

# Run all verification tests
node scripts/verification/run-all-model-tests.js
```

---

## 🚢 Deployment

### Railway (Backend)

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Railway auto-deploys on push to `main` branch

Configuration files:
- `railway.json` - Railway-specific config
- `nixpacks.toml` - Build configuration
- `Procfile` - Process definition

### Vercel (Frontend)

1. Connect your GitHub repository to Vercel
2. Set the root directory to `frontend/`
3. Set environment variables in Vercel dashboard
4. Vercel auto-deploys on push to `main` branch

Configuration file:
- `frontend/vercel.json` - Vercel-specific config

---

## 📖 Documentation

Detailed documentation is available in the `docs/` directory:

| Document | Description |
|----------|-------------|
| [API_REFERENCE.md](docs/API_REFERENCE.md) | Complete API endpoint documentation |
| [INSTALLATION.md](docs/INSTALLATION.md) | Detailed installation guide |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture overview |
| [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | MongoDB schema documentation |
| [ML_PREDICTION_FACTORS.md](docs/ML_PREDICTION_FACTORS.md) | ML prediction system details |
| [EVENT_DRIVEN_AUTO_TRAINING.md](docs/EVENT_DRIVEN_AUTO_TRAINING.md) | Auto-training implementation |
| [OCR_DOCUMENT_VERIFICATION.md](docs/OCR_DOCUMENT_VERIFICATION.md) | OCR verification system |
| [ADMIN_SCOPE_ROUTE_PROTECTION_PLAN.md](docs/ADMIN_SCOPE_ROUTE_PROTECTION_PLAN.md) | Admin access control |

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Steps

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- **Backend**: ESLint with Node.js best practices
- **Frontend**: ESLint + TypeScript strict mode
- **Commits**: Follow [Conventional Commits](https://www.conventionalcommits.org/)

---

## 👥 Authors

- **Mark Neil G. Autriz** - *Lead Developer*
- **Juan Miguel Bawagan** - *Adviser*

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- University of the Philippines Los Baños
- Office of Student Affairs (OSA)
- All scholarship providers and administrators

---

<div align="center">

**Made with ❤️ for UPLB Iskolar ng Bayan**

[Report Bug](https://github.com/your-username/ISKOlarship/issues) • [Request Feature](https://github.com/your-username/ISKOlarship/issues)

</div>
