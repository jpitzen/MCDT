const { sequelize } = require('../models');
const logger = require('./logger');

/**
 * Execute a database operation within a transaction
 * Automatically commits on success or rolls back on error
 * 
 * @param {Function} operation - Async function that receives transaction object
 * @returns {Promise} Result of the operation
 * 
 * @example
 * const result = await executeInTransaction(async (t) => {
 *   const user = await User.create({ email: 'test@example.com' }, { transaction: t });
 *   const credential = await Credential.create({ userId: user.id, ... }, { transaction: t });
 *   return { user, credential };
 * });
 */
const executeInTransaction = async (operation) => {
  const t = await sequelize.transaction();
  
  try {
    const result = await operation(t);
    await t.commit();
    return result;
  } catch (error) {
    // Check if transaction is still pending (not committed or rolled back)
    if (t && !t.finished) {
      try {
        await t.rollback();
        logger.error('Transaction rolled back due to error', { error: error.message });
      } catch (rollbackError) {
        // Transaction may have already been rolled back
        logger.warn('Rollback failed (transaction may already be finished)', { 
          originalError: error.message,
          rollbackError: rollbackError.message 
        });
      }
    }
    throw error;
  }
};

/**
 * Execute multiple operations in a single transaction
 * Useful for bulk operations that must succeed or fail together
 * 
 * @param {Array<Function>} operations - Array of async functions that receive transaction
 * @returns {Promise<Array>} Array of results from each operation
 * 
 * @example
 * const [users, credentials] = await executeMultipleInTransaction([
 *   (t) => User.bulkCreate(userData, { transaction: t }),
 *   (t) => Credential.bulkCreate(credData, { transaction: t })
 * ]);
 */
const executeMultipleInTransaction = async (operations) => {
  const t = await sequelize.transaction();
  
  try {
    const results = [];
    for (const operation of operations) {
      const result = await operation(t);
      results.push(result);
    }
    
    await t.commit();
    logger.info('Multiple operations transaction committed', { count: operations.length });
    return results;
  } catch (error) {
    await t.rollback();
    logger.error('Multiple operations transaction rolled back', { 
      error: error.message,
      operationCount: operations.length 
    });
    throw error;
  }
};

/**
 * Execute operations in a transaction with retry logic
 * Automatically retries on deadlock or serialization errors
 * 
 * @param {Function} operation - Async function that receives transaction
 * @param {Object} options - Configuration options
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} options.retryDelay - Delay between retries in ms (default: 100)
 * @returns {Promise} Result of the operation
 */
const executeInTransactionWithRetry = async (operation, options = {}) => {
  const { maxRetries = 3, retryDelay = 100 } = options;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const t = await sequelize.transaction();
    
    try {
      const result = await operation(t);
      await t.commit();
      
      if (attempt > 1) {
        logger.info('Transaction succeeded after retry', { attempt });
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Only rollback if transaction is still pending
      if (t && !t.finished) {
        try {
          await t.rollback();
        } catch (rollbackError) {
          logger.warn('Rollback failed during retry', { 
            attempt,
            rollbackError: rollbackError.message 
          });
        }
      }
      
      // Check if error is retryable (deadlock or serialization failure)
      const isRetryable = error.name === 'SequelizeDatabaseError' && 
        (error.original?.code === '40P01' || // deadlock_detected
         error.original?.code === '40001');   // serialization_failure
      
      if (!isRetryable || attempt === maxRetries) {
        logger.error('Transaction failed', { 
          attempt, 
          maxRetries, 
          error: error.message,
          retryable: isRetryable 
        });
        throw error;
      }
      
      logger.warn('Transaction failed, retrying', { 
        attempt, 
        maxRetries, 
        error: error.message 
      });
      
      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }
  
  throw lastError;
};

module.exports = {
  executeInTransaction,
  executeMultipleInTransaction,
  executeInTransactionWithRetry
};
