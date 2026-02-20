# Event-Driven Auto-Training Implementation Plan

## Overview

Replace the current **manual training workflow** (admin must click "Train" on the Model Training page) with an **event-driven auto-training system** that automatically retrains ML models whenever application decisions are made.

### Current Flow (Manual)
```
Admin reviews application → Clicks Approve/Reject → Status saved
                           ↓ (SEPARATE action)
Admin goes to Model Training page → Clicks "Train" → Model retrains
```

### New Flow (Automatic)
```
Admin reviews application → Clicks Approve/Reject → Status saved
                           ↓ (AUTOMATIC, non-blocking)
                    Auto-retrain triggered in background
                    → Scholarship-specific model retrained
                    → Every Nth decision → Global model also retrained
                    → Model Training page shows live auto-training history
```

---

## Architecture

### Trigger Point
The trigger is the **`PUT /api/applications/:id/status`** route in `application.routes.js`. When the new status is `approved` or `rejected`, this creates a new labeled data point for the ML system — the perfect moment to retrain.

### Background Execution
Training runs via `setImmediate()` (non-blocking). The admin gets an immediate API response for their status update; the retraining happens in the background without delaying the response.

### What Gets Retrained

| Event | Action |
|-------|--------|
| Application → `approved` or `rejected` | Retrain that scholarship's local model (if ≥30 samples) |
| Every 10th status change (across all scholarships) | Also retrain the global model |
| Admin manually clicks "Train" on UI | Still works as manual override |

### Minimum Data Threshold
- **Scholarship-specific model**: 30 labeled applications (same as current)
- **Global model**: 50 labeled applications (same as current)
- If threshold not met, auto-training is silently skipped (no error)

---

## Database Changes

### TrainedModel Schema — New Fields

```javascript
// Add to trainedModelSchema:
triggerType: {
  type: String,
  enum: ['manual', 'auto_status_change', 'auto_global_refresh'],
  default: 'manual'
}
// → Tracks whether the model was trained manually by an admin or automatically

triggerApplicationId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Application',
  default: null
}
// → The application whose status change triggered auto-training (if auto)
```

No other schema changes needed. Existing `trainedBy`, `trainedAt`, `isActive`, `metrics`, etc. all remain the same.

---

## Backend Changes

### 1. New Service: `autoTraining.service.js`

**Location:** `backend/src/services/autoTraining.service.js`

**Responsibilities:**
- Receives event: "application X for scholarship Y was just approved/rejected"
- Checks if scholarship has ≥30 labeled applications
- If yes, retrains the scholarship-specific model in background
- Tracks a global counter; every 10th decision also triggers global retrain
- Logs all auto-training activity
- Catches all errors silently (auto-training failures must NEVER break the status update flow)

**Key function:**
```javascript
async function onApplicationDecision(applicationId, scholarshipId, newStatus, adminId) {
  // 1. Only trigger on approved/rejected
  // 2. Check data threshold
  // 3. trainScholarshipModel() in background
  // 4. Every 10th → trainGlobalModel() in background
  // 5. Record auto-training event with triggerType
}
```

### 2. Modified Route: `application.routes.js`

**Change:** After the `application.save()` call in `PUT /:id/status`, add a single line:

```javascript
// After saving — trigger auto-training (non-blocking)
if (['approved', 'rejected'].includes(status)) {
  autoTrainingService.onApplicationDecision(
    application._id,
    application.scholarship._id,
    status,
    req.user._id
  );
}
```

This is non-blocking (`setImmediate` inside the service), so the response is sent immediately.

### 3. New Route: `GET /api/training/auto-training/status`

Returns auto-training configuration and recent activity for the frontend dashboard.

### 4. New Route: `GET /api/training/auto-training/log`

Returns the last N auto-training events (with trigger type, result, timing).

---

## Frontend Changes

### 1. Model Training Page (`ModelTraining.tsx`)

**Changes:**
- Add an "Auto-Training" status section at the top showing:
  - Auto-training is **active** (green indicator)
  - Last auto-train event timestamp and result
  - Count of auto-trained models today
- Each model card shows whether it was `manual` or `auto` trained (via `triggerType`)
- The manual "Train" buttons remain as overrides
- "Train All" button remains for university admins

### 2. API Client (`apiClient.ts`)

**New endpoints:**
```typescript
trainingApi.getAutoTrainingStatus()   // GET /api/training/auto-training/status
trainingApi.getAutoTrainingLog()      // GET /api/training/auto-training/log
```

---

## Flow Diagram

```
┌──────────────────────────────┐
│  Admin: Approve/Reject App   │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  PUT /applications/:id/status │
│  1. Validate & save status    │
│  2. Update scholarship slots  │
│  3. Send response to admin ◄──── IMMEDIATE RESPONSE
│  4. Fire auto-training event  │
└──────────┬───────────────────┘
           │ (non-blocking)
           ▼
┌──────────────────────────────┐
│  autoTraining.service.js      │
│  1. Check: is status final?   │
│  2. Count labeled apps for    │
│     this scholarship          │
│  3. If ≥ 30: retrain local    │
│  4. Increment global counter  │
│  5. If counter % 10 == 0:     │
│     retrain global model      │
│  6. Auto-activate new model   │
│  7. Log auto-training event   │
└──────────────────────────────┘
```

---

## Safety Guarantees

1. **Auto-training NEVER blocks the API response** — runs via `setImmediate()`
2. **Auto-training NEVER crashes the server** — all errors caught and logged
3. **Concurrency safe** — uses a simple lock to prevent parallel retrains of the same scholarship
4. **Threshold respected** — won't train if insufficient labeled data
5. **Manual override preserved** — admins can still manually train anytime
6. **Scope-safe** — models are trained per-scholarship, respecting the existing scope architecture
7. **New models auto-activate** — the newly trained model immediately becomes the active model

---

## Files Changed

| File | Change |
|------|--------|
| `backend/src/services/autoTraining.service.js` | **NEW** — Core auto-training logic |
| `backend/src/models/TrainedModel.model.js` | Add `triggerType`, `triggerApplicationId` fields |
| `backend/src/routes/application.routes.js` | Call `onApplicationDecision()` after status update |
| `backend/src/routes/training.routes.js` | Add auto-training status/log endpoints |
| `frontend/src/services/apiClient.ts` | Add auto-training API methods |
| `frontend/src/pages/admin/ModelTraining.tsx` | Add auto-training status UI section |
