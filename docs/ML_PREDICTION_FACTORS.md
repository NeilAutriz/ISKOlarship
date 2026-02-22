# ISKOlarship — ML Prediction System: Factors, Weights & Calculation

## Overview

The scholarship likelihood prediction uses **Logistic Regression** — a statistical model that combines multiple student factors into a single probability score (0–100%). The system has two stages:

1. **Rule-Based Filtering** — hard pass/fail eligibility checks
2. **Logistic Regression** — trained probability prediction using 15 features

---

## The 15 Prediction Features

### 10 Base Features

| # | Feature | What It Measures | How It's Scored |
|---|---------|-----------------|-----------------|
| 1 | **GWA Score** | Academic performance (normalized) | $(5 - \text{GWA}) / 4$ — higher GWA → higher score (0–1 scale) |
| 2 | **Year Level Match** | Is the student's year level eligible? | Match = 0.65, Mismatch = 0.15, No restriction = 0.30 |
| 3 | **Income Match** | Family income ≤ scholarship max? | Match = 0.65–1.0 (gradient: lower income → higher), Mismatch = 0.15 |
| 4 | **ST Bracket Match** | Socialized tuition bracket eligible? | Match = 0.65, Mismatch = 0.15, No restriction = 0.30 |
| 5 | **College Match** | Student's college in eligible list? | Match = 0.65, Mismatch = 0.15, No restriction = 0.30 |
| 6 | **Course Match** | Student's course in eligible list? | Match = 0.65, Mismatch = 0.15, No restriction = 0.30 |
| 7 | **Citizenship Match** | Meets citizenship requirement? | Match = 0.65, Mismatch = 0.15, No restriction = 0.30 |
| 8 | **Document Completeness** | Is the student's profile complete? | Complete = 0.60, Incomplete = 0.20 |
| 9 | **Application Timing** | How early was the application? | 0.20–1.0 based on submission date relative to deadline |
| 10 | **Eligibility Score** | Fraction of all explicit criteria met | $\text{matched criteria} / \text{total criteria}$ (0–1) |

### 5 Interaction Features (Non-Linear Relationships)

These capture how feature *combinations* affect outcomes — something base features alone cannot express.

| # | Feature | Formula | Why It Matters |
|---|---------|---------|----------------|
| 11 | **Academic Strength** | `gwaScore × yearLevelMatch` | A high GWA matters more if the student is in an eligible year level |
| 12 | **Financial Need** | `incomeMatch × stBracketMatch` | Income significance is amplified when paired with the right ST bracket |
| 13 | **Program Fit** | `collegeMatch × courseMatch` | Being in the right college AND course signals strong program alignment |
| 14 | **Application Quality** | `documentCompleteness × applicationTiming` | A complete profile submitted early signals a serious applicant |
| 15 | **Overall Fit** | `eligibilityScore × academicStrength` | How well overall eligibility combines with academic performance |

---

## Feature Scoring Details

### GWA Score

```
gwaScore = (5 - studentGWA) / 4
```

- GWA 1.0 (best) → score = 1.0
- GWA 2.0 → score = 0.75
- GWA 3.0 → score = 0.50
- GWA 5.0 (worst) → score = 0.0

If the scholarship requires a minimum GWA (e.g., ≤ 2.0) and the student meets it, a **bonus** is added:

$$\text{bonus} = 0.2 \times \frac{\text{maxGWA} - \text{studentGWA}}{\text{maxGWA}}$$

This rewards students who exceed the threshold, not just meet it.

### Income Match (Gradient Scoring)

When the scholarship has a maximum income threshold, the score uses a gradient — lower income gets a higher score:

$$\text{score} = 0.65 + \left(1 - \frac{\text{studentIncome}}{\text{maxIncome}}\right) \times 0.35$$

- Family income = ₱0 → score = 1.0 (maximum financial need)
- Family income = 50% of max → score = 0.825
- Family income = max threshold → score = 0.65
- Family income > max → score = 0.15 (mismatch penalty)

### Categorical Matches (Year Level, College, Course, etc.)

All use the same three-tier scoring:
- **0.65** — student matches an eligible value
- **0.30** — scholarship has no restriction (open to all)
- **0.15** — student does NOT match any eligible value

---

## How Weights Work

### Initial State (Before Training)

All 15 weights start at **0.1** — completely equal, no built-in bias:

```
gwaScore:            0.1
yearLevelMatch:      0.1
incomeMatch:         0.1
stBracketMatch:      0.1
collegeMatch:        0.1
courseMatch:          0.1
citizenshipMatch:    0.1
documentCompleteness:0.1
applicationTiming:   0.1
eligibilityScore:    0.1
academicStrength:    0.1
financialNeed:       0.1
programFit:          0.1
applicationQuality:  0.1
overallFit:          0.1
bias (intercept):    0.0
```

### After Training

The model learns from historical application decisions (approved/rejected). Weights shift based on what actually predicted outcomes:

```
Example trained weights for "DOST Scholarship":
  gwaScore:          2.134  ← GWA is very important
  yearLevelMatch:    1.876  ← Year level matters a lot
  incomeMatch:       1.543  ← Financial need is significant
  stBracketMatch:    0.892  ← ST bracket has moderate impact
  collegeMatch:      0.654  ← College matters somewhat
  courseMatch:        0.321  ← Course is less decisive
  citizenshipMatch:  0.112  ← Most applicants are Filipino, so low variance
  documentCompleteness: 0.445
  applicationTiming: -0.213 ← Late applicants tend to get rejected (negative!)
  eligibilityScore:  1.987  ← Strong overall eligibility predictor
  ...
```

### Training Algorithm

**Mini-Batch Stochastic Gradient Descent** with:
- Learning rate: 0.1 (with decay)
- Batch size: 8
- Up to 500 epochs with early stopping (patience: 50)
- L2 regularization (λ = 0.0001)
- 5-Fold Cross-Validation (final model averages all 5 folds)
- Class weighting for imbalanced data (e.g., if 80% rejected, approved cases get higher weight)

---

## Why Some Weights Are Negative

Negative weights are a **natural and expected** outcome of logistic regression training. They mean:

> **A higher value of this feature correlates with a lower probability of approval.**

### Common Reasons for Negative Weights

#### 1. Application Timing
If historical data shows that students who apply **late** tend to get rejected more often, the `applicationTiming` weight becomes negative. This makes intuitive sense — last-minute applications may be less competitive or miss review windows.

#### 2. Data-Driven Discoveries
Sometimes the model discovers patterns that aren't obvious:
- A specific `stBracket` being common among rejected applicants
- `documentCompleteness` being negative if many rejected applicants had complete profiles (the scholarship was just very selective)

#### 3. Interaction Feature Imbalances
If `academicStrength` (gwaScore × yearLevelMatch) goes negative, it may mean that for *this particular scholarship*, having both high GWA AND matching year level isn't the deciding factor — other criteria (like financial need) dominate.

### Safety Net for Logically-Positive Features

The system includes a safeguard: for features that should **always** help (meeting eligibility criteria should never *hurt* your chances), the frontend flips negative weights to their absolute values:

```
Protected features: eligibilityScore, gwaScore, incomeMatch, citizenshipMatch
```

This prevents data artifacts (e.g., a small training set) from producing illogical results like "having a higher GWA reduces your chances."

---

## The Mathematical Formula

### Prediction

$$z = \text{bias} + \sum_{i=1}^{15} w_i \cdot x_i$$

$$P(\text{approved}) = \sigma\!\left(\frac{z}{T}\right) = \frac{1}{1 + e^{-z/T}}$$

Where:
- $w_i$ = trained weight for feature $i$
- $x_i$ = feature value (0–1) for the student
- $T = 2.0$ = temperature scaling factor (softens the sigmoid to prevent extreme probabilities)
- $\sigma$ = sigmoid function (maps any real number to 0–1)

### Why Temperature Scaling?

Without it, eligible students (whose features cluster around 0.50–0.85) would produce very similar $z$ values, leading to predictions stuck near 50%. Temperature $T = 2.0$ spreads out the sigmoid curve, allowing the model to express more nuanced probabilities.

### Training Loss Function

Binary cross-entropy with class weights:

$$\mathcal{L} = -\frac{1}{N}\sum_{i=1}^{N} c_i \left[ y_i \log(\hat{y}_i) + (1-y_i)\log(1-\hat{y}_i) \right]$$

Where $c_i$ balances class frequencies so rare approvals aren't drowned out by common rejections.

---

## Model Selection Priority

1. **Scholarship-specific model** — trained on *that* scholarship's historical decisions (needs ≥ 30 applications)
2. **Global model** — trained on ALL scholarships combined (needs ≥ 50 applications)
3. **Error state** — if neither exists, prediction is unavailable (no guessing)

---

## Factor Groups (User-Facing)

When displaying predictions to students, the 15 features are grouped into 5 human-readable categories:

| Group | Features Included | What Students See |
|-------|------------------|-------------------|
| **Academic Standing** | gwaScore, yearLevelMatch, academicStrength | "Your GWA and year level match this scholarship's requirements" |
| **Financial Need** | incomeMatch, stBracketMatch, financialNeed | "Your financial profile aligns with the scholarship's target recipients" |
| **Program Match** | collegeMatch, courseMatch, citizenshipMatch, programFit | "Your college and course are eligible for this scholarship" |
| **Application Quality** | documentCompleteness, applicationTiming, applicationQuality | "Your profile is complete and submitted on time" |
| **Overall Eligibility** | eligibilityScore, overallFit | "You meet most of the scholarship's stated requirements" |

Each group gets a strength rating (Strong/Moderate/Weak) based on the weighted contribution of its features.

---

## Summary

| Aspect | Detail |
|--------|--------|
| **Algorithm** | Logistic Regression with SGD |
| **Total Features** | 15 (10 base + 5 interaction) |
| **Initial Weights** | All equal at 0.1 |
| **Training Data** | Historical application decisions (approved/rejected) |
| **Negative Weights** | Normal — means higher feature value → lower approval chance |
| **Protected Features** | eligibilityScore, gwaScore, incomeMatch, citizenshipMatch (never negative) |
| **Output** | Probability 0–100% with factor explanations |
| **Temperature** | 2.0 (prevents sigmoid saturation) |
| **Min Training Data** | 30 (scholarship-specific) or 50 (global) |
