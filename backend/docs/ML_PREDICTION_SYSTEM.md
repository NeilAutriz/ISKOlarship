# ISKOlarship ML Prediction System Documentation

## Overview

The ISKOlarship platform uses **Logistic Regression** machine learning to predict scholarship approval probability for students. The system is designed to be **fully dynamic** - all model weights are learned from actual application data, not hardcoded.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ISKOlarship ML Pipeline                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌──────────────────┐    ┌─────────────────────────┐    │
│  │   ADMIN     │───▶│ Training Service │───▶│   TrainedModel (DB)     │    │
│  │  Dashboard  │    │ (training.service)│    │  - weights              │    │
│  │             │    │                  │    │  - bias (intercept)     │    │
│  │ "Train Model"│    │  • K-Fold CV     │    │  - metrics              │    │
│  └─────────────┘    │  • Gradient Desc. │    │  - feature importance   │    │
│                     └──────────────────┘    └───────────┬─────────────┘    │
│                                                         │                   │
│                                                         ▼                   │
│  ┌─────────────┐    ┌──────────────────┐    ┌─────────────────────────┐    │
│  │   STUDENT   │───▶│Prediction Service│◀───│  Logistic Regression    │    │
│  │   Portal    │    │(logisticRegression)│   │  Service                │    │
│  │             │    │                  │    │                         │    │
│  │ "View       │◀───│  • Load weights  │    │  • predictAsync()       │    │
│  │  Scholarships"│   │  • Extract feat. │    │  • Feature extraction   │    │
│  └─────────────┘    │  • Calculate prob│    │  • Sigmoid activation   │    │
│                     └──────────────────┘    └─────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: How Predictions Work (For Students)

### Student Flow

1. **Student logs in** → Views available scholarships
2. **System extracts features** from student profile
3. **System loads trained weights** from database (with 5-min cache)
4. **Calculates probability** using logistic regression formula
5. **Displays prediction** with contributing factors

### Feature Extraction

When a student views a scholarship, the system extracts these features:

| Feature | Description | Match | Mismatch | No Restriction |
|---------|-------------|-------|----------|----------------|
| `gwaScore` | Normalized GWA (1.0=best → 1.0, 5.0=worst → 0.5) | 0.5-1.0 | - | - |
| `yearLevelMatch` | Does year level match scholarship? | 1.0 | 0.85 | 0.95 |
| `incomeMatch` | Does income meet threshold? | 0.9-1.0 | 0.85 | 0.95 |
| `stBracketMatch` | Does ST bracket qualify? | 1.0 | 0.85 | 0.95 |
| `collegeMatch` | Is student's college eligible? | 1.0 | 0.85 | 0.95 |
| `courseMatch` | Is student's course eligible? | 1.0 | 0.85 | 0.95 |
| `citizenshipMatch` | Does citizenship qualify? | 1.0 | 0.85 | 0.95 |
| `applicationTiming` | Application timing score | 0.9 (default) | - | - |
| `eligibilityScore` | % of criteria met | 0.7 + (raw × 0.3) → 0.7-1.0 | - | - |

### Standardized Scoring Constants

```javascript
SCORING = {
  MATCH: 1.0,           // Feature matches requirement
  MISMATCH: 0.85,       // Feature doesn't match (small penalty)
  NO_RESTRICTION: 0.95, // No requirement specified
  UNKNOWN: 0.85,        // Value not provided by student
  TIMING_DEFAULT: 0.9,
  ELIGIBILITY_FLOOR: 0.7,
  ELIGIBILITY_RANGE: 0.3,
  CALIBRATION_OFFSET: 3.0
}
```

### Prediction Formula

```
z = intercept + CALIBRATION_OFFSET + Σ(weight[i] × feature[i])

probability = sigmoid(z) = 1 / (1 + e^(-z))

// Bounded to 15% - 95% range
```

### Example Prediction

```javascript
// Student Profile
{
  gwa: 1.75,           // → gwaScore = 0.8125
  college: "CAS",      // → collegeMatch = 1.0 (matches)
  classification: "Junior", // → yearLevelMatch = 1.0 (matches)
  income: 150000       // → incomeMatch = 1.0 (under threshold)
}

// Scholarship requires: CAS college, Junior/Senior, income < 200k

// With trained weights from database:
z = 0.5 + 3.0 + (0.8125×2.1) + (1.0×1.8) + (1.0×1.5) + ...
z ≈ 12.3

probability = sigmoid(12.3) = 95%
```

---

## Part 2: How Training Works (For Admins)

### Admin Training Flow

1. **Admin goes to** Training Dashboard
2. **Clicks "Train Global Model"** or "Train Scholarship Model"
3. **System fetches** all decided applications (approved/rejected)
4. **Performs 5-Fold Cross-Validation** for robust metrics
5. **Learns optimal weights** via gradient descent
6. **Saves model** to database → Immediately used for predictions

### Training Algorithm

```
Algorithm: Mini-Batch Stochastic Gradient Descent with Early Stopping

1. Initialize all weights = 0.1 (equal, no bias)
2. Initialize bias = 0

3. For each epoch (up to 500):
   a. Shuffle training samples
   b. For each mini-batch (size 8):
      - Forward pass: prediction = sigmoid(weights · features + bias)
      - Calculate error: error = prediction - actual_label
      - Apply class weighting (balance approved/rejected)
      - Update gradients: gradient = error × feature_value
      - Update weights: weight -= learning_rate × gradient
      - Clip weights to [-5, 5] range
   c. Track best model (lowest loss)
   d. Early stopping if no improvement for 50 epochs

4. Return best weights and bias found during training
```

### K-Fold Cross-Validation

```
┌─────────────────────────────────────────────────────────────────┐
│                    5-Fold Cross-Validation                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Fold 1: [TEST] [Train] [Train] [Train] [Train]                │
│  Fold 2: [Train] [TEST] [Train] [Train] [Train]                │
│  Fold 3: [Train] [Train] [TEST] [Train] [Train]                │
│  Fold 4: [Train] [Train] [Train] [TEST] [Train]                │
│  Fold 5: [Train] [Train] [Train] [Train] [TEST]                │
│                                                                 │
│  Final Model = Average of all 5 fold weights                    │
│  Metrics = Average accuracy, precision, recall, F1              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Training Data Requirements

| Model Type | Minimum Samples | Source |
|------------|-----------------|--------|
| Global Model | 50 applications | All scholarships |
| Scholarship-Specific | 30 applications | Single scholarship |

### What Gets Saved to Database

```javascript
TrainedModel {
  name: "Global Model v1738505234567",
  modelType: "global",           // or "scholarship_specific"
  isActive: true,
  
  // LEARNED VALUES (fully dynamic)
  weights: {
    gwaScore: 2.134,             // Learned from data
    yearLevelMatch: 1.876,       // Learned from data
    incomeMatch: 1.543,          // Learned from data
    stBracketMatch: 1.234,       // Learned from data
    collegeMatch: 1.654,         // Learned from data
    courseMatch: 1.432,          // Learned from data
    citizenshipMatch: 0.876,     // Learned from data
    applicationTiming: 0.654,    // Learned from data
    eligibilityScore: 2.345,     // Learned from data
    // Interaction features...
  },
  bias: 0.543,                   // Learned intercept
  
  // METRICS
  metrics: {
    accuracy: 0.847,
    precision: 0.823,
    recall: 0.871,
    f1Score: 0.846
  },
  
  // METADATA
  trainingStats: {
    totalSamples: 250,
    approvedCount: 145,
    rejectedCount: 105
  }
}
```

---

## Part 3: Configuration Constants

### In `logisticRegression.service.js`

| Constant | Value | Purpose |
|----------|-------|---------|
| `CALIBRATION_OFFSET` | 3.0 | Post-hoc calibration for class imbalance correction (Platt Scaling) |
| Sigmoid floor | 15% | Minimum prediction (prevents 0%) |
| Sigmoid ceiling | 95% | Maximum prediction (prevents 100%) |
| Cache TTL | 5 minutes | How long weights stay cached |
| Penalty (mismatch) | 0.75 | Feature value when student doesn't match criteria |
| No restriction | 0.9 | Feature value when scholarship has no restriction |

### In `training.service.js`

| Config | Value | Purpose |
|--------|-------|---------|
| `learningRate` | 0.1 | How fast weights update |
| `epochs` | 500 | Maximum training iterations |
| `batchSize` | 8 | Samples per gradient update |
| `regularization` | 0.0001 | Prevents overfitting |
| `earlyStoppingPatience` | 50 | Epochs without improvement before stopping |
| `kFolds` | 5 | Number of cross-validation folds |
| `INITIAL_VALUE` | 0.1 | Starting weight (equal for all features) |

---

## Part 4: Design Assessment

### ✅ Strengths (Dynamic & Flexible)

1. **Fully Dynamic Weights**
   - All weights start equal (0.1)
   - Model learns importance from actual data
   - No hardcoded feature importance

2. **Database-Driven**
   - Weights stored in MongoDB
   - Easy to retrain and update
   - Multiple models can coexist (global + scholarship-specific)

3. **Fallback System**
   - Uses scholarship-specific model if available
   - Falls back to global model
   - Falls back to neutral weights (all 1.0) if no model exists

4. **Real-Time Updates**
   - Admin trains → Database updated → Cache cleared → New predictions immediately

5. **Transparent Predictions**
   - Shows students which factors contribute most
   - Personalized descriptions for each factor
   - Clear confidence levels

6. **Reproducible Training**
   - Seeded random for deterministic results
   - K-Fold CV for stable metrics
   - Same data → Same model every time

### ⚠️ Considerations

1. **CALIBRATION_OFFSET**
   - Adds +3.0 to all predictions
   - Post-hoc calibration constant (Platt Scaling, class imbalance correction)
   - Academically justified: Compensates for model pessimism in imbalanced datasets

2. **Feature Value Floors**
   - Mismatch penalty = 0.75 (not 0)
   - Prevents single feature from tanking prediction
   - Trade-off: Less harsh on ineligible students

3. **Data Dependency**
   - Model quality depends on training data quality
   - Needs 50+ decided applications for good results
   - More data → Better predictions

### 🎯 Recommendations

1. **Retrain periodically** (monthly) as more applications are decided
2. **Monitor accuracy** in admin dashboard
3. **Train scholarship-specific models** when 30+ applications exist
4. **Adjust CALIBRATION_OFFSET** based on validation data and user feedback

---

## Quick Reference

### For Developers

```javascript
// Get prediction for a student
const prediction = await logisticRegression.predictAsync(user, scholarship);
// Returns: { probability: 0.85, factors: [...], confidence: 'high' }

// Train global model
const result = await trainingService.trainGlobalModel(adminId);
// Returns: { model, metrics, featureImportance }

// Clear cache (after training)
logisticRegression.clearModelWeightsCache();
```

### For Admins

1. Go to Admin Dashboard → Training
2. Click "Train Global Model"
3. Wait for training to complete (~10-30 seconds)
4. View accuracy metrics
5. Students will see updated predictions immediately

---

## Files Involved

| File | Purpose |
|------|---------|
| `logisticRegression.service.js` | Prediction logic, feature extraction |
| `training.service.js` | Model training, gradient descent |
| `prediction.service.js` | High-level prediction API |
| `TrainedModel.model.js` | Database schema for models |
| `training.routes.js` | Admin API endpoints for training |
| `prediction.routes.js` | Student API endpoints for predictions |

---

*Last Updated: February 2026*
*Version: 3.0.0*
