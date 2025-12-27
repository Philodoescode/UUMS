/**
 * Instructor Awards EAV Service
 * 
 * Provides unified access to instructor awards data using entity-specific EAV tables.
 * 
 * Awards are stored as individual EAV entries with:
 * - award_title: Title of the award
 * - award_year: Year received
 * - award_organization: Awarding organization
 * - award_description: Description of the award
 * - award_category: Category of the award
 * - award_group_id: Groups attributes of a single award item
 * 
 * === Entity-Specific Table ===
 * Uses instructor_attribute_values table exclusively with proper FK constraints.
 */

const { sequelize } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const ENTITY_TYPE_NAME = 'Instructor';

/**
 * Get all awards for an instructor
 * @param {string} instructorId - The instructor's UUID
 * @returns {Promise<Array>} Array of award objects
 */
async function getInstructorAwards(instructorId) {
  // First, try to get from entity-specific EAV table
  const eavAwards = await getAwardsFromEav(instructorId);
  
  if (eavAwards.length > 0) {
    return eavAwards;
  }

  // Fallback to legacy JSONB column
  const legacyAwards = await getAwardsFromLegacy(instructorId);
  return legacyAwards;
}

/**
 * Get awards from entity-specific EAV table
 * @param {string} instructorId - The instructor's UUID
 * @returns {Promise<Array>} Array of award objects grouped by award_group_id
 */
async function getAwardsFromEav(instructorId) {
  const values = await sequelize.query(
    `SELECT 
       iav.instructor_id,
       iav.attribute_id as "attributeId",
       ad.name as attribute_name,
       ad."displayName" as attribute_display_name,
       ad."valueType",
       iav.value_string as "valueString",
       iav.value_integer as "valueInteger",
       iav.value_text as "valueText",
       iav.sort_order as "sortOrder"
     FROM instructor_attribute_values iav
     JOIN attribute_definitions ad ON iav.attribute_id = ad.id
     WHERE iav.instructor_id = :instructorId
       AND ad.name LIKE 'award_%'
       AND ad."deletedAt" IS NULL
     ORDER BY iav.sort_order, ad."sortOrder"`,
    {
      replacements: { instructorId },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  if (values.length === 0) {
    return [];
  }

  // Group by award_group_id to reconstruct individual awards
  const awardsMap = new Map();

  // First pass: collect all group IDs
  for (const value of values) {
    if (value.attribute_name === 'award_group_id') {
      const groupId = value.valueString;
      if (!awardsMap.has(groupId)) {
        awardsMap.set(groupId, { 
          _groupId: groupId,
          _sortOrder: value.sortOrder 
        });
      }
    }
  }

  // Second pass: populate award data
  for (const value of values) {
    // Find the group this value belongs to by sortOrder
    let targetGroupId = null;
    
    for (const [groupId, award] of awardsMap.entries()) {
      if (award._sortOrder === value.sortOrder) {
        targetGroupId = groupId;
        break;
      }
    }

    if (!targetGroupId) continue;

    const award = awardsMap.get(targetGroupId);
    const attrName = value.attribute_name;
    
    // Extract the value based on type
    let attrValue;
    switch (value.valueType) {
      case 'string':
        attrValue = value.valueString;
        break;
      case 'integer':
        attrValue = value.valueInteger !== null ? parseInt(value.valueInteger, 10) : null;
        break;
      case 'text':
        attrValue = value.valueText;
        break;
      default:
        attrValue = value.valueString || value.valueText;
    }

    // Map EAV attribute names to user-friendly field names
    const fieldMap = {
      'award_title': 'title',
      'award_year': 'year',
      'award_organization': 'organization',
      'award_description': 'description',
      'award_category': 'category',
      'award_group_id': '_groupId',
    };

    const fieldName = fieldMap[attrName] || attrName;
    award[fieldName] = attrValue;
  }

  // Convert map to array and clean up internal fields
  return Array.from(awardsMap.values()).map(award => {
    const { _groupId, _sortOrder, ...cleanAward } = award;
    return { id: _groupId, ...cleanAward };
  });
}

/**
 * Get awards from legacy JSONB column
 * @param {string} instructorId - The instructor's UUID
 * @returns {Promise<Array>} Array of award objects
 */
async function getAwardsFromLegacy(instructorId) {
  const [instructor] = await sequelize.query(
    `SELECT awards FROM instructors WHERE id = :instructorId`,
    {
      replacements: { instructorId },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  if (!instructor || !instructor.awards) {
    return [];
  }

  return Array.isArray(instructor.awards) ? instructor.awards : [];
}

/**
 * Add a new award to an instructor
 * @param {string} instructorId - The instructor's UUID
 * @param {object} awardData - The award data to add
 * @returns {Promise<object>} The created award with its group ID
 */
async function addInstructorAward(instructorId, awardData) {
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
      throw new Error('Instructor entity type not found in EAV system. Run migration script first.');
    }

    // Get attribute definitions
    const attributeDefs = await sequelize.query(
      `SELECT id, name, "valueType" FROM attribute_definitions 
       WHERE "entityTypeId" = :entityTypeId AND name LIKE 'award_%' AND "deletedAt" IS NULL`,
      {
        replacements: { entityTypeId: entityType.id },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    const attrMap = new Map(attributeDefs.map(a => [a.name, a]));
    
    // Generate a new group ID for this award
    const awardGroupId = uuidv4();
    
    // Get the next sort order
    const [maxSort] = await sequelize.query(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order 
       FROM instructor_attribute_values 
       WHERE instructor_id = :instructorId`,
      {
        replacements: { instructorId },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );
    const sortOrder = maxSort.next_order;

    // Map input fields to attribute names
    const fieldToAttr = {
      title: 'award_title',
      year: 'award_year',
      organization: 'award_organization',
      description: 'award_description',
      category: 'award_category',
    };

    // Always store the group ID
    const valuesToInsert = [
      { attrName: 'award_group_id', value: awardGroupId, valueType: 'string' },
    ];

    // Add provided fields
    for (const [field, attrName] of Object.entries(fieldToAttr)) {
      if (awardData[field] !== undefined && awardData[field] !== null && awardData[field] !== '') {
        const attrDef = attrMap.get(attrName);
        if (attrDef) {
          valuesToInsert.push({
            attrName,
            attrId: attrDef.id,
            value: awardData[field],
            valueType: attrDef.valueType,
          });
        }
      }
    }

    // Insert attribute values
    for (const item of valuesToInsert) {
      const attrDef = item.attrId ? { id: item.attrId, valueType: item.valueType } : attrMap.get(item.attrName);
      if (!attrDef) continue;

      const valueColumns = prepareValueColumns(item.value, attrDef.valueType || item.valueType);

      await sequelize.query(
        `INSERT INTO instructor_attribute_values 
         (instructor_id, attribute_id,
          value_string, value_integer, value_decimal, value_boolean,
          value_date, value_datetime, value_text, value_json,
          sort_order, "createdAt", "updatedAt")
         VALUES (:instructor_id, :attribute_id,
                 :value_string, :value_integer, :value_decimal, :value_boolean,
                 :value_date, :value_datetime, :value_text, :value_json,
                 :sort_order, NOW(), NOW())`,
        {
          replacements: {
            instructor_id: instructorId,
            attribute_id: attrDef.id,
            ...valueColumns,
            sort_order: sortOrder,
          },
          transaction,
        }
      );
    }

    // Mark instructor as EAV migrated
    await sequelize.query(
      `UPDATE instructors SET "awardsEavMigrated" = true WHERE id = :instructorId`,
      { replacements: { instructorId }, transaction }
    );

    await transaction.commit();

    return {
      id: awardGroupId,
      ...awardData,
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
 * Update an existing award
 * @param {string} instructorId - The instructor's UUID  
 * @param {string} awardGroupId - The award's group ID
 * @param {object} awardData - The updated award data
 * @returns {Promise<object>} The updated award
 */
async function updateInstructorAward(instructorId, awardGroupId, awardData) {
  const transaction = await sequelize.transaction();

  try {
    const fieldToAttr = {
      title: 'award_title',
      year: 'award_year',
      organization: 'award_organization',
      description: 'award_description',
      category: 'award_category',
    };

    // Find the sortOrder for this award group
    const [groupValue] = await sequelize.query(
      `SELECT iav.sort_order as "sortOrder" 
       FROM instructor_attribute_values iav
       JOIN attribute_definitions ad ON iav.attribute_id = ad.id
       WHERE iav.instructor_id = :instructorId 
         AND ad.name = 'award_group_id'
         AND iav.value_string = :awardGroupId`,
      {
        replacements: { instructorId, awardGroupId },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    if (!groupValue) {
      throw new Error(`Award with group ID ${awardGroupId} not found`);
    }

    const sortOrder = groupValue.sortOrder;

    for (const [field, attrName] of Object.entries(fieldToAttr)) {
      if (awardData[field] !== undefined) {
        const [attrDef] = await sequelize.query(
          `SELECT ad.id, ad."valueType" 
           FROM attribute_definitions ad
           JOIN entity_types et ON ad."entityTypeId" = et.id
           WHERE et.name = :entityType AND ad.name = :attrName AND ad."deletedAt" IS NULL`,
          {
            replacements: { entityType: ENTITY_TYPE_NAME, attrName },
            type: sequelize.QueryTypes.SELECT,
            transaction,
          }
        );

        if (!attrDef) continue;

        const valueColumns = prepareValueColumns(awardData[field], attrDef.valueType);

        // Upsert the value
        await sequelize.query(
          `INSERT INTO instructor_attribute_values 
           (instructor_id, attribute_id,
            value_string, value_integer, value_decimal, value_boolean,
            value_date, value_datetime, value_text, value_json,
            sort_order, "createdAt", "updatedAt")
           VALUES (:instructor_id, :attribute_id,
                   :value_string, :value_integer, :value_decimal, :value_boolean,
                   :value_date, :value_datetime, :value_text, :value_json,
                   :sort_order, NOW(), NOW())
           ON CONFLICT (instructor_id, attribute_id) 
           DO UPDATE SET
             value_string = EXCLUDED.value_string,
             value_integer = EXCLUDED.value_integer,
             value_decimal = EXCLUDED.value_decimal,
             value_boolean = EXCLUDED.value_boolean,
             value_text = EXCLUDED.value_text,
             value_json = EXCLUDED.value_json,
             "updatedAt" = NOW()`,
          {
            replacements: {
              instructor_id: instructorId,
              attribute_id: attrDef.id,
              ...valueColumns,
              sort_order: sortOrder,
            },
            transaction,
          }
        );
      }
    }

    await transaction.commit();
    return { id: awardGroupId, ...awardData };

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Delete an award (hard delete)
 * @param {string} instructorId - The instructor's UUID
 * @param {string} awardGroupId - The award's group ID
 * @returns {Promise<boolean>} True if deleted successfully
 */
async function deleteInstructorAward(instructorId, awardGroupId) {
  // Find the sortOrder for this award group
  const [groupValue] = await sequelize.query(
    `SELECT iav.sort_order as "sortOrder" 
     FROM instructor_attribute_values iav
     JOIN attribute_definitions ad ON iav.attribute_id = ad.id
     WHERE iav.instructor_id = :instructorId 
       AND ad.name = 'award_group_id'
       AND iav.value_string = :awardGroupId`,
    {
      replacements: { instructorId, awardGroupId },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  if (!groupValue) {
    return false;
  }

  // Delete all attribute values for this award (matching sortOrder)
  await sequelize.query(
    `DELETE FROM instructor_attribute_values 
     WHERE instructor_id = :instructorId 
       AND sort_order = :sortOrder`,
    {
      replacements: {
        instructorId,
        sortOrder: groupValue.sortOrder,
      },
    }
  );

  return true;
}

/**
 * Check if an instructor's awards have been migrated to EAV
 * @param {string} instructorId - The instructor's UUID
 * @returns {Promise<boolean>} True if migrated
 */
async function isInstructorAwardsMigrated(instructorId) {
  const [instructor] = await sequelize.query(
    `SELECT "awardsEavMigrated" FROM instructors WHERE id = :instructorId`,
    {
      replacements: { instructorId },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  return instructor?.awardsEavMigrated === true;
}

/**
 * Get information about which table is being used
 * @returns {object} Configuration info
 */
function getEavTableInfo() {
  return {
    entityType: ENTITY_TYPE_NAME,
    tableName: 'instructor_attribute_values',
    description: 'Entity-specific EAV table with proper foreign key constraints',
  };
}

module.exports = {
  getInstructorAwards,
  getAwardsFromEav,
  getAwardsFromLegacy,
  addInstructorAward,
  updateInstructorAward,
  deleteInstructorAward,
  isInstructorAwardsMigrated,
  getEavTableInfo,
  ENTITY_TYPE_NAME,
};
