/**
 * Instructor Awards EAV Service
 * 
 * Provides unified access to instructor awards data from both:
 * 1. Legacy JSONB column (read-only fallback)
 * 2. New EAV tables (primary source)
 * 
 * This service ensures backward compatibility during the 2-sprint fallback period.
 */

const { sequelize } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const ENTITY_TYPE_NAME = 'Instructor';

/**
 * Get all awards for an instructor, preferring EAV data over legacy JSONB
 * @param {string} instructorId - The instructor's UUID
 * @returns {Promise<Array>} Array of award objects
 */
async function getInstructorAwards(instructorId) {
  // First, try to get from EAV tables
  const eavAwards = await getAwardsFromEav(instructorId);
  
  if (eavAwards.length > 0) {
    return eavAwards;
  }

  // Fallback to legacy JSONB column
  const legacyAwards = await getAwardsFromLegacy(instructorId);
  return legacyAwards;
}

/**
 * Get awards from EAV tables
 * @param {string} instructorId - The instructor's UUID
 * @returns {Promise<Array>} Array of award objects grouped by award_group_id
 */
async function getAwardsFromEav(instructorId) {
  const values = await sequelize.query(
    `SELECT 
       av.id,
       av."attributeId",
       ad.name as attribute_name,
       ad."displayName" as attribute_display_name,
       av."valueType",
       av."valueString",
       av."valueInteger",
       av."valueText",
       av."sortOrder"
     FROM attribute_values av
     JOIN attribute_definitions ad ON av."attributeId" = ad.id
     JOIN entity_types et ON ad."entityTypeId" = et.id
     WHERE av."entityId" = :instructorId
       AND av."entityType" = :entityType
       AND ad.name LIKE 'award_%'
       AND av."deletedAt" IS NULL
       AND ad."deletedAt" IS NULL
     ORDER BY av."sortOrder", ad."sortOrder"`,
    {
      replacements: { instructorId, entityType: ENTITY_TYPE_NAME },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  if (values.length === 0) {
    return [];
  }

  // Group by award_group_id to reconstruct individual awards
  const awardsMap = new Map();
  let currentGroupId = null;

  for (const value of values) {
    if (value.attribute_name === 'award_group_id') {
      currentGroupId = value.valueString;
      if (!awardsMap.has(currentGroupId)) {
        awardsMap.set(currentGroupId, { _groupId: currentGroupId });
      }
    }
  }

  // Now populate the awards with their attribute values
  for (const value of values) {
    // Find the group this value belongs to by sortOrder
    const sortOrder = value.sortOrder;
    let targetGroupId = null;

    // Find the matching group by sortOrder
    for (const [groupId, award] of awardsMap.entries()) {
      if (award._sortOrder === undefined || award._sortOrder === sortOrder) {
        targetGroupId = groupId;
        if (award._sortOrder === undefined) {
          award._sortOrder = sortOrder;
        }
        break;
      }
    }

    if (!targetGroupId && awardsMap.size > 0) {
      // Use the first group if no match found
      targetGroupId = awardsMap.keys().next().value;
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
        attrValue = value.valueInteger;
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
    return cleanAward;
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
 * Add a new award to an instructor via EAV tables
 * @param {string} instructorId - The instructor's UUID
 * @param {object} awardData - The award data to add
 * @returns {Promise<object>} The created award with its group ID
 */
async function addInstructorAward(instructorId, awardData) {
  const transaction = await sequelize.transaction();

  try {
    // Get or verify entity type exists
    const [entityType] = await sequelize.query(
      `SELECT id FROM entity_types WHERE name = :name AND "deletedAt" IS NULL`,
      {
        replacements: { name: ENTITY_TYPE_NAME },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    if (!entityType) {
      throw new Error('Instructor entity type not found in EAV system');
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
      `SELECT COALESCE(MAX("sortOrder"), -1) + 1 as next_order 
       FROM attribute_values 
       WHERE "entityId" = :instructorId AND "entityType" = :entityType AND "deletedAt" IS NULL`,
      {
        replacements: { instructorId, entityType: ENTITY_TYPE_NAME },
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

      const valueColumns = {
        valueString: null,
        valueInteger: null,
        valueText: null,
      };

      switch (attrDef.valueType || item.valueType) {
        case 'string':
          valueColumns.valueString = String(item.value).substring(0, 500);
          break;
        case 'integer':
          valueColumns.valueInteger = parseInt(item.value, 10);
          break;
        case 'text':
          valueColumns.valueText = String(item.value);
          break;
      }

      await sequelize.query(
        `INSERT INTO attribute_values 
         (id, "attributeId", "entityType", "entityId", "valueType", 
          "valueString", "valueInteger", "valueText", "sortOrder", "createdAt", "updatedAt")
         VALUES (:id, :attributeId, :entityType, :entityId, :valueType,
                 :valueString, :valueInteger, :valueText, :sortOrder, NOW(), NOW())`,
        {
          replacements: {
            id: uuidv4(),
            attributeId: attrDef.id,
            entityType: ENTITY_TYPE_NAME,
            entityId: instructorId,
            valueType: attrDef.valueType || item.valueType,
            valueString: valueColumns.valueString,
            valueInteger: valueColumns.valueInteger,
            valueText: valueColumns.valueText,
            sortOrder,
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
      groupId: awardGroupId,
      ...awardData,
    };

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Update an existing award in EAV tables
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

        // Find the existing value by matching the group ID's sortOrder
        const [groupValue] = await sequelize.query(
          `SELECT av."sortOrder" 
           FROM attribute_values av
           JOIN attribute_definitions ad ON av."attributeId" = ad.id
           WHERE av."entityId" = :instructorId 
             AND av."entityType" = :entityType
             AND ad.name = 'award_group_id'
             AND av."valueString" = :awardGroupId
             AND av."deletedAt" IS NULL`,
          {
            replacements: { instructorId, entityType: ENTITY_TYPE_NAME, awardGroupId },
            type: sequelize.QueryTypes.SELECT,
            transaction,
          }
        );

        if (!groupValue) {
          throw new Error(`Award with group ID ${awardGroupId} not found`);
        }

        const sortOrder = groupValue.sortOrder;

        // Build update based on value type
        const valueColumn = attrDef.valueType === 'integer' ? 'valueInteger' :
                           attrDef.valueType === 'text' ? 'valueText' : 'valueString';
        const valueToSet = attrDef.valueType === 'integer' ? parseInt(awardData[field], 10) :
                          String(awardData[field]);

        await sequelize.query(
          `UPDATE attribute_values 
           SET "${valueColumn}" = :value, "updatedAt" = NOW()
           WHERE "entityId" = :instructorId 
             AND "entityType" = :entityType
             AND "attributeId" = :attrId
             AND "sortOrder" = :sortOrder
             AND "deletedAt" IS NULL`,
          {
            replacements: {
              instructorId,
              entityType: ENTITY_TYPE_NAME,
              attrId: attrDef.id,
              sortOrder,
              value: valueToSet,
            },
            transaction,
          }
        );
      }
    }

    await transaction.commit();
    return { groupId: awardGroupId, ...awardData };

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Delete an award from EAV tables (soft delete)
 * @param {string} instructorId - The instructor's UUID
 * @param {string} awardGroupId - The award's group ID
 * @returns {Promise<boolean>} True if deleted successfully
 */
async function deleteInstructorAward(instructorId, awardGroupId) {
  // Find the sortOrder for this award group
  const [groupValue] = await sequelize.query(
    `SELECT av."sortOrder" 
     FROM attribute_values av
     JOIN attribute_definitions ad ON av."attributeId" = ad.id
     WHERE av."entityId" = :instructorId 
       AND av."entityType" = :entityType
       AND ad.name = 'award_group_id'
       AND av."valueString" = :awardGroupId
       AND av."deletedAt" IS NULL`,
    {
      replacements: { instructorId, entityType: ENTITY_TYPE_NAME, awardGroupId },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  if (!groupValue) {
    return false;
  }

  // Soft delete all attribute values for this award (matching sortOrder)
  await sequelize.query(
    `UPDATE attribute_values 
     SET "deletedAt" = NOW()
     WHERE "entityId" = :instructorId 
       AND "entityType" = :entityType
       AND "sortOrder" = :sortOrder
       AND "deletedAt" IS NULL`,
    {
      replacements: {
        instructorId,
        entityType: ENTITY_TYPE_NAME,
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

module.exports = {
  getInstructorAwards,
  getAwardsFromEav,
  getAwardsFromLegacy,
  addInstructorAward,
  updateInstructorAward,
  deleteInstructorAward,
  isInstructorAwardsMigrated,
  ENTITY_TYPE_NAME,
};
