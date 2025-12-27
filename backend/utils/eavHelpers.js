/**
 * EAV (Entity-Attribute-Value) Query Helpers
 * 
 * Provides utility functions for working with the EAV tables:
 * - attribute_definitions
 * - attribute_values
 * - entity_types
 * 
 * Includes transaction support and audit logging for all operations.
 * 
 * Column Naming Convention:
 * - Database uses snake_case (value_string, attribute_id, etc.)
 * - JavaScript code uses camelCase for internal keys
 * - Raw SQL queries use snake_case column names
 */

const { sequelize } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// ============================================================================
// Constants & Types
// ============================================================================

/**
 * Maps value types to their snake_case database column names
 */
const VALUE_TYPE_DB_COLUMNS = {
  string: 'value_string',
  integer: 'value_integer',
  decimal: 'value_decimal',
  boolean: 'value_boolean',
  date: 'value_date',
  datetime: 'value_datetime',
  text: 'value_text',
  json: 'value_json',
};

/**
 * Maps value types to camelCase keys for JavaScript objects
 * @deprecated Use VALUE_TYPE_DB_COLUMNS for new code
 */
const VALUE_TYPE_COLUMNS = {
  string: 'valueString',
  integer: 'valueInteger',
  decimal: 'valueDecimal',
  boolean: 'valueBoolean',
  date: 'valueDate',
  datetime: 'valueDatetime',
  text: 'valueText',
  json: 'valueJson',
};

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Get the appropriate database column name for a value type (snake_case)
 * @param {string} valueType - The value type (string, integer, etc.)
 * @returns {string} Database column name in snake_case
 */
function getValueDbColumn(valueType) {
  return VALUE_TYPE_DB_COLUMNS[valueType] || 'value_string';
}

/**
 * Get the appropriate camelCase column key for a value type
 * @param {string} valueType - The value type (string, integer, etc.)
 * @returns {string} Column name in camelCase
 */
function getValueColumn(valueType) {
  return VALUE_TYPE_COLUMNS[valueType] || 'valueString';
}

/**
 * Extract the value from an attribute value record based on its type
 * Handles both snake_case (from raw SQL) and camelCase (from Sequelize) column names
 * @param {object} record - The attribute value record
 * @returns {any} The extracted value
 */
function extractValue(record) {
  // Support both snake_case and camelCase column names
  const snakeColumn = getValueDbColumn(record.valueType);
  const camelColumn = getValueColumn(record.valueType);
  let value = record[snakeColumn] !== undefined ? record[snakeColumn] : record[camelColumn];
  
  // Handle type conversions
  if (record.valueType === 'boolean' && value !== null) {
    return Boolean(value);
  }
  if (record.valueType === 'json' && typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  
  return value;
}

/**
 * Prepare a value for storage in the appropriate column
 * Returns object with snake_case keys for database operations
 * @param {any} value - The value to store
 * @param {string} valueType - The value type
 * @returns {object} Object with snake_case column keys
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
 * Prepare a value for storage - returns camelCase keys for Sequelize model compatibility
 * @deprecated Use prepareValueColumns for new code with raw SQL
 * @param {any} value - The value to store
 * @param {string} valueType - The value type
 * @returns {object} Object with camelCase column keys
 */
function prepareValueColumnsCamel(value, valueType) {
  const snakeCase = prepareValueColumns(value, valueType);
  return {
    valueString: snakeCase.value_string,
    valueInteger: snakeCase.value_integer,
    valueDecimal: snakeCase.value_decimal,
    valueBoolean: snakeCase.value_boolean,
    valueDate: snakeCase.value_date,
    valueDatetime: snakeCase.value_datetime,
    valueText: snakeCase.value_text,
    valueJson: snakeCase.value_json,
  };
}

/**
 * Log an EAV audit entry
 * @param {object} options - Audit log options
 * @param {string} options.entityType - The entity type name
 * @param {string} options.entityId - The entity ID
 * @param {string} options.attributeName - The attribute name
 * @param {string} options.action - Action performed (create, update, delete)
 * @param {any} options.oldValue - Previous value (for updates)
 * @param {any} options.newValue - New value
 * @param {string} [options.changedById] - ID of user who made the change
 * @param {string} [options.changeReason] - Reason for the change
 * @param {object} [options.transaction] - Sequelize transaction
 */
async function createEavAuditLog({
  entityType,
  entityId,
  attributeName,
  action,
  oldValue,
  newValue,
  changedById = null,
  changeReason = null,
  transaction = null,
}) {
  const queryOptions = transaction ? { transaction } : {};
  
  await sequelize.query(
    `INSERT INTO eav_audit_logs 
     (id, "entityType", "entityId", "attributeName", action, "oldValue", "newValue", 
      "changedById", "changeReason", "createdAt")
     VALUES (:id, :entityType, :entityId, :attributeName, :action, :oldValue, :newValue,
             :changedById, :changeReason, NOW())`,
    {
      replacements: {
        id: uuidv4(),
        entityType,
        entityId,
        attributeName,
        action,
        oldValue: oldValue !== null && oldValue !== undefined ? JSON.stringify(oldValue) : null,
        newValue: newValue !== null && newValue !== undefined ? JSON.stringify(newValue) : null,
        changedById,
        changeReason,
      },
      ...queryOptions,
    }
  );
}

/**
 * Check if EAV audit log table exists (for graceful degradation)
 * @returns {Promise<boolean>}
 */
async function auditTableExists() {
  try {
    const [result] = await sequelize.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'eav_audit_logs'
      ) as exists`,
      { type: sequelize.QueryTypes.SELECT }
    );
    return result.exists;
  } catch {
    return false;
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get all attributes for an entity
 * @param {string} entityType - The entity type name (e.g., 'Instructor', 'User', 'Course')
 * @param {string} entityId - The entity's UUID
 * @param {object} [options] - Query options
 * @param {string} [options.attributePrefix] - Filter by attribute name prefix (e.g., 'award_')
 * @param {string[]} [options.attributeNames] - Filter by specific attribute names
 * @param {boolean} [options.includeInactive] - Include inactive attribute definitions
 * @param {object} [options.transaction] - Sequelize transaction
 * @returns {Promise<object>} Object with attribute name keys and their values
 */
async function getAttributes(entityType, entityId, options = {}) {
  const {
    attributePrefix = null,
    attributeNames = null,
    includeInactive = false,
    transaction = null,
  } = options;

  const queryOptions = transaction ? { transaction, type: sequelize.QueryTypes.SELECT } : { type: sequelize.QueryTypes.SELECT };

  let whereClause = `
    WHERE av.entity_id = :entityId
      AND av.entity_type = :entityType
      AND av."deletedAt" IS NULL
      AND ad."deletedAt" IS NULL
  `;

  const replacements = { entityId, entityType };

  if (!includeInactive) {
    whereClause += ` AND ad."isActive" = true`;
  }

  if (attributePrefix) {
    whereClause += ` AND ad.name LIKE :attributePrefix`;
    replacements.attributePrefix = `${attributePrefix}%`;
  }

  if (attributeNames && attributeNames.length > 0) {
    whereClause += ` AND ad.name IN (:attributeNames)`;
    replacements.attributeNames = attributeNames;
  }

  // Note: valueType now comes from JOIN to attribute_definitions (ad."valueType")
  const values = await sequelize.query(
    `SELECT 
       av.id,
       av.attribute_id as "attributeId",
       ad.name as "attributeName",
       ad."displayName",
       ad.description as "attributeDescription",
       ad."valueType",
       ad."isRequired",
       ad."isMultiValued",
       av.value_string as "valueString",
       av.value_integer as "valueInteger",
       av.value_decimal as "valueDecimal",
       av.value_boolean as "valueBoolean",
       av.value_date as "valueDate",
       av.value_datetime as "valueDatetime",
       av.value_text as "valueText",
       av.value_json as "valueJson",
       av.sort_order as "sortOrder",
       av."createdAt",
       av."updatedAt"
     FROM attribute_values av
     JOIN attribute_definitions ad ON av.attribute_id = ad.id
     ${whereClause}
     ORDER BY ad."sortOrder", av.sort_order, av."createdAt"`,
    {
      replacements,
      ...queryOptions,
    }
  );

  // Group values by attribute name
  const result = {};
  
  for (const record of values) {
    const attrName = record.attributeName;
    const value = extractValue({ ...record, valueType: record.valueType });
    
    if (record.isMultiValued) {
      // Multi-valued attributes are stored as arrays
      if (!result[attrName]) {
        result[attrName] = [];
      }
      result[attrName].push({
        id: record.id,
        value,
        sortOrder: record.sortOrder,
      });
    } else {
      // Single-valued attributes
      result[attrName] = value;
    }
  }

  return result;
}

/**
 * Get all attributes with full metadata for an entity
 * @param {string} entityType - The entity type name
 * @param {string} entityId - The entity's UUID
 * @param {object} [options] - Query options (same as getAttributes)
 * @returns {Promise<Array>} Array of attribute objects with full metadata
 */
async function getAttributesWithMetadata(entityType, entityId, options = {}) {
  const {
    attributePrefix = null,
    attributeNames = null,
    includeInactive = false,
    transaction = null,
  } = options;

  const queryOptions = transaction ? { transaction, type: sequelize.QueryTypes.SELECT } : { type: sequelize.QueryTypes.SELECT };

  let whereClause = `
    WHERE av.entity_id = :entityId
      AND av.entity_type = :entityType
      AND av."deletedAt" IS NULL
      AND ad."deletedAt" IS NULL
  `;

  const replacements = { entityId, entityType };

  if (!includeInactive) {
    whereClause += ` AND ad."isActive" = true`;
  }

  if (attributePrefix) {
    whereClause += ` AND ad.name LIKE :attributePrefix`;
    replacements.attributePrefix = `${attributePrefix}%`;
  }

  if (attributeNames && attributeNames.length > 0) {
    whereClause += ` AND ad.name IN (:attributeNames)`;
    replacements.attributeNames = attributeNames;
  }

  // Note: valueType now comes from JOIN to attribute_definitions
  const values = await sequelize.query(
    `SELECT 
       av.id as "valueId",
       av.attribute_id as "attributeId",
       ad.name as "attributeName",
       ad."displayName",
       ad.description as "attributeDescription",
       ad."valueType",
       ad."isRequired",
       ad."isMultiValued",
       ad."validationRules",
       ad."defaultValue",
       av.value_string as "valueString",
       av.value_integer as "valueInteger",
       av.value_decimal as "valueDecimal",
       av.value_boolean as "valueBoolean",
       av.value_date as "valueDate",
       av.value_datetime as "valueDatetime",
       av.value_text as "valueText",
       av.value_json as "valueJson",
       av.sort_order as "sortOrder",
       av."createdAt",
       av."updatedAt"
     FROM attribute_values av
     JOIN attribute_definitions ad ON av.attribute_id = ad.id
     ${whereClause}
     ORDER BY ad."sortOrder", av.sort_order, av."createdAt"`,
    {
      replacements,
      ...queryOptions,
    }
  );

  return values.map(record => ({
    valueId: record.valueId,
    attributeId: record.attributeId,
    attributeName: record.attributeName,
    displayName: record.displayName,
    description: record.attributeDescription,
    valueType: record.valueType,
    isRequired: record.isRequired,
    isMultiValued: record.isMultiValued,
    validationRules: record.validationRules,
    defaultValue: record.defaultValue,
    value: extractValue({ ...record, valueType: record.valueType }),
    sortOrder: record.sortOrder,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }));
}

/**
 * Set a single attribute value for an entity
 * @param {string} entityType - The entity type name
 * @param {string} entityId - The entity's UUID
 * @param {string} attributeName - The attribute name to set
 * @param {any} value - The value to set
 * @param {object} [options] - Set options
 * @param {number} [options.sortOrder] - Sort order for multi-valued attributes
 * @param {string} [options.changedById] - ID of user making the change
 * @param {string} [options.changeReason] - Reason for the change
 * @param {boolean} [options.createAuditLog] - Whether to create audit log (default: true)
 * @param {object} [options.transaction] - Sequelize transaction (will create one if not provided)
 * @returns {Promise<object>} The created/updated attribute value record
 */
async function setAttribute(entityType, entityId, attributeName, value, options = {}) {
  const {
    sortOrder = 0,
    changedById = null,
    changeReason = null,
    createAuditLog: shouldAudit = true,
    transaction: externalTransaction = null,
  } = options;

  const transaction = externalTransaction || await sequelize.transaction();
  const isExternalTransaction = !!externalTransaction;

  try {
    // Get the entity type record
    const [entityTypeRecord] = await sequelize.query(
      `SELECT id FROM entity_types WHERE name = :entityType AND "deletedAt" IS NULL`,
      {
        replacements: { entityType },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    if (!entityTypeRecord) {
      throw new Error(`Entity type '${entityType}' not found`);
    }

    // Get the attribute definition
    const [attrDef] = await sequelize.query(
      `SELECT id, name, "valueType", "isMultiValued", "isRequired", "validationRules"
       FROM attribute_definitions 
       WHERE "entityTypeId" = :entityTypeId AND name = :attributeName AND "deletedAt" IS NULL`,
      {
        replacements: { entityTypeId: entityTypeRecord.id, attributeName },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    if (!attrDef) {
      throw new Error(`Attribute '${attributeName}' not found for entity type '${entityType}'`);
    }

    // Validate required attribute
    if (attrDef.isRequired && (value === null || value === undefined || value === '')) {
      throw new Error(`Attribute '${attributeName}' is required`);
    }

    // Check for existing value (for single-valued attributes)
    let existingValue = null;
    let existingRecord = null;

    if (!attrDef.isMultiValued) {
      [existingRecord] = await sequelize.query(
        `SELECT * FROM attribute_values 
         WHERE attribute_id = :attributeId 
           AND entity_id = :entityId 
           AND entity_type = :entityType
           AND "deletedAt" IS NULL`,
        {
          replacements: { 
            attributeId: attrDef.id, 
            entityId, 
            entityType 
          },
          type: sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      if (existingRecord) {
        existingValue = extractValue({ ...existingRecord, valueType: attrDef.valueType });
      }
    }

    // Prepare value columns (snake_case for DB)
    const valueColumns = prepareValueColumns(value, attrDef.valueType);
    const valueId = uuidv4();

    let result;

    if (existingRecord && !attrDef.isMultiValued) {
      // Update existing value
      await sequelize.query(
        `UPDATE attribute_values 
         SET value_string = :value_string,
             value_integer = :value_integer,
             value_decimal = :value_decimal,
             value_boolean = :value_boolean,
             value_date = :value_date,
             value_datetime = :value_datetime,
             value_text = :value_text,
             value_json = :value_json,
             sort_order = :sort_order,
             "updatedAt" = NOW()
         WHERE id = :id`,
        {
          replacements: {
            id: existingRecord.id,
            ...valueColumns,
            sort_order: sortOrder,
          },
          transaction,
        }
      );

      result = { id: existingRecord.id, action: 'updated' };

      // Create audit log for update
      if (shouldAudit && await auditTableExists()) {
        await createEavAuditLog({
          entityType,
          entityId,
          attributeName,
          action: 'update',
          oldValue: existingValue,
          newValue: value,
          changedById,
          changeReason,
          transaction,
        });
      }
    } else {
      // Insert new value (valueType removed - derived from attribute_definitions)
      await sequelize.query(
        `INSERT INTO attribute_values 
         (id, attribute_id, entity_type, entity_id,
          value_string, value_integer, value_decimal, value_boolean,
          value_date, value_datetime, value_text, value_json,
          sort_order, "createdAt", "updatedAt")
         VALUES (:id, :attribute_id, :entity_type, :entity_id,
                 :value_string, :value_integer, :value_decimal, :value_boolean,
                 :value_date, :value_datetime, :value_text, :value_json,
                 :sort_order, NOW(), NOW())`,
        {
          replacements: {
            id: valueId,
            attribute_id: attrDef.id,
            entity_type: entityType,
            entity_id: entityId,
            ...valueColumns,
            sort_order: sortOrder,
          },
          transaction,
        }
      );

      result = { id: valueId, action: 'created' };

      // Create audit log for create
      if (shouldAudit && await auditTableExists()) {
        await createEavAuditLog({
          entityType,
          entityId,
          attributeName,
          action: 'create',
          oldValue: null,
          newValue: value,
          changedById,
          changeReason,
          transaction,
        });
      }
    }

    if (!isExternalTransaction) {
      await transaction.commit();
    }

    return {
      ...result,
      attributeName,
      value,
      valueType: attrDef.valueType,
    };

  } catch (error) {
    if (!isExternalTransaction) {
      await transaction.rollback();
    }
    throw error;
  }
}

/**
 * Set multiple attribute values for an entity in a single transaction
 * @param {string} entityType - The entity type name
 * @param {string} entityId - The entity's UUID
 * @param {object} attributes - Object with attribute names as keys and values
 * @param {object} [options] - Set options
 * @param {string} [options.changedById] - ID of user making the change
 * @param {string} [options.changeReason] - Reason for the changes
 * @param {boolean} [options.createAuditLog] - Whether to create audit logs (default: true)
 * @param {object} [options.transaction] - Sequelize transaction (will create one if not provided)
 * @returns {Promise<object>} Results for each attribute
 */
async function bulkSetAttributes(entityType, entityId, attributes, options = {}) {
  const {
    changedById = null,
    changeReason = null,
    createAuditLog: shouldAudit = true,
    transaction: externalTransaction = null,
  } = options;

  const transaction = externalTransaction || await sequelize.transaction();
  const isExternalTransaction = !!externalTransaction;

  try {
    // Get the entity type record
    const [entityTypeRecord] = await sequelize.query(
      `SELECT id FROM entity_types WHERE name = :entityType AND "deletedAt" IS NULL`,
      {
        replacements: { entityType },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    if (!entityTypeRecord) {
      throw new Error(`Entity type '${entityType}' not found`);
    }

    // Get all relevant attribute definitions
    const attributeNames = Object.keys(attributes);
    const attrDefs = await sequelize.query(
      `SELECT id, name, "valueType", "isMultiValued", "isRequired", "validationRules"
       FROM attribute_definitions 
       WHERE "entityTypeId" = :entityTypeId 
         AND name IN (:attributeNames) 
         AND "deletedAt" IS NULL`,
      {
        replacements: { entityTypeId: entityTypeRecord.id, attributeNames },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    const attrDefMap = new Map(attrDefs.map(a => [a.name, a]));

    // Validate all attributes exist
    const missingAttrs = attributeNames.filter(name => !attrDefMap.has(name));
    if (missingAttrs.length > 0) {
      throw new Error(`Attributes not found: ${missingAttrs.join(', ')}`);
    }

    // Get existing values for single-valued attributes
    const singleValuedAttrIds = attrDefs
      .filter(a => !a.isMultiValued)
      .map(a => a.id);

    let existingValuesMap = new Map();
    if (singleValuedAttrIds.length > 0) {
      const existingValues = await sequelize.query(
        `SELECT av.*, ad.name as "attributeName", ad."valueType"
         FROM attribute_values av
         JOIN attribute_definitions ad ON av.attribute_id = ad.id
         WHERE av.attribute_id IN (:attributeIds) 
           AND av.entity_id = :entityId 
           AND av.entity_type = :entityType
           AND av."deletedAt" IS NULL`,
        {
          replacements: { 
            attributeIds: singleValuedAttrIds, 
            entityId, 
            entityType 
          },
          type: sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      for (const ev of existingValues) {
        const attrDef = attrDefMap.get(ev.attributeName);
        existingValuesMap.set(ev.attributeName, {
          record: ev,
          value: extractValue({ ...ev, valueType: attrDef.valueType }),
        });
      }
    }

    const results = {};
    const auditLogs = [];
    const canAudit = shouldAudit && await auditTableExists();

    // Process each attribute
    for (const [attributeName, value] of Object.entries(attributes)) {
      const attrDef = attrDefMap.get(attributeName);

      // Validate required attribute
      if (attrDef.isRequired && (value === null || value === undefined || value === '')) {
        throw new Error(`Attribute '${attributeName}' is required`);
      }

      const valueColumns = prepareValueColumns(value, attrDef.valueType);
      const existing = existingValuesMap.get(attributeName);

      if (existing && !attrDef.isMultiValued) {
        // Update existing value
        await sequelize.query(
          `UPDATE attribute_values 
           SET value_string = :value_string,
               value_integer = :value_integer,
               value_decimal = :value_decimal,
               value_boolean = :value_boolean,
               value_date = :value_date,
               value_datetime = :value_datetime,
               value_text = :value_text,
               value_json = :value_json,
               "updatedAt" = NOW()
           WHERE id = :id`,
          {
            replacements: {
              id: existing.record.id,
              ...valueColumns,
            },
            transaction,
          }
        );

        results[attributeName] = { id: existing.record.id, action: 'updated' };

        if (canAudit) {
          auditLogs.push({
            entityType,
            entityId,
            attributeName,
            action: 'update',
            oldValue: existing.value,
            newValue: value,
            changedById,
            changeReason,
          });
        }
      } else {
        // Insert new value (valueType removed - derived from attribute_definitions)
        const valueId = uuidv4();
        await sequelize.query(
          `INSERT INTO attribute_values 
           (id, attribute_id, entity_type, entity_id,
            value_string, value_integer, value_decimal, value_boolean,
            value_date, value_datetime, value_text, value_json,
            sort_order, "createdAt", "updatedAt")
           VALUES (:id, :attribute_id, :entity_type, :entity_id,
                   :value_string, :value_integer, :value_decimal, :value_boolean,
                   :value_date, :value_datetime, :value_text, :value_json,
                   0, NOW(), NOW())`,
          {
            replacements: {
              id: valueId,
              attribute_id: attrDef.id,
              entity_type: entityType,
              entity_id: entityId,
              ...valueColumns,
            },
            transaction,
          }
        );

        results[attributeName] = { id: valueId, action: 'created' };

        if (canAudit) {
          auditLogs.push({
            entityType,
            entityId,
            attributeName,
            action: 'create',
            oldValue: null,
            newValue: value,
            changedById,
            changeReason,
          });
        }
      }
    }

    // Create all audit logs
    for (const log of auditLogs) {
      await createEavAuditLog({ ...log, transaction });
    }

    if (!isExternalTransaction) {
      await transaction.commit();
    }

    return results;

  } catch (error) {
    if (!isExternalTransaction) {
      await transaction.rollback();
    }
    throw error;
  }
}

/**
 * Delete an attribute value
 * @param {string} entityType - The entity type name
 * @param {string} entityId - The entity's UUID
 * @param {string} attributeName - The attribute name to delete
 * @param {object} [options] - Delete options
 * @param {string} [options.valueId] - Specific value ID (for multi-valued attributes)
 * @param {string} [options.changedById] - ID of user making the change
 * @param {string} [options.changeReason] - Reason for the deletion
 * @param {boolean} [options.createAuditLog] - Whether to create audit log (default: true)
 * @param {boolean} [options.hardDelete] - Whether to permanently delete (default: false, uses soft delete)
 * @param {object} [options.transaction] - Sequelize transaction
 * @returns {Promise<number>} Number of deleted values
 */
async function deleteAttribute(entityType, entityId, attributeName, options = {}) {
  const {
    valueId = null,
    changedById = null,
    changeReason = null,
    createAuditLog: shouldAudit = true,
    hardDelete = false,
    transaction: externalTransaction = null,
  } = options;

  const transaction = externalTransaction || await sequelize.transaction();
  const isExternalTransaction = !!externalTransaction;

  try {
    // Get the attribute definition
    const [attrDef] = await sequelize.query(
      `SELECT ad.id, ad."valueType"
       FROM attribute_definitions ad
       JOIN entity_types et ON ad."entityTypeId" = et.id
       WHERE et.name = :entityType AND ad.name = :attributeName AND ad."deletedAt" IS NULL`,
      {
        replacements: { entityType, attributeName },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    if (!attrDef) {
      throw new Error(`Attribute '${attributeName}' not found for entity type '${entityType}'`);
    }

    // Build the WHERE clause (snake_case columns)
    let whereClause = `attribute_id = :attributeId AND entity_id = :entityId AND entity_type = :entityType`;
    const replacements = { attributeId: attrDef.id, entityId, entityType };

    if (valueId) {
      whereClause += ` AND id = :valueId`;
      replacements.valueId = valueId;
    }

    if (!hardDelete) {
      whereClause += ` AND "deletedAt" IS NULL`;
    }

    // Get existing values for audit log
    let existingValues = [];
    if (shouldAudit && await auditTableExists()) {
      existingValues = await sequelize.query(
        `SELECT * FROM attribute_values WHERE ${whereClause}`,
        {
          replacements,
          type: sequelize.QueryTypes.SELECT,
          transaction,
        }
      );
    }

    // Perform delete
    let deletedCount;
    if (hardDelete) {
      const [, result] = await sequelize.query(
        `DELETE FROM attribute_values WHERE ${whereClause}`,
        { replacements, transaction }
      );
      deletedCount = result?.rowCount || existingValues.length;
    } else {
      const [, result] = await sequelize.query(
        `UPDATE attribute_values SET "deletedAt" = NOW() WHERE ${whereClause}`,
        { replacements, transaction }
      );
      deletedCount = result?.rowCount || existingValues.length;
    }

    // Create audit logs
    if (existingValues.length > 0 && shouldAudit) {
      for (const ev of existingValues) {
        const oldValue = extractValue({ ...ev, valueType: attrDef.valueType });
        await createEavAuditLog({
          entityType,
          entityId,
          attributeName,
          action: 'delete',
          oldValue,
          newValue: null,
          changedById,
          changeReason,
          transaction,
        });
      }
    }

    if (!isExternalTransaction) {
      await transaction.commit();
    }

    return deletedCount;

  } catch (error) {
    if (!isExternalTransaction) {
      await transaction.rollback();
    }
    throw error;
  }
}

/**
 * Get attribute definitions for an entity type
 * @param {string} entityType - The entity type name
 * @param {object} [options] - Query options
 * @param {boolean} [options.includeInactive] - Include inactive definitions
 * @param {string} [options.attributePrefix] - Filter by attribute name prefix
 * @param {object} [options.transaction] - Sequelize transaction
 * @returns {Promise<Array>} Array of attribute definitions
 */
async function getAttributeDefinitions(entityType, options = {}) {
  const {
    includeInactive = false,
    attributePrefix = null,
    transaction = null,
  } = options;

  const queryOptions = transaction ? { transaction, type: sequelize.QueryTypes.SELECT } : { type: sequelize.QueryTypes.SELECT };

  let whereClause = `WHERE et.name = :entityType AND ad."deletedAt" IS NULL`;
  const replacements = { entityType };

  if (!includeInactive) {
    whereClause += ` AND ad."isActive" = true`;
  }

  if (attributePrefix) {
    whereClause += ` AND ad.name LIKE :attributePrefix`;
    replacements.attributePrefix = `${attributePrefix}%`;
  }

  return sequelize.query(
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
       ad."sortOrder",
       ad."isActive"
     FROM attribute_definitions ad
     JOIN entity_types et ON ad."entityTypeId" = et.id
     ${whereClause}
     ORDER BY ad."sortOrder", ad.name`,
    {
      replacements,
      ...queryOptions,
    }
  );
}

/**
 * Find entities by attribute value
 * @param {string} entityType - The entity type name
 * @param {string} attributeName - The attribute name to search
 * @param {any} value - The value to search for
 * @param {object} [options] - Search options
 * @param {string} [options.operator] - Comparison operator (eq, ne, gt, lt, gte, lte, like, in)
 * @param {number} [options.limit] - Maximum results to return
 * @param {number} [options.offset] - Offset for pagination
 * @param {object} [options.transaction] - Sequelize transaction
 * @returns {Promise<Array>} Array of entity IDs matching the criteria
 */
async function findEntitiesByAttribute(entityType, attributeName, value, options = {}) {
  const {
    operator = 'eq',
    limit = 100,
    offset = 0,
    transaction = null,
  } = options;

  const queryOptions = transaction ? { transaction, type: sequelize.QueryTypes.SELECT } : { type: sequelize.QueryTypes.SELECT };

  // Get attribute definition to determine value type
  const [attrDef] = await sequelize.query(
    `SELECT ad.id, ad."valueType"
     FROM attribute_definitions ad
     JOIN entity_types et ON ad."entityTypeId" = et.id
     WHERE et.name = :entityType AND ad.name = :attributeName AND ad."deletedAt" IS NULL`,
    {
      replacements: { entityType, attributeName },
      ...queryOptions,
    }
  );

  if (!attrDef) {
    throw new Error(`Attribute '${attributeName}' not found for entity type '${entityType}'`);
  }

  const valueColumn = getValueDbColumn(attrDef.valueType);  // Use snake_case DB column
  const replacements = { entityType, attributeId: attrDef.id, limit, offset };

  // Build comparison clause (using snake_case columns)
  let comparison;
  switch (operator) {
    case 'eq':
      comparison = `${valueColumn} = :value`;
      replacements.value = value;
      break;
    case 'ne':
      comparison = `${valueColumn} != :value`;
      replacements.value = value;
      break;
    case 'gt':
      comparison = `${valueColumn} > :value`;
      replacements.value = value;
      break;
    case 'lt':
      comparison = `${valueColumn} < :value`;
      replacements.value = value;
      break;
    case 'gte':
      comparison = `${valueColumn} >= :value`;
      replacements.value = value;
      break;
    case 'lte':
      comparison = `${valueColumn} <= :value`;
      replacements.value = value;
      break;
    case 'like':
      comparison = `${valueColumn} LIKE :value`;
      replacements.value = `%${value}%`;
      break;
    case 'in':
      comparison = `${valueColumn} IN (:value)`;
      replacements.value = Array.isArray(value) ? value : [value];
      break;
    default:
      comparison = `${valueColumn} = :value`;
      replacements.value = value;
  }

  const results = await sequelize.query(
    `SELECT DISTINCT entity_id as "entityId"
     FROM attribute_values
     WHERE entity_type = :entityType
       AND attribute_id = :attributeId
       AND ${comparison}
       AND "deletedAt" IS NULL
     ORDER BY entity_id
     LIMIT :limit OFFSET :offset`,
    {
      replacements,
      ...queryOptions,
    }
  );

  return results.map(r => r.entityId);
}

// ============================================================================
// Migration / Setup Helpers
// ============================================================================

/**
 * Create EAV audit log table if it doesn't exist
 * @returns {Promise<void>}
 */
async function ensureAuditTableExists() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS eav_audit_logs (
      id UUID PRIMARY KEY,
      "entityType" VARCHAR(100) NOT NULL,
      "entityId" UUID NOT NULL,
      "attributeName" VARCHAR(100) NOT NULL,
      action VARCHAR(20) NOT NULL,
      "oldValue" TEXT,
      "newValue" TEXT,
      "changedById" UUID,
      "changeReason" TEXT,
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // Create indexes
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_eav_audit_entity 
    ON eav_audit_logs ("entityType", "entityId")
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_eav_audit_attribute 
    ON eav_audit_logs ("attributeName")
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_eav_audit_created 
    ON eav_audit_logs ("createdAt")
  `);
}

/**
 * Get audit logs for an entity
 * @param {string} entityType - The entity type name
 * @param {string} entityId - The entity's UUID
 * @param {object} [options] - Query options
 * @param {string} [options.attributeName] - Filter by attribute name
 * @param {Date} [options.since] - Filter logs after this date
 * @param {number} [options.limit] - Maximum results
 * @param {object} [options.transaction] - Sequelize transaction
 * @returns {Promise<Array>} Array of audit log entries
 */
async function getAuditLogs(entityType, entityId, options = {}) {
  const {
    attributeName = null,
    since = null,
    limit = 100,
    transaction = null,
  } = options;

  if (!await auditTableExists()) {
    return [];
  }

  const queryOptions = transaction ? { transaction, type: sequelize.QueryTypes.SELECT } : { type: sequelize.QueryTypes.SELECT };

  let whereClause = `WHERE "entityType" = :entityType AND "entityId" = :entityId`;
  const replacements = { entityType, entityId, limit };

  if (attributeName) {
    whereClause += ` AND "attributeName" = :attributeName`;
    replacements.attributeName = attributeName;
  }

  if (since) {
    whereClause += ` AND "createdAt" >= :since`;
    replacements.since = since;
  }

  return sequelize.query(
    `SELECT * FROM eav_audit_logs ${whereClause} ORDER BY "createdAt" DESC LIMIT :limit`,
    {
      replacements,
      ...queryOptions,
    }
  );
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  // Core query functions
  getAttributes,
  getAttributesWithMetadata,
  setAttribute,
  bulkSetAttributes,
  deleteAttribute,
  
  // Discovery & search functions
  getAttributeDefinitions,
  findEntitiesByAttribute,
  
  // Audit functions
  getAuditLogs,
  ensureAuditTableExists,
  
  // Helper utilities
  extractValue,
  prepareValueColumns,
  prepareValueColumnsCamel,  // Legacy compatibility
  getValueColumn,
  getValueDbColumn,           // New snake_case column names
  VALUE_TYPE_COLUMNS,         // camelCase mapping
  VALUE_TYPE_DB_COLUMNS,      // snake_case mapping
};
