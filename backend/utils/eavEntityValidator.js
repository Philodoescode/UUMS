/**
 * Entity Reference Validation Utility for EAV System
 * 
 * Provides application-level validation to ensure entityId references
 * exist in the appropriate table based on entityType.
 * 
 * This complements the database trigger validation with a more flexible
 * approach that can be used before attempting database operations.
 */

const { sequelize } = require('../config/db');
const { QueryTypes } = require('sequelize');

/**
 * Map of entity types to their corresponding table names and model references
 */
const ENTITY_TYPE_MAP = {
  User: { table: 'users', modelName: 'User' },
  Role: { table: 'roles', modelName: 'Role' },
  Course: { table: 'courses', modelName: 'Course' },
  Department: { table: 'departments', modelName: 'Department' },
  Instructor: { table: 'instructors', modelName: 'Instructor' },
};

/**
 * Validate that an entityId exists for the given entityType
 * @param {string} entityType - The type of entity (e.g., 'User', 'Role')
 * @param {string} entityId - The UUID of the entity
 * @param {object} options - Additional options
 * @param {object} options.transaction - Sequelize transaction to use
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
async function validateEntityReference(entityType, entityId, options = {}) {
  const { transaction = null } = options;

  if (!entityType || !entityId) {
    return { valid: false, error: 'entityType and entityId are required' };
  }

  const entityConfig = ENTITY_TYPE_MAP[entityType];
  
  if (!entityConfig) {
    // Unknown entity type - consider valid for extensibility
    // The database trigger will also allow this
    console.warn(`Unknown entityType: ${entityType}. Skipping validation.`);
    return { valid: true };
  }

  try {
    const [result] = await sequelize.query(
      `SELECT EXISTS(SELECT 1 FROM ${entityConfig.table} WHERE id = :entityId) as exists`,
      {
        replacements: { entityId },
        type: QueryTypes.SELECT,
        transaction,
      }
    );

    if (!result.exists) {
      return {
        valid: false,
        error: `No ${entityType} record exists with id ${entityId}`,
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Validation error: ${error.message}`,
    };
  }
}

/**
 * Validate multiple entity references at once
 * @param {Array<{entityType: string, entityId: string}>} entities - Array of entity references to validate
 * @param {object} options - Additional options
 * @param {object} options.transaction - Sequelize transaction to use
 * @returns {Promise<{valid: boolean, errors: Array<{entityType: string, entityId: string, error: string}>}>}
 */
async function validateEntityReferences(entities, options = {}) {
  const errors = [];

  for (const { entityType, entityId } of entities) {
    const result = await validateEntityReference(entityType, entityId, options);
    if (!result.valid) {
      errors.push({ entityType, entityId, error: result.error });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get all supported entity types
 * @returns {string[]} Array of supported entity type names
 */
function getSupportedEntityTypes() {
  return Object.keys(ENTITY_TYPE_MAP);
}

/**
 * Check if an entity type is supported
 * @param {string} entityType - The entity type to check
 * @returns {boolean}
 */
function isEntityTypeSupported(entityType) {
  return entityType in ENTITY_TYPE_MAP;
}

/**
 * Register a new entity type for validation
 * Useful for extending the system with new entity types
 * @param {string} entityType - The name of the entity type
 * @param {string} tableName - The database table name
 * @param {string} modelName - The Sequelize model name (optional)
 */
function registerEntityType(entityType, tableName, modelName = null) {
  ENTITY_TYPE_MAP[entityType] = {
    table: tableName,
    modelName: modelName || entityType,
  };
}

module.exports = {
  validateEntityReference,
  validateEntityReferences,
  getSupportedEntityTypes,
  isEntityTypeSupported,
  registerEntityType,
  ENTITY_TYPE_MAP,
};
