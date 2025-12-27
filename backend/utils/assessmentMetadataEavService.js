/**
 * Assessment Metadata EAV Service
 * 
 * Provides extensible metadata storage for assessments using entity-specific EAV tables.
 * This allows adding custom attributes to assessments without schema changes.
 * 
 * Default metadata attributes include:
 * - grading_rubric: Detailed grading criteria (text)
 * - difficulty_level: Assessment difficulty (Easy, Medium, Hard, Expert)
 * - estimated_duration: Expected completion time in minutes
 * - prerequisite_topics: Topics students should know before taking
 * - learning_objectives: What students should learn from this assessment
 * - instructor_notes: Private notes for instructors
 * - proctoring_required: Whether proctoring is required (boolean)
 * - calculator_allowed: Whether calculator use is allowed (boolean)
 * - reference_materials: Allowed reference materials (text)
 * - accommodation_notes: Notes for accessibility accommodations
 * - assessment_weight: Weight in final grade calculation (decimal)
 * - retry_delay_hours: Hours between retry attempts (integer)
 * 
 * === Entity-Specific Table ===
 * Uses assessment_attribute_values table exclusively with proper FK constraints.
 */

const { sequelize } = require('../config/db');

const ENTITY_TYPE_NAME = 'Assessment';

/**
 * Get all metadata for an assessment
 * @param {string} assessmentId - The assessment's UUID
 * @returns {Promise<object>} Object with metadata key-value pairs
 */
async function getAssessmentMetadata(assessmentId) {
  const values = await sequelize.query(
    `SELECT 
       aav.assessment_id,
       aav.attribute_id as "attributeId",
       ad.name as attribute_name,
       ad."displayName" as attribute_display_name,
       ad.description as attribute_description,
       ad."valueType",
       aav.value_string as "valueString",
       aav.value_integer as "valueInteger",
       aav.value_decimal as "valueDecimal",
       aav.value_boolean as "valueBoolean",
       aav.value_text as "valueText",
       aav.value_json as "valueJson",
       aav.sort_order as "sortOrder"
     FROM assessment_attribute_values aav
     JOIN attribute_definitions ad ON aav.attribute_id = ad.id
     WHERE aav.assessment_id = :assessmentId
       AND ad."deletedAt" IS NULL
     ORDER BY ad."sortOrder", aav.sort_order`,
    {
      replacements: { assessmentId },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  if (values.length === 0) {
    return {};
  }

  // Convert to a simple key-value object
  const metadata = {};
  
  for (const value of values) {
    const attrName = value.attribute_name;
    let attrValue = extractValue(value);

    // Convert snake_case to camelCase for API consistency
    const camelCaseName = attrName.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
    metadata[camelCaseName] = attrValue;
  }

  return metadata;
}

/**
 * Extract value based on type
 */
function extractValue(record) {
  switch (record.valueType) {
    case 'string':
      return record.valueString;
    case 'integer':
      return record.valueInteger !== null ? parseInt(record.valueInteger, 10) : null;
    case 'decimal':
      return record.valueDecimal !== null ? parseFloat(record.valueDecimal) : null;
    case 'boolean':
      return record.valueBoolean;
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
 * Get metadata with full attribute details
 * @param {string} assessmentId - The assessment's UUID
 * @returns {Promise<Array>} Array of metadata objects with full info
 */
async function getAssessmentMetadataWithDetails(assessmentId) {
  const values = await sequelize.query(
    `SELECT 
       CONCAT(aav.assessment_id, '-', aav.attribute_id) as value_id,
       aav.attribute_id as "attributeId",
       ad.name as attribute_name,
       ad."displayName",
       ad.description,
       ad."valueType",
       ad."isRequired",
       ad."validationRules",
       aav.value_string as "valueString",
       aav.value_integer as "valueInteger",
       aav.value_decimal as "valueDecimal",
       aav.value_boolean as "valueBoolean",
       aav.value_text as "valueText",
       aav.value_json as "valueJson",
       aav.sort_order as "sortOrder",
       aav."createdAt",
       aav."updatedAt"
     FROM assessment_attribute_values aav
     JOIN attribute_definitions ad ON aav.attribute_id = ad.id
     WHERE aav.assessment_id = :assessmentId
       AND ad."deletedAt" IS NULL
     ORDER BY ad."sortOrder", aav.sort_order`,
    {
      replacements: { assessmentId },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  return values.map(v => ({
    valueId: v.value_id,
    attributeId: v.attributeId,
    name: v.attribute_name,
    displayName: v.displayName,
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
 * Set a single metadata attribute for an assessment using upsert pattern
 * @param {string} assessmentId - The assessment's UUID
 * @param {string} attributeName - The attribute name (snake_case)
 * @param {any} value - The value to set
 * @returns {Promise<object>} The created/updated attribute value
 */
async function setAssessmentMetadata(assessmentId, attributeName, value) {
  const transaction = await sequelize.transaction();

  try {
    // Get entity type
    const [entityType] = await sequelize.query(
      `SELECT id FROM entity_types WHERE name = :name AND "deletedAt" IS NULL`,
      {
        replacements: { name: ENTITY_TYPE_NAME },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    if (!entityType) {
      throw new Error('Assessment entity type not found in EAV system. Run migration script first.');
    }

    // Get attribute definition
    const [attrDef] = await sequelize.query(
      `SELECT id, "valueType", "isRequired", "validationRules" 
       FROM attribute_definitions 
       WHERE "entityTypeId" = :entityTypeId AND name = :name AND "deletedAt" IS NULL`,
      {
        replacements: { entityTypeId: entityType.id, name: attributeName },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    if (!attrDef) {
      throw new Error(`Attribute '${attributeName}' not found for Assessment entity type`);
    }

    // Validate required
    if (attrDef.isRequired && (value === null || value === undefined || value === '')) {
      throw new Error(`Attribute '${attributeName}' is required`);
    }

    // Prepare value columns
    const valueColumns = prepareValueColumns(value, attrDef.valueType);

    // Use entity-specific assessment_attribute_values table
    const [upsertResult] = await sequelize.query(
      `INSERT INTO assessment_attribute_values 
       (assessment_id, attribute_id,
        value_string, value_integer, value_decimal, value_boolean,
        value_date, value_datetime, value_text, value_json,
        sort_order, "createdAt", "updatedAt")
       VALUES (:assessment_id, :attribute_id,
               :value_string, :value_integer, :value_decimal, :value_boolean,
               :value_date, :value_datetime, :value_text, :value_json,
               0, NOW(), NOW())
       ON CONFLICT (assessment_id, attribute_id) 
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
       RETURNING assessment_id, attribute_id, (xmax = 0) AS inserted`,
      {
        replacements: {
          assessment_id: assessmentId,
          attribute_id: attrDef.id,
          ...valueColumns,
        },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    const resultId = `${assessmentId}-${attrDef.id}`;
    const wasInserted = upsertResult?.inserted === true;

    await transaction.commit();

    return {
      id: resultId,
      attributeName,
      value,
      action: wasInserted ? 'created' : 'updated',
    };

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Prepare value columns based on type
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
 * Set multiple metadata attributes in a single transaction
 * @param {string} assessmentId - The assessment's UUID
 * @param {object} metadata - Object with attribute names as keys
 * @returns {Promise<object>} Results for each attribute
 */
async function bulkSetAssessmentMetadata(assessmentId, metadata) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return { success: true, results: {}, processedCount: 0 };
  }

  const transaction = await sequelize.transaction();

  try {
    // Get entity type
    const [entityType] = await sequelize.query(
      `SELECT id FROM entity_types WHERE name = :name AND "deletedAt" IS NULL`,
      {
        replacements: { name: ENTITY_TYPE_NAME },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    if (!entityType) {
      throw new Error('Assessment entity type not found in EAV system');
    }

    // Convert camelCase keys to snake_case
    const normalizedMetadata = {};
    for (const [key, value] of Object.entries(metadata)) {
      const snakeCaseKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      normalizedMetadata[snakeCaseKey] = value;
    }

    // Get all relevant attribute definitions
    const attributeNames = Object.keys(normalizedMetadata);
    const attrDefs = await sequelize.query(
      `SELECT id, name, "valueType", "isRequired", "validationRules"
       FROM attribute_definitions 
       WHERE "entityTypeId" = :entityTypeId 
         AND name IN (:attributeNames) 
         AND "deletedAt" IS NULL`,
      {
        replacements: { entityTypeId: entityType.id, attributeNames },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    const attrDefMap = new Map(attrDefs.map(a => [a.name, a]));
    const results = {};

    for (const [attributeName, value] of Object.entries(normalizedMetadata)) {
      const attrDef = attrDefMap.get(attributeName);
      if (!attrDef) {
        results[attributeName] = { error: `Attribute '${attributeName}' not found` };
        continue;
      }

      const valueColumns = prepareValueColumns(value, attrDef.valueType);

      // Use entity-specific table with upsert
      const [upsertResult] = await sequelize.query(
        `INSERT INTO assessment_attribute_values 
         (assessment_id, attribute_id,
          value_string, value_integer, value_decimal, value_boolean,
          value_date, value_datetime, value_text, value_json,
          sort_order, "createdAt", "updatedAt")
         VALUES (:assessment_id, :attribute_id,
                 :value_string, :value_integer, :value_decimal, :value_boolean,
                 :value_date, :value_datetime, :value_text, :value_json,
                 0, NOW(), NOW())
         ON CONFLICT (assessment_id, attribute_id) 
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
            assessment_id: assessmentId,
            attribute_id: attrDef.id,
            ...valueColumns,
          },
          type: sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      const wasInserted = upsertResult?.inserted === true;
      results[attributeName] = { 
        id: `${assessmentId}-${attrDef.id}`, 
        action: wasInserted ? 'created' : 'updated' 
      };
    }

    await transaction.commit();
    
    const processedCount = Object.keys(results).filter(k => !results[k].error).length;
    return { success: true, processedCount, results };

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Delete a metadata attribute from an assessment
 * @param {string} assessmentId - The assessment's UUID
 * @param {string} attributeName - The attribute name to delete
 * @returns {Promise<boolean>} True if deleted
 */
async function deleteAssessmentMetadata(assessmentId, attributeName) {
  const result = await sequelize.query(
    `DELETE FROM assessment_attribute_values aav
     USING attribute_definitions ad, entity_types et
     WHERE aav.attribute_id = ad.id
       AND ad."entityTypeId" = et.id
       AND aav.assessment_id = :assessmentId
       AND ad.name = :attributeName
       AND et.name = :entityTypeName
     RETURNING aav.assessment_id`,
    {
      replacements: { 
        assessmentId, 
        attributeName,
        entityTypeName: ENTITY_TYPE_NAME,
      },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  return result.length > 0;
}

/**
 * Get available metadata attribute definitions for assessments
 * @returns {Promise<Array>} Array of attribute definitions
 */
async function getAvailableMetadataAttributes() {
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
     WHERE et.name = :entityType
       AND ad."deletedAt" IS NULL
       AND ad."isActive" = true
     ORDER BY ad."sortOrder"`,
    {
      replacements: { entityType: ENTITY_TYPE_NAME },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  return attrs.map(a => ({
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
}

/**
 * Check if an assessment has any EAV metadata
 * @param {string} assessmentId - The assessment's UUID
 * @returns {Promise<boolean>} True if has metadata
 */
async function hasAssessmentMetadata(assessmentId) {
  const [result] = await sequelize.query(
    `SELECT EXISTS(
       SELECT 1 FROM assessment_attribute_values WHERE assessment_id = :assessmentId
     ) as has_metadata`,
    {
      replacements: { assessmentId },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  return result?.has_metadata || false;
}

/**
 * Get information about which table is being used
 * @returns {object} Configuration info
 */
function getEavTableInfo() {
  return {
    entityType: ENTITY_TYPE_NAME,
    tableName: 'assessment_attribute_values',
    description: 'Entity-specific EAV table with proper foreign key constraints',
  };
}

module.exports = {
  getAssessmentMetadata,
  getAssessmentMetadataWithDetails,
  setAssessmentMetadata,
  bulkSetAssessmentMetadata,
  deleteAssessmentMetadata,
  getAvailableMetadataAttributes,
  hasAssessmentMetadata,
  getEavTableInfo,
  ENTITY_TYPE_NAME,
};
