/**
 * Assessment Metadata EAV Service
 * 
 * Provides extensible metadata storage for assessments using EAV tables.
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
 * Custom attributes can be added dynamically through the EAV system.
 */

const { sequelize } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const ENTITY_TYPE_NAME = 'Assessment';

/**
 * Get all metadata for an assessment, preferring EAV data
 * @param {string} assessmentId - The assessment's UUID
 * @returns {Promise<object>} Object with metadata key-value pairs
 */
async function getAssessmentMetadata(assessmentId) {
  const values = await sequelize.query(
    `SELECT 
       av.id,
       av."attributeId",
       ad.name as attribute_name,
       ad."displayName" as attribute_display_name,
       ad.description as attribute_description,
       ad."valueType",
       av."valueString",
       av."valueInteger",
       av."valueDecimal",
       av."valueBoolean",
       av."valueText",
       av."valueJson",
       av."sortOrder"
     FROM attribute_values av
     JOIN attribute_definitions ad ON av."attributeId" = ad.id
     JOIN entity_types et ON ad."entityTypeId" = et.id
     WHERE av."entityId" = :assessmentId
       AND av."entityType" = :entityType
       AND av."deletedAt" IS NULL
       AND ad."deletedAt" IS NULL
     ORDER BY ad."sortOrder", av."sortOrder"`,
    {
      replacements: { assessmentId, entityType: ENTITY_TYPE_NAME },
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
    let attrValue;
    
    switch (value.valueType) {
      case 'string':
        attrValue = value.valueString;
        break;
      case 'integer':
        attrValue = value.valueInteger;
        break;
      case 'decimal':
        attrValue = parseFloat(value.valueDecimal);
        break;
      case 'boolean':
        attrValue = value.valueBoolean;
        break;
      case 'text':
        attrValue = value.valueText;
        break;
      case 'json':
        try {
          attrValue = typeof value.valueJson === 'string' 
            ? JSON.parse(value.valueJson) 
            : value.valueJson;
        } catch {
          attrValue = value.valueJson;
        }
        break;
      default:
        attrValue = value.valueString || value.valueText;
    }

    // Convert snake_case to camelCase for API consistency
    const camelCaseName = attrName.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
    metadata[camelCaseName] = attrValue;
  }

  return metadata;
}

/**
 * Get metadata with full attribute details
 * @param {string} assessmentId - The assessment's UUID
 * @returns {Promise<Array>} Array of metadata objects with full info
 */
async function getAssessmentMetadataWithDetails(assessmentId) {
  const values = await sequelize.query(
    `SELECT 
       av.id as value_id,
       av."attributeId",
       ad.name as attribute_name,
       ad."displayName" as display_name,
       ad.description,
       ad."valueType",
       ad."isRequired",
       ad."validationRules",
       av."valueString",
       av."valueInteger",
       av."valueDecimal",
       av."valueBoolean",
       av."valueText",
       av."valueJson",
       av."sortOrder",
       av."createdAt",
       av."updatedAt"
     FROM attribute_values av
     JOIN attribute_definitions ad ON av."attributeId" = ad.id
     JOIN entity_types et ON ad."entityTypeId" = et.id
     WHERE av."entityId" = :assessmentId
       AND av."entityType" = :entityType
       AND av."deletedAt" IS NULL
       AND ad."deletedAt" IS NULL
     ORDER BY ad."sortOrder", av."sortOrder"`,
    {
      replacements: { assessmentId, entityType: ENTITY_TYPE_NAME },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  return values.map(v => {
    let value;
    switch (v.valueType) {
      case 'string': value = v.valueString; break;
      case 'integer': value = v.valueInteger; break;
      case 'decimal': value = parseFloat(v.valueDecimal); break;
      case 'boolean': value = v.valueBoolean; break;
      case 'text': value = v.valueText; break;
      case 'json':
        try {
          value = typeof v.valueJson === 'string' ? JSON.parse(v.valueJson) : v.valueJson;
        } catch {
          value = v.valueJson;
        }
        break;
      default: value = v.valueString || v.valueText;
    }

    return {
      valueId: v.value_id,
      attributeId: v.attributeId,
      name: v.attribute_name,
      displayName: v.display_name,
      description: v.description,
      valueType: v.valueType,
      isRequired: v.isRequired,
      validationRules: v.validationRules,
      value,
      sortOrder: v.sortOrder,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    };
  });
}

/**
 * Set a single metadata attribute for an assessment
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

    // Check for existing value
    const [existingValue] = await sequelize.query(
      `SELECT id FROM attribute_values 
       WHERE "attributeId" = :attributeId 
         AND "entityId" = :entityId 
         AND "entityType" = :entityType
         AND "deletedAt" IS NULL`,
      {
        replacements: { 
          attributeId: attrDef.id, 
          entityId: assessmentId, 
          entityType: ENTITY_TYPE_NAME 
        },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    // Prepare value columns
    const valueColumns = {
      valueString: null,
      valueInteger: null,
      valueDecimal: null,
      valueBoolean: null,
      valueText: null,
      valueJson: null,
    };

    switch (attrDef.valueType) {
      case 'string':
        valueColumns.valueString = String(value).substring(0, 500);
        break;
      case 'integer':
        valueColumns.valueInteger = parseInt(value, 10);
        break;
      case 'decimal':
        valueColumns.valueDecimal = parseFloat(value);
        break;
      case 'boolean':
        valueColumns.valueBoolean = Boolean(value);
        break;
      case 'text':
        valueColumns.valueText = String(value);
        break;
      case 'json':
        valueColumns.valueJson = typeof value === 'string' ? value : JSON.stringify(value);
        break;
    }

    let resultId;

    if (existingValue) {
      // Update existing
      await sequelize.query(
        `UPDATE attribute_values 
         SET "valueString" = :valueString,
             "valueInteger" = :valueInteger,
             "valueDecimal" = :valueDecimal,
             "valueBoolean" = :valueBoolean,
             "valueText" = :valueText,
             "valueJson" = :valueJson,
             "updatedAt" = NOW()
         WHERE id = :id`,
        {
          replacements: { id: existingValue.id, ...valueColumns },
          transaction,
        }
      );
      resultId = existingValue.id;
    } else {
      // Insert new
      resultId = uuidv4();
      await sequelize.query(
        `INSERT INTO attribute_values 
         (id, "attributeId", "entityType", "entityId", "valueType",
          "valueString", "valueInteger", "valueDecimal", "valueBoolean",
          "valueText", "valueJson", "sortOrder", "createdAt", "updatedAt")
         VALUES (:id, :attributeId, :entityType, :entityId, :valueType,
                 :valueString, :valueInteger, :valueDecimal, :valueBoolean,
                 :valueText, :valueJson, 0, NOW(), NOW())`,
        {
          replacements: {
            id: resultId,
            attributeId: attrDef.id,
            entityType: ENTITY_TYPE_NAME,
            entityId: assessmentId,
            valueType: attrDef.valueType,
            ...valueColumns,
          },
          transaction,
        }
      );
    }

    await transaction.commit();

    return {
      id: resultId,
      attributeName,
      value,
      action: existingValue ? 'updated' : 'created',
    };

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Set multiple metadata attributes for an assessment in a single transaction
 * @param {string} assessmentId - The assessment's UUID
 * @param {object} metadata - Object with attribute names as keys
 * @returns {Promise<object>} Results for each attribute
 */
async function bulkSetAssessmentMetadata(assessmentId, metadata) {
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

    // Convert camelCase keys to snake_case for attribute lookup
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

    // Get existing values
    const existingValues = await sequelize.query(
      `SELECT av.id, ad.name as "attributeName"
       FROM attribute_values av
       JOIN attribute_definitions ad ON av."attributeId" = ad.id
       WHERE ad."entityTypeId" = :entityTypeId
         AND av."entityId" = :entityId 
         AND av."entityType" = :entityType
         AND av."deletedAt" IS NULL`,
      {
        replacements: { 
          entityTypeId: entityType.id, 
          entityId: assessmentId, 
          entityType: ENTITY_TYPE_NAME 
        },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    const existingMap = new Map(existingValues.map(e => [e.attributeName, e.id]));
    const results = {};

    for (const [attributeName, value] of Object.entries(normalizedMetadata)) {
      const attrDef = attrDefMap.get(attributeName);
      if (!attrDef) {
        results[attributeName] = { error: `Attribute '${attributeName}' not found` };
        continue;
      }

      // Prepare value columns
      const valueColumns = {
        valueString: null,
        valueInteger: null,
        valueDecimal: null,
        valueBoolean: null,
        valueText: null,
        valueJson: null,
      };

      switch (attrDef.valueType) {
        case 'string':
          valueColumns.valueString = String(value).substring(0, 500);
          break;
        case 'integer':
          valueColumns.valueInteger = parseInt(value, 10);
          break;
        case 'decimal':
          valueColumns.valueDecimal = parseFloat(value);
          break;
        case 'boolean':
          valueColumns.valueBoolean = Boolean(value);
          break;
        case 'text':
          valueColumns.valueText = String(value);
          break;
        case 'json':
          valueColumns.valueJson = typeof value === 'string' ? value : JSON.stringify(value);
          break;
      }

      const existingId = existingMap.get(attributeName);

      if (existingId) {
        await sequelize.query(
          `UPDATE attribute_values 
           SET "valueString" = :valueString,
               "valueInteger" = :valueInteger,
               "valueDecimal" = :valueDecimal,
               "valueBoolean" = :valueBoolean,
               "valueText" = :valueText,
               "valueJson" = :valueJson,
               "updatedAt" = NOW()
           WHERE id = :id`,
          {
            replacements: { id: existingId, ...valueColumns },
            transaction,
          }
        );
        results[attributeName] = { id: existingId, action: 'updated' };
      } else {
        const newId = uuidv4();
        await sequelize.query(
          `INSERT INTO attribute_values 
           (id, "attributeId", "entityType", "entityId", "valueType",
            "valueString", "valueInteger", "valueDecimal", "valueBoolean",
            "valueText", "valueJson", "sortOrder", "createdAt", "updatedAt")
           VALUES (:id, :attributeId, :entityType, :entityId, :valueType,
                   :valueString, :valueInteger, :valueDecimal, :valueBoolean,
                   :valueText, :valueJson, 0, NOW(), NOW())`,
          {
            replacements: {
              id: newId,
              attributeId: attrDef.id,
              entityType: ENTITY_TYPE_NAME,
              entityId: assessmentId,
              valueType: attrDef.valueType,
              ...valueColumns,
            },
            transaction,
          }
        );
        results[attributeName] = { id: newId, action: 'created' };
      }
    }

    await transaction.commit();
    return results;

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
  const [result] = await sequelize.query(
    `UPDATE attribute_values av
     SET "deletedAt" = NOW()
     FROM attribute_definitions ad
     JOIN entity_types et ON ad."entityTypeId" = et.id
     WHERE av."attributeId" = ad.id
       AND av."entityId" = :assessmentId
       AND av."entityType" = :entityType
       AND ad.name = :attributeName
       AND et.name = :entityTypeName
       AND av."deletedAt" IS NULL
     RETURNING av.id`,
    {
      replacements: { 
        assessmentId, 
        entityType: ENTITY_TYPE_NAME,
        attributeName,
        entityTypeName: ENTITY_TYPE_NAME,
      },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  return !!result;
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
    `SELECT COUNT(*) as count
     FROM attribute_values av
     JOIN attribute_definitions ad ON av."attributeId" = ad.id
     JOIN entity_types et ON ad."entityTypeId" = et.id
     WHERE av."entityId" = :assessmentId
       AND av."entityType" = :entityType
       AND et.name = :entityTypeName
       AND av."deletedAt" IS NULL`,
    {
      replacements: { 
        assessmentId, 
        entityType: ENTITY_TYPE_NAME,
        entityTypeName: ENTITY_TYPE_NAME,
      },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  return parseInt(result.count, 10) > 0;
}

module.exports = {
  getAssessmentMetadata,
  getAssessmentMetadataWithDetails,
  setAssessmentMetadata,
  bulkSetAssessmentMetadata,
  deleteAssessmentMetadata,
  getAvailableMetadataAttributes,
  hasAssessmentMetadata,
  ENTITY_TYPE_NAME,
};
