/**
 * User Profile EAV Service
 * 
 * Provides unified access to user profile data via EAV tables.
 * Different user types (Student, Instructor, Parent, Staff) have different attributes.
 * 
 * This service enables extensible user profiles without schema changes.
 * 
 * Attribute Groups by Role:
 * - Student: student_id, major, gpa, classification, emergency contacts, etc.
 * - Instructor: research_interests, academic_rank, tenure_status, etc.
 * - Parent: relationship_type, contact preferences, occupation, etc.
 * - Staff/HR: employee_id, position_title, hire_date, manager, etc.
 * - Common: preferred_name, pronouns, phone_number, address fields, etc.
 * 
 * === Entity-Specific Table ===
 * This service uses the entity-specific user_attribute_values table exclusively.
 * 
 * Benefits:
 * - Proper foreign key constraints with CASCADE delete
 * - Better query performance (direct join vs polymorphic lookup)
 * - Database-enforced referential integrity
 * - No polymorphic entityType/entityId columns needed
 */

const { sequelize } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const ENTITY_TYPE_NAME = 'User';

// Attribute categories for filtering
const ATTRIBUTE_CATEGORIES = {
  COMMON: 'common',
  STUDENT: 'student',
  INSTRUCTOR: 'instructor',
  PARENT: 'parent',
  STAFF: 'staff',
};

// Cache for entity type configuration
let entityTypeCache = null;
let entityTypeCacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get the User entity type configuration
 * @returns {Promise<object|null>} Entity type config or null
 */
async function getEntityTypeConfig() {
  const now = Date.now();
  
  if (entityTypeCache && entityTypeCacheTimestamp && (now - entityTypeCacheTimestamp) < CACHE_TTL) {
    return entityTypeCache;
  }
  
  const [config] = await sequelize.query(
    `SELECT id, name, "tableName"
     FROM entity_types 
     WHERE name = :name AND "deletedAt" IS NULL`,
    {
      replacements: { name: ENTITY_TYPE_NAME },
      type: sequelize.QueryTypes.SELECT,
    }
  );
  
  entityTypeCache = config || null;
  entityTypeCacheTimestamp = now;
  
  return entityTypeCache;
}

/**
 * Clear the entity type configuration cache
 */
function clearCache() {
  entityTypeCache = null;
  entityTypeCacheTimestamp = null;
}

/**
 * Get all profile attributes for a user
 * @param {string} userId - The user's UUID
 * @param {object} options - Query options
 * @param {string} options.category - Filter by attribute category
 * @param {string[]} options.attributeNames - Filter by specific attribute names
 * @returns {Promise<object>} Object with attribute key-value pairs
 */
async function getUserProfile(userId, options = {}) {
  const { category = null, attributeNames = null } = options;
  const replacements = { userId };

  // Always use entity-specific user_attribute_values table (snake_case columns)
  const fromClause = `
    FROM user_attribute_values uav
    JOIN attribute_definitions ad ON uav.attribute_id = ad.id
    JOIN entity_types et ON ad."entityTypeId" = et.id
  `;
  let whereClause = `
    WHERE uav.user_id = :userId
      AND ad."deletedAt" IS NULL
      AND ad."isActive" = true
  `;

  if (category) {
    whereClause += ` AND ad.name LIKE :categoryPrefix`;
    replacements.categoryPrefix = `${category}_%`;
  }

  if (attributeNames && attributeNames.length > 0) {
    whereClause += ` AND ad.name IN (:attributeNames)`;
    replacements.attributeNames = attributeNames;
  }

  // Build SELECT columns (snake_case in DB, aliased to camelCase)
  const valueColumns = `uav.attribute_id as "attributeId", uav.value_string as "valueString", uav.value_integer as "valueInteger", uav.value_decimal as "valueDecimal", 
     uav.value_boolean as "valueBoolean", uav.value_date as "valueDate", uav.value_datetime as "valueDatetime", uav.value_text as "valueText", 
     uav.value_json as "valueJson", uav.sort_order as "sortOrder"`;

  const values = await sequelize.query(
    `SELECT 
       ${valueColumns},
       ad.name as attribute_name,
       ad."displayName" as display_name,
       ad.description,
       ad."valueType"
     ${fromClause}
     ${whereClause}
     ORDER BY ad."sortOrder", uav.sort_order`,
    {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    }
  );

  if (values.length === 0) {
    return { success: true, data: {} };
  }

  // Convert to key-value object
  const profile = {};
  
  for (const value of values) {
    const attrName = value.attribute_name;
    let attrValue = extractValue(value);

    // Convert snake_case to camelCase for API consistency
    const camelCaseName = attrName.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
    profile[camelCaseName] = attrValue;
  }

  return { success: true, data: profile };
}

/**
 * Get profile with full metadata
 * @param {string} userId - The user's UUID
 * @param {object} options - Query options
 * @returns {Promise<Array>} Array of attribute objects with full metadata
 */
async function getUserProfileWithDetails(userId, options = {}) {
  const { category = null } = options;
  const replacements = { userId };

  const fromClause = `
    FROM user_attribute_values uav
    JOIN attribute_definitions ad ON uav.attribute_id = ad.id
    JOIN entity_types et ON ad."entityTypeId" = et.id
  `;
  let whereClause = `
    WHERE uav.user_id = :userId
      AND ad."deletedAt" IS NULL
  `;

  if (category) {
    whereClause += ` AND ad.name LIKE :categoryPrefix`;
    replacements.categoryPrefix = `${category}_%`;
  }

  const idColumn = `CONCAT(uav.user_id, '-', uav.attribute_id) as value_id`;

  const values = await sequelize.query(
    `SELECT 
       ${idColumn},
       uav.attribute_id as "attributeId",
       ad.name as attribute_name,
       ad."displayName" as display_name,
       ad.description,
       ad."valueType",
       ad."isRequired",
       ad."validationRules",
       uav.value_string as "valueString",
       uav.value_integer as "valueInteger",
       uav.value_decimal as "valueDecimal",
       uav.value_boolean as "valueBoolean",
       uav.value_date as "valueDate",
       uav.value_datetime as "valueDatetime",
       uav.value_text as "valueText",
       uav.value_json as "valueJson",
       uav.sort_order as "sortOrder",
       uav."createdAt",
       uav."updatedAt"
     ${fromClause}
     ${whereClause}
     ORDER BY ad."sortOrder", uav.sort_order`,
    {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    }
  );

  return values.map(v => ({
    valueId: v.value_id,
    attributeId: v.attributeId,
    name: v.attribute_name,
    displayName: v.display_name,
    description: v.description,
    valueType: v.valueType,
    isRequired: v.isRequired,
    validationRules: v.validationRules,
    value: extractValue(v),
    sortOrder: v.sortOrder,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  }));
}

/**
 * Extract value based on type
 */
function extractValue(record) {
  switch (record.valueType) {
    case 'string':
      return record.valueString;
    case 'integer':
      return record.valueInteger ? parseInt(record.valueInteger, 10) : null;
    case 'decimal':
      return record.valueDecimal ? parseFloat(record.valueDecimal) : null;
    case 'boolean':
      return record.valueBoolean;
    case 'date':
      return record.valueDate;
    case 'datetime':
      return record.valueDatetime;
    case 'text':
      return record.valueText;
    case 'json':
      try {
        return typeof record.valueJson === 'string' 
          ? JSON.parse(record.valueJson) 
          : record.valueJson;
      } catch {
        return record.valueJson;
      }
    default:
      return record.valueString || record.valueText;
  }
}

/**
 * Set a single profile attribute using upsert pattern
 * Uses PostgreSQL ON CONFLICT for atomic upsert to prevent race conditions
 * 
 * @param {string} userId - The user's UUID
 * @param {string} attributeName - The attribute name (snake_case)
 * @param {any} value - The value to set
 * @returns {Promise<object>} The created/updated attribute value
 */
async function setUserProfileAttribute(userId, attributeName, value) {
  const transaction = await sequelize.transaction();

  try {
    // Get entity type
    const config = await getEntityTypeConfig();
    if (!config) {
      throw new Error('User entity type not found in EAV system. Run migration script first.');
    }

    // Get attribute definition
    const [attrDef] = await sequelize.query(
      `SELECT id, "valueType", "isRequired", "validationRules" 
       FROM attribute_definitions 
       WHERE "entityTypeId" = :entityTypeId AND name = :name AND "deletedAt" IS NULL`,
      {
        replacements: { entityTypeId: config.id, name: attributeName },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    if (!attrDef) {
      throw new Error(`Attribute '${attributeName}' not found for User entity type`);
    }

    // Validate required
    if (attrDef.isRequired && (value === null || value === undefined || value === '')) {
      throw new Error(`Attribute '${attributeName}' is required`);
    }

    // Prepare value columns (snake_case for DB)
    const valueColumns = prepareValueColumns(value, attrDef.valueType);

    // Use entity-specific user_attribute_values table (snake_case columns)
    const [upsertResult] = await sequelize.query(
      `INSERT INTO user_attribute_values 
       (user_id, attribute_id,
        value_string, value_integer, value_decimal, value_boolean,
        value_date, value_datetime, value_text, value_json,
        sort_order, "createdAt", "updatedAt")
       VALUES (:user_id, :attribute_id,
               :value_string, :value_integer, :value_decimal, :value_boolean,
               :value_date, :value_datetime, :value_text, :value_json,
               0, NOW(), NOW())
       ON CONFLICT (user_id, attribute_id) 
       DO UPDATE SET
         value_string = EXCLUDED.value_string,
         value_integer = EXCLUDED.value_integer,
         value_decimal = EXCLUDED.value_decimal,
         value_boolean = EXCLUDED.value_boolean,
         value_date = EXCLUDED.value_date,
         value_datetime = EXCLUDED.value_datetime,
         value_text = EXCLUDED.value_text,
         value_json = EXCLUDED.value_json,
         "updatedAt" = NOW()
       RETURNING user_id, attribute_id, (xmax = 0) AS inserted`,
      {
        replacements: {
          user_id: userId,
          attribute_id: attrDef.id,
          ...valueColumns,
        },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    const resultId = `${userId}-${attrDef.id}`;
    const wasInserted = upsertResult?.inserted === true;

    // Mark user as having EAV profile
    await sequelize.query(
      `UPDATE users SET "profileEavEnabled" = true WHERE id = :userId`,
      { replacements: { userId }, transaction }
    );

    await transaction.commit();

    return {
      success: true,
      data: {
        id: resultId,
        attributeName,
        value,
        action: wasInserted ? 'created' : 'updated',
      },
    };

  } catch (error) {
    await transaction.rollback();
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Prepare value columns based on type (snake_case for DB)
 */
function prepareValueColumns(value, valueType) {
  const columns = {
    value_string: null,
    value_integer: null,
    value_decimal: null,
    value_boolean: null,
    value_date: null,
    value_datetime: null,
    value_text: null,
    value_json: null,
  };

  if (value === null || value === undefined) {
    return columns;
  }

  switch (valueType) {
    case 'string':
      columns.value_string = String(value).substring(0, 500);
      break;
    case 'integer':
      columns.value_integer = parseInt(value, 10);
      break;
    case 'decimal':
      columns.value_decimal = parseFloat(value);
      break;
    case 'boolean':
      columns.value_boolean = Boolean(value);
      break;
    case 'date':
      columns.value_date = value instanceof Date ? value : new Date(value);
      break;
    case 'datetime':
      columns.value_datetime = value instanceof Date ? value : new Date(value);
      break;
    case 'text':
      columns.value_text = String(value);
      break;
    case 'json':
      columns.value_json = typeof value === 'string' ? value : JSON.stringify(value);
      break;
    default:
      columns.value_string = String(value).substring(0, 500);
  }

  return columns;
}

/**
 * Set multiple profile attributes in a single transaction
 * @param {string} userId - The user's UUID
 * @param {object} attributes - Object with attribute names as keys
 * @returns {Promise<object>} Results for each attribute
 */
async function bulkSetUserProfile(userId, attributes) {
  // Handle empty attributes object
  if (!attributes || Object.keys(attributes).length === 0) {
    return {
      success: true,
      data: [],
      processedCount: 0,
    };
  }

  const transaction = await sequelize.transaction();

  try {
    // Get entity type
    const config = await getEntityTypeConfig();
    if (!config) {
      throw new Error('User entity type not found in EAV system');
    }

    // Normalize attribute names (camelCase to snake_case)
    const normalizedAttributes = {};
    for (const [key, value] of Object.entries(attributes)) {
      const snakeCaseKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      normalizedAttributes[snakeCaseKey] = value;
    }

    // Get all relevant attribute definitions
    const attributeNames = Object.keys(normalizedAttributes);
    const attrDefs = await sequelize.query(
      `SELECT id, name, "valueType", "isRequired", "validationRules"
       FROM attribute_definitions 
       WHERE "entityTypeId" = :entityTypeId 
         AND name IN (:attributeNames) 
         AND "deletedAt" IS NULL`,
      {
        replacements: { entityTypeId: config.id, attributeNames },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    const attrDefMap = new Map(attrDefs.map(a => [a.name, a]));
    const results = {};

    // Use upsert pattern for each attribute
    for (const [attributeName, value] of Object.entries(normalizedAttributes)) {
      const attrDef = attrDefMap.get(attributeName);
      if (!attrDef) {
        results[attributeName] = { error: `Attribute '${attributeName}' not found` };
        continue;
      }

      const valueColumns = prepareValueColumns(value, attrDef.valueType);

      // Use entity-specific user_attribute_values table
      const [upsertResult] = await sequelize.query(
        `INSERT INTO user_attribute_values 
         (user_id, attribute_id,
          value_string, value_integer, value_decimal, value_boolean,
          value_date, value_datetime, value_text, value_json,
          sort_order, "createdAt", "updatedAt")
         VALUES (:user_id, :attribute_id,
                 :value_string, :value_integer, :value_decimal, :value_boolean,
                 :value_date, :value_datetime, :value_text, :value_json,
                 0, NOW(), NOW())
         ON CONFLICT (user_id, attribute_id) 
         DO UPDATE SET
           value_string = EXCLUDED.value_string,
           value_integer = EXCLUDED.value_integer,
           value_decimal = EXCLUDED.value_decimal,
           value_boolean = EXCLUDED.value_boolean,
           value_date = EXCLUDED.value_date,
           value_datetime = EXCLUDED.value_datetime,
           value_text = EXCLUDED.value_text,
           value_json = EXCLUDED.value_json,
           "updatedAt" = NOW()
         RETURNING (xmax = 0) AS inserted`,
        {
          replacements: {
            user_id: userId,
            attribute_id: attrDef.id,
            ...valueColumns,
          },
          type: sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      const wasInserted = upsertResult?.inserted === true;
      results[attributeName] = { 
        id: `${userId}-${attrDef.id}`, 
        action: wasInserted ? 'created' : 'updated' 
      };
    }

    // Mark user as having EAV profile
    await sequelize.query(
      `UPDATE users SET "profileEavEnabled" = true WHERE id = :userId`,
      { replacements: { userId }, transaction }
    );

    await transaction.commit();
    
    const processedCount = Object.keys(results).filter(k => !results[k].error).length;
    return { success: true, processedCount, results };

  } catch (error) {
    await transaction.rollback();
    return { success: false, error: error.message };
  }
}

/**
 * Delete a profile attribute
 * @param {string} userId - The user's UUID
 * @param {string} attributeName - The attribute name to delete
 * @returns {Promise<object>} Result with success flag
 */
async function deleteUserProfileAttribute(userId, attributeName) {
  try {
    // Delete from entity-specific table (snake_case)
    const result = await sequelize.query(
      `DELETE FROM user_attribute_values uav
       USING attribute_definitions ad, entity_types et
       WHERE uav.attribute_id = ad.id
         AND ad."entityTypeId" = et.id
         AND uav.user_id = :userId
         AND ad.name = :attributeName
         AND et.name = :entityTypeName
       RETURNING uav.user_id`,
      {
        replacements: { 
          userId, 
          attributeName,
          entityTypeName: ENTITY_TYPE_NAME,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    return { success: true, deleted: result.length > 0 };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get available profile attributes, optionally filtered by role
 * @param {string} roleCategory - Optional role category filter
 * @returns {Promise<object>} Result with success flag and data
 */
async function getAvailableProfileAttributes(roleCategory = null) {
  try {
    let whereClause = `
      WHERE et.name = :entityType
        AND ad."deletedAt" IS NULL
        AND ad."isActive" = true
    `;

    const replacements = { entityType: ENTITY_TYPE_NAME };

    if (roleCategory) {
      // Include common attributes plus role-specific
      whereClause += ` AND (ad.name LIKE 'common_%' OR ad.name LIKE :categoryPrefix)`;
      replacements.categoryPrefix = `${roleCategory}_%`;
    }

    const attrs = await sequelize.query(
      `SELECT 
         ad.id,
         ad.name,
         ad."displayName",
         ad.description,
         ad."valueType",
         ad."isRequired",
         ad."isMultiValued",
         ad."defaultValue",
         ad."validationRules",
         ad."sortOrder"
       FROM attribute_definitions ad
       JOIN entity_types et ON ad."entityTypeId" = et.id
       ${whereClause}
       ORDER BY ad."sortOrder"`,
      {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const data = attrs.map(a => ({
      id: a.id,
      name: a.name,
      displayName: a.displayName,
      description: a.description,
      valueType: a.valueType,
      isRequired: a.isRequired,
      isMultiValued: a.isMultiValued,
      defaultValue: a.defaultValue,
      validationRules: a.validationRules,
      sortOrder: a.sortOrder,
    }));

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get profile attributes for a specific category
 * @param {string} userId - The user's UUID
 * @param {string} category - The category to filter (common, student, instructor, parent, staff)
 * @returns {Promise<object>} Result with success flag and data
 */
async function getUserProfileByCategory(userId, category) {
  if (!Object.values(ATTRIBUTE_CATEGORIES).includes(category)) {
    return { 
      success: false, 
      error: `Invalid category. Must be one of: ${Object.values(ATTRIBUTE_CATEGORIES).join(', ')}` 
    };
  }

  return getUserProfile(userId, { category });
}

/**
 * Get all profile attributes grouped by category
 * @param {string} userId - The user's UUID
 * @returns {Promise<object>} Object with categories as keys
 */
async function getUserProfileGroupedByCategory(userId) {
  const profile = await getUserProfile(userId);
  
  if (!profile.success) {
    return profile;
  }

  const grouped = {};
  for (const category of Object.values(ATTRIBUTE_CATEGORIES)) {
    grouped[category] = {};
  }

  for (const [key, value] of Object.entries(profile.data)) {
    // Convert camelCase back to snake_case to check category
    const snakeCase = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    const categoryPrefix = snakeCase.split('_')[0];
    
    if (grouped[categoryPrefix]) {
      grouped[categoryPrefix][key] = value;
    } else {
      grouped.common[key] = value;
    }
  }

  return { success: true, data: grouped };
}

/**
 * Check if a user has EAV profile data
 * @param {string} userId - The user's UUID
 * @returns {Promise<boolean>} True if has profile data
 */
async function hasUserProfile(userId) {
  try {
    const result = await sequelize.query(
      `SELECT EXISTS(
         SELECT 1 FROM user_attribute_values WHERE user_id = :userId
       ) as has_profile`,
      {
        replacements: { userId },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    return result[0]?.has_profile || false;
  } catch (error) {
    console.error('Error checking user profile:', error);
    return false;
  }
}

/**
 * Copy profile template for a role
 * This sets default values for all attributes of a role
 * @param {string} userId - The user's UUID
 * @param {string} roleCategory - The role category (student, instructor, etc.)
 * @returns {Promise<object>} Results of setting defaults
 */
async function initializeProfileForRole(userId, roleCategory) {
  const availableAttrs = await getAvailableProfileAttributes(roleCategory);
  
  if (!availableAttrs.success) {
    return availableAttrs;
  }

  const defaultsToSet = {};
  for (const attr of availableAttrs.data) {
    if (attr.defaultValue !== null && attr.defaultValue !== undefined) {
      defaultsToSet[attr.name] = attr.defaultValue;
    }
  }

  if (Object.keys(defaultsToSet).length === 0) {
    return { success: true, data: {}, message: 'No defaults to set' };
  }

  return bulkSetUserProfile(userId, defaultsToSet);
}

/**
 * Enable EAV storage for a user's profile
 * @param {string} userId - The user's UUID
 * @returns {Promise<object>} Result with success flag
 */
async function enableProfileEav(userId) {
  await sequelize.query(
    `UPDATE users SET "profileEavEnabled" = true WHERE id = :userId`,
    { replacements: { userId } }
  );
  return { success: true };
}

/**
 * Disable EAV storage for a user's profile
 * @param {string} userId - The user's UUID
 * @returns {Promise<object>} Result with success flag
 */
async function disableProfileEav(userId) {
  await sequelize.query(
    `UPDATE users SET "profileEavEnabled" = false WHERE id = :userId`,
    { replacements: { userId } }
  );
  return { success: true };
}

/**
 * Check if EAV is enabled for a user's profile
 * @param {string} userId - The user's UUID
 * @returns {Promise<boolean>} Whether EAV is enabled
 */
async function isProfileEavEnabled(userId) {
  const result = await sequelize.query(
    `SELECT "profileEavEnabled" FROM users WHERE id = :userId`,
    {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT,
    }
  );
  return result[0]?.profileEavEnabled || false;
}

/**
 * Get information about which table is being used
 * Useful for debugging and monitoring
 * @returns {Promise<object>} Configuration info
 */
async function getEavTableInfo() {
  return {
    entityType: ENTITY_TYPE_NAME,
    tableName: 'user_attribute_values',
    description: 'Entity-specific EAV table with proper foreign key constraints',
  };
}

module.exports = {
  getUserProfile,
  getUserProfileWithDetails,
  setUserProfileAttribute,
  bulkSetUserProfile,
  deleteUserProfileAttribute,
  getAvailableProfileAttributes,
  getUserProfileByCategory,
  getUserProfileGroupedByCategory,
  hasUserProfile,
  initializeProfileForRole,
  enableProfileEav,
  disableProfileEav,
  isProfileEavEnabled,
  // Utility functions
  getEavTableInfo,
  clearCache,
  ENTITY_TYPE_NAME,
  ATTRIBUTE_CATEGORIES,
};
