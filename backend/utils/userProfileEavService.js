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
 * === Entity-Specific Table Support ===
 * This service now supports both the generic attribute_values table and
 * the entity-specific user_attribute_values table. The feature flag
 * `useEntitySpecificTable` on the EntityType determines which is used.
 * 
 * Benefits of entity-specific table:
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
 * Get the User entity type configuration, including feature flags
 * @returns {Promise<object|null>} Entity type config or null
 */
async function getEntityTypeConfig() {
  const now = Date.now();
  
  if (entityTypeCache && entityTypeCacheTimestamp && (now - entityTypeCacheTimestamp) < CACHE_TTL) {
    return entityTypeCache;
  }
  
  const [config] = await sequelize.query(
    `SELECT id, name, "tableName", "useEntitySpecificTable"
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
 * Check if entity-specific table should be used
 * @returns {Promise<boolean>}
 */
async function shouldUseEntitySpecificTable() {
  const config = await getEntityTypeConfig();
  return config?.useEntitySpecificTable === true;
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
  const useSpecificTable = await shouldUseEntitySpecificTable();

  let whereClause;
  let fromClause;
  const replacements = { userId };

  if (useSpecificTable) {
    // Use entity-specific user_attribute_values table
    fromClause = `
      FROM user_attribute_values uav
      JOIN attribute_definitions ad ON uav."attributeId" = ad.id
      JOIN entity_types et ON ad."entityTypeId" = et.id
    `;
    whereClause = `
      WHERE uav."userId" = :userId
        AND ad."deletedAt" IS NULL
        AND ad."isActive" = true
    `;
  } else {
    // Use generic attribute_values table (legacy)
    fromClause = `
      FROM attribute_values av
      JOIN attribute_definitions ad ON av."attributeId" = ad.id
      JOIN entity_types et ON ad."entityTypeId" = et.id
    `;
    whereClause = `
      WHERE av."entityId" = :userId
        AND av."entityType" = :entityType
        AND av."deletedAt" IS NULL
        AND ad."deletedAt" IS NULL
        AND ad."isActive" = true
    `;
    replacements.entityType = ENTITY_TYPE_NAME;
  }

  if (category) {
    whereClause += ` AND ad.name LIKE :categoryPrefix`;
    replacements.categoryPrefix = `${category}_%`;
  }

  if (attributeNames && attributeNames.length > 0) {
    whereClause += ` AND ad.name IN (:attributeNames)`;
    replacements.attributeNames = attributeNames;
  }

  // Build SELECT columns based on table source
  const valueColumns = useSpecificTable 
    ? `uav."attributeId", uav."valueString", uav."valueInteger", uav."valueDecimal", 
       uav."valueBoolean", uav."valueDate", uav."valueDatetime", uav."valueText", 
       uav."valueJson", uav."sortOrder"`
    : `av.id, av."attributeId", av."valueString", av."valueInteger", av."valueDecimal", 
       av."valueBoolean", av."valueDate", av."valueDatetime", av."valueText", 
       av."valueJson", av."sortOrder"`;

  const values = await sequelize.query(
    `SELECT 
       ${valueColumns},
       ad.name as attribute_name,
       ad."displayName" as display_name,
       ad.description,
       ad."valueType"
     ${fromClause}
     ${whereClause}
     ORDER BY ad."sortOrder", ${useSpecificTable ? 'uav' : 'av'}."sortOrder"`,
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
  const useSpecificTable = await shouldUseEntitySpecificTable();

  let whereClause;
  let fromClause;
  const replacements = { userId };

  if (useSpecificTable) {
    fromClause = `
      FROM user_attribute_values uav
      JOIN attribute_definitions ad ON uav."attributeId" = ad.id
      JOIN entity_types et ON ad."entityTypeId" = et.id
    `;
    whereClause = `
      WHERE uav."userId" = :userId
        AND ad."deletedAt" IS NULL
    `;
  } else {
    fromClause = `
      FROM attribute_values av
      JOIN attribute_definitions ad ON av."attributeId" = ad.id
      JOIN entity_types et ON ad."entityTypeId" = et.id
    `;
    whereClause = `
      WHERE av."entityId" = :userId
        AND av."entityType" = :entityType
        AND av."deletedAt" IS NULL
        AND ad."deletedAt" IS NULL
    `;
    replacements.entityType = ENTITY_TYPE_NAME;
  }

  if (category) {
    whereClause += ` AND ad.name LIKE :categoryPrefix`;
    replacements.categoryPrefix = `${category}_%`;
  }

  const valueAlias = useSpecificTable ? 'uav' : 'av';
  const idColumn = useSpecificTable 
    ? `CONCAT(uav."userId", '-', uav."attributeId") as value_id`
    : `${valueAlias}.id as value_id`;

  const values = await sequelize.query(
    `SELECT 
       ${idColumn},
       ${valueAlias}."attributeId",
       ad.name as attribute_name,
       ad."displayName" as display_name,
       ad.description,
       ad."valueType",
       ad."isRequired",
       ad."validationRules",
       ${valueAlias}."valueString",
       ${valueAlias}."valueInteger",
       ${valueAlias}."valueDecimal",
       ${valueAlias}."valueBoolean",
       ${valueAlias}."valueDate",
       ${valueAlias}."valueDatetime",
       ${valueAlias}."valueText",
       ${valueAlias}."valueJson",
       ${valueAlias}."sortOrder",
       ${valueAlias}."createdAt",
       ${valueAlias}."updatedAt"
     ${fromClause}
     ${whereClause}
     ORDER BY ad."sortOrder", ${valueAlias}."sortOrder"`,
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
  const useSpecificTable = await shouldUseEntitySpecificTable();

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

    // Prepare value columns
    const valueColumns = prepareValueColumns(value, attrDef.valueType);
    let resultId;
    let wasInserted;

    if (useSpecificTable) {
      // Use entity-specific user_attribute_values table
      const [upsertResult] = await sequelize.query(
        `INSERT INTO user_attribute_values 
         ("userId", "attributeId", "valueType",
          "valueString", "valueInteger", "valueDecimal", "valueBoolean",
          "valueDate", "valueDatetime", "valueText", "valueJson",
          "sortOrder", "createdAt", "updatedAt")
         VALUES (:userId, :attributeId, :valueType,
                 :valueString, :valueInteger, :valueDecimal, :valueBoolean,
                 :valueDate, :valueDatetime, :valueText, :valueJson,
                 0, NOW(), NOW())
         ON CONFLICT ("userId", "attributeId") 
         DO UPDATE SET
           "valueString" = EXCLUDED."valueString",
           "valueInteger" = EXCLUDED."valueInteger",
           "valueDecimal" = EXCLUDED."valueDecimal",
           "valueBoolean" = EXCLUDED."valueBoolean",
           "valueDate" = EXCLUDED."valueDate",
           "valueDatetime" = EXCLUDED."valueDatetime",
           "valueText" = EXCLUDED."valueText",
           "valueJson" = EXCLUDED."valueJson",
           "updatedAt" = NOW()
         RETURNING "userId", "attributeId", (xmax = 0) AS inserted`,
        {
          replacements: {
            userId,
            attributeId: attrDef.id,
            valueType: attrDef.valueType,
            ...valueColumns,
          },
          type: sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      resultId = `${userId}-${attrDef.id}`;
      wasInserted = upsertResult?.inserted === true;
    } else {
      // Use generic attribute_values table (legacy)
      const newId = uuidv4();
      const [upsertResult] = await sequelize.query(
        `INSERT INTO attribute_values 
         (id, "attributeId", "entityType", "entityId", "valueType",
          "valueString", "valueInteger", "valueDecimal", "valueBoolean",
          "valueDate", "valueDatetime", "valueText", "valueJson",
          "sortOrder", "createdAt", "updatedAt", "deletedAt")
         VALUES (:id, :attributeId, :entityType, :entityId, :valueType,
                 :valueString, :valueInteger, :valueDecimal, :valueBoolean,
                 :valueDate, :valueDatetime, :valueText, :valueJson,
                 0, NOW(), NOW(), NULL)
         ON CONFLICT ("entityType", "entityId", "attributeId") 
         WHERE "deletedAt" IS NULL
         DO UPDATE SET
           "valueString" = EXCLUDED."valueString",
           "valueInteger" = EXCLUDED."valueInteger",
           "valueDecimal" = EXCLUDED."valueDecimal",
           "valueBoolean" = EXCLUDED."valueBoolean",
           "valueDate" = EXCLUDED."valueDate",
           "valueDatetime" = EXCLUDED."valueDatetime",
           "valueText" = EXCLUDED."valueText",
           "valueJson" = EXCLUDED."valueJson",
           "updatedAt" = NOW()
         RETURNING id, (xmax = 0) AS inserted`,
        {
          replacements: {
            id: newId,
            attributeId: attrDef.id,
            entityType: ENTITY_TYPE_NAME,
            entityId: userId,
            valueType: attrDef.valueType,
            ...valueColumns,
          },
          type: sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      resultId = upsertResult?.id || newId;
      wasInserted = upsertResult?.inserted === true;
    }

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
 * Prepare value columns based on type
 */
function prepareValueColumns(value, valueType) {
  const columns = {
    valueString: null,
    valueInteger: null,
    valueDecimal: null,
    valueBoolean: null,
    valueDate: null,
    valueDatetime: null,
    valueText: null,
    valueJson: null,
  };

  if (value === null || value === undefined) {
    return columns;
  }

  switch (valueType) {
    case 'string':
      columns.valueString = String(value).substring(0, 500);
      break;
    case 'integer':
      columns.valueInteger = parseInt(value, 10);
      break;
    case 'decimal':
      columns.valueDecimal = parseFloat(value);
      break;
    case 'boolean':
      columns.valueBoolean = Boolean(value);
      break;
    case 'date':
      columns.valueDate = value instanceof Date ? value : new Date(value);
      break;
    case 'datetime':
      columns.valueDatetime = value instanceof Date ? value : new Date(value);
      break;
    case 'text':
      columns.valueText = String(value);
      break;
    case 'json':
      columns.valueJson = typeof value === 'string' ? value : JSON.stringify(value);
      break;
    default:
      columns.valueString = String(value).substring(0, 500);
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
  const useSpecificTable = await shouldUseEntitySpecificTable();

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

      if (useSpecificTable) {
        // Use entity-specific user_attribute_values table
        const [upsertResult] = await sequelize.query(
          `INSERT INTO user_attribute_values 
           ("userId", "attributeId", "valueType",
            "valueString", "valueInteger", "valueDecimal", "valueBoolean",
            "valueDate", "valueDatetime", "valueText", "valueJson",
            "sortOrder", "createdAt", "updatedAt")
           VALUES (:userId, :attributeId, :valueType,
                   :valueString, :valueInteger, :valueDecimal, :valueBoolean,
                   :valueDate, :valueDatetime, :valueText, :valueJson,
                   0, NOW(), NOW())
           ON CONFLICT ("userId", "attributeId") 
           DO UPDATE SET
             "valueString" = EXCLUDED."valueString",
             "valueInteger" = EXCLUDED."valueInteger",
             "valueDecimal" = EXCLUDED."valueDecimal",
             "valueBoolean" = EXCLUDED."valueBoolean",
             "valueDate" = EXCLUDED."valueDate",
             "valueDatetime" = EXCLUDED."valueDatetime",
             "valueText" = EXCLUDED."valueText",
             "valueJson" = EXCLUDED."valueJson",
             "updatedAt" = NOW()
           RETURNING (xmax = 0) AS inserted`,
          {
            replacements: {
              userId,
              attributeId: attrDef.id,
              valueType: attrDef.valueType,
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
      } else {
        // Use generic attribute_values table (legacy)
        const newId = uuidv4();
        const [upsertResult] = await sequelize.query(
          `INSERT INTO attribute_values 
           (id, "attributeId", "entityType", "entityId", "valueType",
            "valueString", "valueInteger", "valueDecimal", "valueBoolean",
            "valueDate", "valueDatetime", "valueText", "valueJson",
            "sortOrder", "createdAt", "updatedAt", "deletedAt")
           VALUES (:id, :attributeId, :entityType, :entityId, :valueType,
                   :valueString, :valueInteger, :valueDecimal, :valueBoolean,
                   :valueDate, :valueDatetime, :valueText, :valueJson,
                   0, NOW(), NOW(), NULL)
           ON CONFLICT ("entityType", "entityId", "attributeId") 
           WHERE "deletedAt" IS NULL
           DO UPDATE SET
             "valueString" = EXCLUDED."valueString",
             "valueInteger" = EXCLUDED."valueInteger",
             "valueDecimal" = EXCLUDED."valueDecimal",
             "valueBoolean" = EXCLUDED."valueBoolean",
             "valueDate" = EXCLUDED."valueDate",
             "valueDatetime" = EXCLUDED."valueDatetime",
             "valueText" = EXCLUDED."valueText",
             "valueJson" = EXCLUDED."valueJson",
             "updatedAt" = NOW()
           RETURNING id, (xmax = 0) AS inserted`,
          {
            replacements: {
              id: newId,
              attributeId: attrDef.id,
              entityType: ENTITY_TYPE_NAME,
              entityId: userId,
              valueType: attrDef.valueType,
              ...valueColumns,
            },
            type: sequelize.QueryTypes.SELECT,
            transaction,
          }
        );

        const resultId = upsertResult?.id || newId;
        const wasInserted = upsertResult?.inserted === true;
        results[attributeName] = { id: resultId, action: wasInserted ? 'created' : 'updated' };
      }
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
  const useSpecificTable = await shouldUseEntitySpecificTable();

  try {
    if (useSpecificTable) {
      // Delete from entity-specific table
      const result = await sequelize.query(
        `DELETE FROM user_attribute_values uav
         USING attribute_definitions ad, entity_types et
         WHERE uav."attributeId" = ad.id
           AND ad."entityTypeId" = et.id
           AND uav."userId" = :userId
           AND ad.name = :attributeName
           AND et.name = :entityTypeName
         RETURNING uav."userId"`,
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
    } else {
      // Soft delete from generic attribute_values table (legacy)
      const result = await sequelize.query(
        `UPDATE attribute_values av
         SET "deletedAt" = NOW()
         FROM attribute_definitions ad
         JOIN entity_types et ON ad."entityTypeId" = et.id
         WHERE av."attributeId" = ad.id
           AND av."entityId" = :userId
           AND av."entityType" = :entityType
           AND ad.name = :attributeName
           AND et.name = :entityTypeName
           AND av."deletedAt" IS NULL
         RETURNING av.id`,
        {
          replacements: { 
            userId, 
            entityType: ENTITY_TYPE_NAME,
            attributeName,
            entityTypeName: ENTITY_TYPE_NAME,
          },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      return { success: true, deleted: result.length > 0 };
    }
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
      category: a.name.split('_')[0], // Extract category from name prefix
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
  try {
    const profileResult = await getUserProfile(userId, { category });
    
    if (!profileResult.success) {
      return profileResult;
    }

    // Filter to only include attributes from the specified category
    const filtered = {};
    const categoryPrefix = category.charAt(0).toUpperCase() + category.slice(1);
    
    for (const [key, value] of Object.entries(profileResult.data)) {
      if (key.startsWith(category) || key.startsWith(categoryPrefix)) {
        filtered[key] = value;
      }
    }

    return { success: true, data: filtered };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all profile attributes grouped by category
 * @param {string} userId - The user's UUID
 * @returns {Promise<object>} Object with categories as keys
 */
async function getUserProfileGroupedByCategory(userId) {
  try {
    const profileResult = await getUserProfile(userId);
    
    if (!profileResult.success) {
      return profileResult;
    }
    
    const grouped = {
      common: {},
      student: {},
      instructor: {},
      parent: {},
      staff: {},
    };

    for (const [key, value] of Object.entries(profileResult.data)) {
      // Convert camelCase back to find category
      const snakeCase = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      const category = snakeCase.split('_')[0];
      
      if (grouped[category]) {
        grouped[category][key] = value;
      } else {
        grouped.common[key] = value;
      }
    }

    return { success: true, data: grouped };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Check if a user has EAV profile data
 * @param {string} userId - The user's UUID
 * @returns {Promise<boolean>} True if has profile data
 */
async function hasUserProfile(userId) {
  const useSpecificTable = await shouldUseEntitySpecificTable();

  if (useSpecificTable) {
    const [result] = await sequelize.query(
      `SELECT COUNT(*) as count
       FROM user_attribute_values uav
       JOIN attribute_definitions ad ON uav."attributeId" = ad.id
       JOIN entity_types et ON ad."entityTypeId" = et.id
       WHERE uav."userId" = :userId
         AND et.name = :entityTypeName`,
      {
        replacements: { 
          userId, 
          entityTypeName: ENTITY_TYPE_NAME,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    return parseInt(result.count, 10) > 0;
  } else {
    const [result] = await sequelize.query(
      `SELECT COUNT(*) as count
       FROM attribute_values av
       JOIN attribute_definitions ad ON av."attributeId" = ad.id
       JOIN entity_types et ON ad."entityTypeId" = et.id
       WHERE av."entityId" = :userId
         AND av."entityType" = :entityType
         AND et.name = :entityTypeName
         AND av."deletedAt" IS NULL`,
      {
        replacements: { 
          userId, 
          entityType: ENTITY_TYPE_NAME,
          entityTypeName: ENTITY_TYPE_NAME,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    return parseInt(result.count, 10) > 0;
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
  try {
    const attrsResult = await getAvailableProfileAttributes(roleCategory);
    
    if (!attrsResult.success) {
      return attrsResult;
    }
    
    const defaults = {};
    for (const attr of attrsResult.data) {
      if (attr.defaultValue !== null && attr.defaultValue !== undefined) {
        defaults[attr.name] = attr.defaultValue;
      }
    }

    if (Object.keys(defaults).length === 0) {
      // Return the list of available attributes even if no defaults
      return { 
        success: true, 
        data: attrsResult.data.map(a => ({ name: a.name, displayName: a.displayName })),
        message: 'Profile initialized (no default values to set)',
      };
    }

    const results = await bulkSetUserProfile(userId, defaults);
    return { 
      success: true, 
      data: attrsResult.data.map(a => ({ name: a.name, displayName: a.displayName })),
      initialized: true, 
      results,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Enable EAV storage for a user's profile
 * @param {string} userId - The user's UUID
 * @returns {Promise<object>} Result with success flag
 */
async function enableProfileEav(userId) {
  try {
    await sequelize.query(
      `UPDATE users SET "profileEavEnabled" = true, "updatedAt" = NOW() WHERE id = :userId`,
      { replacements: { userId } }
    );
    return { success: true };
  } catch (error) {
    console.error('Error enabling profile EAV:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Disable EAV storage for a user's profile
 * @param {string} userId - The user's UUID
 * @returns {Promise<object>} Result with success flag
 */
async function disableProfileEav(userId) {
  try {
    await sequelize.query(
      `UPDATE users SET "profileEavEnabled" = false, "updatedAt" = NOW() WHERE id = :userId`,
      { replacements: { userId } }
    );
    return { success: true };
  } catch (error) {
    console.error('Error disabling profile EAV:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if EAV is enabled for a user's profile
 * @param {string} userId - The user's UUID
 * @returns {Promise<boolean>} Whether EAV is enabled
 */
async function isProfileEavEnabled(userId) {
  try {
    const [user] = await sequelize.query(
      `SELECT "profileEavEnabled" FROM users WHERE id = :userId`,
      {
        replacements: { userId },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    return user ? user.profileEavEnabled === true : false;
  } catch (error) {
    console.error('Error checking profile EAV status:', error);
    return false;
  }
}

/**
 * Get information about which table is being used
 * Useful for debugging and monitoring
 * @returns {Promise<object>} Configuration info
 */
async function getEavTableInfo() {
  const config = await getEntityTypeConfig();
  return {
    entityType: ENTITY_TYPE_NAME,
    useEntitySpecificTable: config?.useEntitySpecificTable || false,
    tableName: config?.useEntitySpecificTable ? 'user_attribute_values' : 'attribute_values',
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
  // New utility functions
  getEavTableInfo,
  shouldUseEntitySpecificTable,
  clearCache,
  ENTITY_TYPE_NAME,
  ATTRIBUTE_CATEGORIES,
};
