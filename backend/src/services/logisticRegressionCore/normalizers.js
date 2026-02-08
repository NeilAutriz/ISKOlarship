// =============================================================================
// ISKOlarship - Normalizer Functions
// Mathematical functions for normalizing input features
// =============================================================================

// =============================================================================
// Mathematical Functions
// =============================================================================

/**
 * Sigmoid activation function with favorable bounds
 * Returns probability between 0.15 and 0.95 for more optimistic predictions
 * 
 * @param {number} z - Input value (z-score from linear combination)
 * @returns {number} Probability between 0.15 and 0.95
 */
function sigmoid(z) {
  // Prevent overflow/underflow
  if (z > 20) return 0.95;   // Cap at 95% confidence
  if (z < -20) return 0.15;  // Floor at 15% confidence (higher floor)
  
  const rawProb = 1 / (1 + Math.exp(-z));
  
  // Bound the output to favorable range (15%-95%)
  return Math.max(0.15, Math.min(0.95, rawProb));
}

// =============================================================================
// Feature Normalizers
// =============================================================================

/**
 * Normalize GWA (1.0 is best, 5.0 is worst)
 * Output: 0.5-1.0 scale where 1 is best (higher floor)
 * 
 * @param {number} gwa - Grade Weighted Average (1.0-5.0 scale)
 * @returns {number} Normalized score (0.5-1.0)
 */
function normalizeGWA(gwa) {
  if (!gwa || gwa < 1 || gwa > 5) return 0.75; // Higher neutral if missing
  // Linear transformation with higher floor: 1.0 -> 1.0, 5.0 -> 0.5
  return Math.max(0.5, Math.min(1, 0.5 + (5 - gwa) / 8));
}

/**
 * Normalize year level (categorical to ordinal)
 * 
 * @param {string} classification - Student classification (Freshman, Sophomore, etc.)
 * @returns {number} Normalized ordinal value (0.2-1.0)
 */
function normalizeYearLevel(classification) {
  const levels = {
    'Freshman': 0.2,
    'Sophomore': 0.4,
    'Junior': 0.6,
    'Senior': 0.8,
    'Graduate': 1.0
  };
  return levels[classification] || 0.5;
}

/**
 * Normalize family income (inverse - lower income = higher score)
 * Used for need-based scholarships where lower income = higher priority
 * 
 * @param {number} income - Annual family income
 * @param {number} maxThreshold - Maximum income threshold (default: 500000)
 * @returns {number} Normalized score (0-1, higher = more need)
 */
function normalizeIncome(income, maxThreshold = 500000) {
  if (!income || income < 0) return 0.5;
  if (income >= maxThreshold) return 0;
  return Math.max(0, Math.min(1, 1 - (income / maxThreshold)));
}

/**
 * Normalize ST bracket (Socialized Tuition discount level)
 * Higher discount = higher financial need
 * 
 * @param {string} stBracket - ST Bracket code (e.g., 'FDS', 'FD', 'PD80')
 * @returns {number} Normalized score (0.1-1.0)
 */
function normalizeSTBracket(stBracket) {
  if (!stBracket) return 0.5;
  
  const normalizedBracket = stBracket.toString().trim().toUpperCase();
  
  const brackets = {
    'FDS': 1.0, 'FULL DISCOUNT WITH STIPEND': 1.0,
    'FD': 0.85, 'FULL DISCOUNT': 0.85,
    'PD80': 0.7, '80% PARTIAL DISCOUNT': 0.7,
    'PD60': 0.55, '60% PARTIAL DISCOUNT': 0.55,
    'PD40': 0.4, '40% PARTIAL DISCOUNT': 0.4,
    'PD20': 0.25, '20% PARTIAL DISCOUNT': 0.25,
    'ND': 0.1, 'NO DISCOUNT': 0.1
  };
  
  return brackets[normalizedBracket] || 0.5;
}

/**
 * Calculate confidence level based on probability distance from threshold
 * Prevents overconfident predictions
 * 
 * @param {number} probability - Prediction probability (0-1)
 * @returns {'high'|'medium'|'low'} Confidence level
 */
function calculateConfidence(probability) {
  const distance = Math.abs(probability - 0.5);
  if (distance >= 0.30) return 'high';       // 80%+ or 20%-
  if (distance >= 0.10) return 'medium';     // 60%+ or 40%-
  return 'low';                              // 50-60% or 40-50%
}

module.exports = {
  sigmoid,
  normalizeGWA,
  normalizeYearLevel,
  normalizeIncome,
  normalizeSTBracket,
  calculateConfidence
};
