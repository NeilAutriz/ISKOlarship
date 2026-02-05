// =============================================================================
// Training Service - Seeded Random Number Generator
// Provides deterministic random number generation for reproducibility
// =============================================================================

const { TRAINING_CONFIG } = require('./constants');

/**
 * Seeded Random Number Generator
 * Uses Linear Congruential Generator algorithm for reproducible random sequences
 */
class SeededRandom {
  /**
   * Create a new seeded random number generator
   * @param {number} seed - The initial seed value (default: 42)
   */
  constructor(seed = 42) {
    this.seed = seed;
    this.current = seed;
  }
  
  /**
   * Generate next random number in range [0, 1)
   * Uses Linear Congruential Generator (LCG) algorithm
   * @returns {number} Random number between 0 and 1
   */
  next() {
    this.current = (this.current * 1103515245 + 12345) & 0x7fffffff;
    return this.current / 0x7fffffff;
  }
  
  /**
   * Reset generator to initial seed
   */
  reset() {
    this.current = this.seed;
  }
  
  /**
   * Get random integer in range [0, max)
   * @param {number} max - Upper bound (exclusive)
   * @returns {number} Random integer
   */
  nextInt(max) {
    return Math.floor(this.next() * max);
  }
}

// Global seeded random instance (can be reset for reproducibility)
let seededRandomInstance = new SeededRandom(TRAINING_CONFIG.randomSeed);

/**
 * Get the global seeded random instance
 * @returns {SeededRandom} The global seeded random instance
 */
function getSeededRandom() {
  return seededRandomInstance;
}

/**
 * Reset the global seeded random instance with a new seed
 * @param {number} seed - New seed value
 */
function resetSeededRandom(seed = TRAINING_CONFIG.randomSeed) {
  seededRandomInstance = new SeededRandom(seed);
}

module.exports = {
  SeededRandom,
  getSeededRandom,
  resetSeededRandom
};
