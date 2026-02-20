// =============================================================================
// ISKOlarship - Auto-Training Service
// Event-driven model retraining triggered by application status changes
// 
// When an admin approves/rejects an application, this service automatically
// retrains the affected scholarship's ML model in the background.
// =============================================================================

const { Application } = require('../models');
const { Scholarship } = require('../models/Scholarship.model');
const { TrainedModel } = require('../models/TrainedModel.model');
const { trainScholarshipModel, trainGlobalModel } = require('./trainingService');
const { TRAINING_CONFIG } = require('./trainingService/constants');

// =============================================================================
// State & Configuration
// =============================================================================

const AUTO_TRAINING_CONFIG = {
  /** Minimum labeled apps needed to train a scholarship-specific model */
  minSamplesScholarship: TRAINING_CONFIG.minSamplesPerScholarship || 30,
  /** Minimum labeled apps needed to train the global model */
  minSamplesGlobal: TRAINING_CONFIG.minSamplesGlobal || 50,
  /** Retrain the global model every N status decisions */
  globalRetrainInterval: 10,
};

/** Rolling counter of status decisions since last global retrain */
let globalDecisionCounter = 0;

/** Locks to prevent concurrent retraining of the same scholarship */
const trainingLocks = new Map();

/** In-memory log of recent auto-training events (kept to last 100) */
const autoTrainingLog = [];
const MAX_LOG_ENTRIES = 100;

// =============================================================================
// Logging
// =============================================================================

function logEvent(entry) {
  const record = {
    timestamp: new Date(),
    ...entry,
  };
  autoTrainingLog.push(record);
  if (autoTrainingLog.length > MAX_LOG_ENTRIES) {
    autoTrainingLog.shift();
  }
  return record;
}

// =============================================================================
// Core: onApplicationDecision
// =============================================================================

/**
 * Called after an admin approves or rejects an application.
 * Triggers background retraining if sufficient data exists.
 *
 * This function is FIRE-AND-FORGET — it never throws and never blocks
 * the calling route handler.
 *
 * @param {string} applicationId - The application that was just decided
 * @param {string} scholarshipId - The scholarship this application belongs to
 * @param {string} newStatus     - 'approved' or 'rejected'
 * @param {string} adminId       - The admin who made the decision
 */
function onApplicationDecision(applicationId, scholarshipId, newStatus, adminId) {
  // Only trigger on final decisions
  if (!['approved', 'rejected'].includes(newStatus)) return;

  // Fire-and-forget via setImmediate so the HTTP response is sent first
  setImmediate(async () => {
    try {
      await _handleDecision(applicationId, scholarshipId, newStatus, adminId);
    } catch (err) {
      // Auto-training must NEVER crash the server
      console.error('⚠️  Auto-training error (non-fatal):', err.message);
      logEvent({
        type: 'error',
        scholarshipId,
        applicationId,
        error: err.message,
      });
    }
  });
}

// =============================================================================
// Internal: Decision Handler
// =============================================================================

async function _handleDecision(applicationId, scholarshipId, newStatus, adminId) {
  const scholarshipIdStr = scholarshipId.toString();

  // ── 1. Increment global counter ──────────────────────────────────────────
  globalDecisionCounter++;
  const shouldRetrainGlobal = globalDecisionCounter % AUTO_TRAINING_CONFIG.globalRetrainInterval === 0;

  // ── 2. Retrain scholarship-specific model ────────────────────────────────
  await _retrainScholarshipModel(scholarshipIdStr, applicationId, adminId);

  // ── 3. Periodically retrain global model ─────────────────────────────────
  if (shouldRetrainGlobal) {
    await _retrainGlobalModel(applicationId, adminId);
  }
}

// =============================================================================
// Internal: Scholarship-Specific Retrain
// =============================================================================

async function _retrainScholarshipModel(scholarshipId, applicationId, adminId) {
  // ── Concurrency lock ─────────────────────────────────────────────────────
  if (trainingLocks.get(scholarshipId)) {
    console.log(`🔒 Auto-train skipped for scholarship ${scholarshipId} — already training`);
    logEvent({
      type: 'skipped',
      reason: 'concurrent_lock',
      scholarshipId,
      applicationId,
    });
    return;
  }

  trainingLocks.set(scholarshipId, true);
  const startTime = Date.now();

  try {
    // ── Check data threshold ─────────────────────────────────────────────
    const labeledCount = await Application.countDocuments({
      scholarship: scholarshipId,
      status: { $in: ['approved', 'rejected'] },
    });

    if (labeledCount < AUTO_TRAINING_CONFIG.minSamplesScholarship) {
      console.log(
        `📊 Auto-train skipped for scholarship ${scholarshipId}: ` +
        `${labeledCount}/${AUTO_TRAINING_CONFIG.minSamplesScholarship} samples`
      );
      logEvent({
        type: 'skipped',
        reason: 'insufficient_data',
        scholarshipId,
        applicationId,
        labeledCount,
        required: AUTO_TRAINING_CONFIG.minSamplesScholarship,
      });
      return;
    }

    // ── Train ────────────────────────────────────────────────────────────
    console.log(`🤖 Auto-training scholarship model (${scholarshipId})...`);
    const result = await trainScholarshipModel(scholarshipId, adminId);

    const elapsed = Date.now() - startTime;

    // ── Mark the model as auto-trained ───────────────────────────────────
    if (result.model) {
      await TrainedModel.findByIdAndUpdate(result.model._id, {
        triggerType: 'auto_status_change',
        triggerApplicationId: applicationId,
      });
    }

    console.log(
      `✅ Auto-trained scholarship model in ${(elapsed / 1000).toFixed(1)}s — ` +
      `accuracy: ${((result.metrics?.accuracy || 0) * 100).toFixed(1)}%`
    );

    logEvent({
      type: 'success',
      scope: 'scholarship',
      scholarshipId,
      scholarshipName: result.scholarship?.name,
      applicationId,
      modelId: result.model?._id,
      accuracy: result.metrics?.accuracy,
      elapsed,
    });
  } catch (err) {
    console.error(`⚠️  Auto-train scholarship ${scholarshipId} failed:`, err.message);
    logEvent({
      type: 'error',
      scope: 'scholarship',
      scholarshipId,
      applicationId,
      error: err.message,
      elapsed: Date.now() - startTime,
    });
  } finally {
    trainingLocks.delete(scholarshipId);
  }
}

// =============================================================================
// Internal: Global Model Retrain
// =============================================================================

async function _retrainGlobalModel(applicationId, adminId) {
  if (trainingLocks.get('__global__')) {
    console.log('🔒 Auto-train global model skipped — already training');
    logEvent({ type: 'skipped', reason: 'concurrent_lock', scope: 'global' });
    return;
  }

  trainingLocks.set('__global__', true);
  const startTime = Date.now();

  try {
    // ── Check data threshold ─────────────────────────────────────────────
    const totalLabeled = await Application.countDocuments({
      status: { $in: ['approved', 'rejected'] },
    });

    if (totalLabeled < AUTO_TRAINING_CONFIG.minSamplesGlobal) {
      console.log(
        `📊 Auto-train global skipped: ${totalLabeled}/${AUTO_TRAINING_CONFIG.minSamplesGlobal} samples`
      );
      logEvent({
        type: 'skipped',
        reason: 'insufficient_data',
        scope: 'global',
        labeledCount: totalLabeled,
        required: AUTO_TRAINING_CONFIG.minSamplesGlobal,
      });
      return;
    }

    // ── Train ────────────────────────────────────────────────────────────
    console.log('🌍 Auto-training global model...');
    const result = await trainGlobalModel(adminId);
    const elapsed = Date.now() - startTime;

    // ── Mark the model as auto-trained ───────────────────────────────────
    if (result.model) {
      await TrainedModel.findByIdAndUpdate(result.model._id, {
        triggerType: 'auto_global_refresh',
        triggerApplicationId: applicationId,
      });
    }

    console.log(
      `✅ Auto-trained global model in ${(elapsed / 1000).toFixed(1)}s — ` +
      `accuracy: ${((result.metrics?.accuracy || 0) * 100).toFixed(1)}%`
    );

    logEvent({
      type: 'success',
      scope: 'global',
      applicationId,
      modelId: result.model?._id,
      accuracy: result.metrics?.accuracy,
      elapsed,
    });
  } catch (err) {
    console.error('⚠️  Auto-train global model failed:', err.message);
    logEvent({
      type: 'error',
      scope: 'global',
      applicationId,
      error: err.message,
      elapsed: Date.now() - startTime,
    });
  } finally {
    trainingLocks.delete('__global__');
  }
}

// =============================================================================
// Public: Status & Log Queries
// =============================================================================

/**
 * Get auto-training system status summary
 */
function getAutoTrainingStatus() {
  const successEvents = autoTrainingLog.filter(e => e.type === 'success');
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEvents = successEvents.filter(e => e.timestamp >= todayStart);

  return {
    enabled: true,
    config: AUTO_TRAINING_CONFIG,
    globalDecisionCounter,
    decisionsUntilGlobalRetrain:
      AUTO_TRAINING_CONFIG.globalRetrainInterval -
      (globalDecisionCounter % AUTO_TRAINING_CONFIG.globalRetrainInterval),
    activeLocks: Array.from(trainingLocks.keys()),
    todaySummary: {
      totalAutoTrains: todayEvents.length,
      scholarshipTrains: todayEvents.filter(e => e.scope === 'scholarship').length,
      globalTrains: todayEvents.filter(e => e.scope === 'global').length,
    },
    lastEvent: autoTrainingLog.length > 0 ? autoTrainingLog[autoTrainingLog.length - 1] : null,
  };
}

/**
 * Get recent auto-training log entries
 * @param {number} limit - Max entries to return (default 50)
 */
function getAutoTrainingLog(limit = 50) {
  return autoTrainingLog.slice(-limit).reverse();
}

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  onApplicationDecision,
  getAutoTrainingStatus,
  getAutoTrainingLog,
  AUTO_TRAINING_CONFIG,
};
