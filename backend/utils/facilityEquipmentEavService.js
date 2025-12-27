/**
 * Facility Equipment EAV Service
 * 
 * Provides unified access to facility equipment data from both:
 * 1. Legacy TEXT column (read-only fallback)
 * 2. New EAV tables (primary source)
 * 
 * This service ensures backward compatibility during the 2-sprint fallback period.
 * 
 * Equipment items are stored as individual EAV entries with:
 * - equipment_name: Name of the equipment
 * - equipment_quantity: Quantity available
 * - equipment_condition: Condition (Excellent, Good, Fair, Poor)
 * - equipment_notes: Additional notes
 * - equipment_group_id: Groups attributes of a single equipment item
 */

const { sequelize } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const ENTITY_TYPE_NAME = 'Facility';

/**
 * Get all equipment for a facility, preferring EAV data over legacy TEXT
 * @param {string} facilityId - The facility's UUID
 * @returns {Promise<Array>} Array of equipment objects
 */
async function getFacilityEquipment(facilityId) {
  // First, try to get from EAV tables
  const eavEquipment = await getEquipmentFromEav(facilityId);
  
  if (eavEquipment.length > 0) {
    return eavEquipment;
  }

  // Fallback to legacy TEXT column
  const legacyEquipment = await getEquipmentFromLegacy(facilityId);
  return legacyEquipment;
}

/**
 * Get equipment from EAV tables
 * @param {string} facilityId - The facility's UUID
 * @returns {Promise<Array>} Array of equipment objects grouped by equipment_group_id
 */
async function getEquipmentFromEav(facilityId) {
  const values = await sequelize.query(
    `SELECT 
       av.id,
       av.attribute_id as "attributeId",
       ad.name as attribute_name,
       ad.display_name as attribute_display_name,
       ad.value_type as "valueType",
       av.value_string as "valueString",
       av.value_integer as "valueInteger",
       av.value_text as "valueText",
       av.sort_order as "sortOrder"
     FROM attribute_values av
     JOIN attribute_definitions ad ON av.attribute_id = ad.id
     JOIN entity_types et ON ad.entity_type_id = et.id
     WHERE av.entity_id = :facilityId
       AND av.entity_type = :entityType
       AND ad.name LIKE 'equipment_%'
       AND av."deletedAt" IS NULL
       AND ad."deletedAt" IS NULL
     ORDER BY av.sort_order, ad.sort_order`,
    {
      replacements: { facilityId, entityType: ENTITY_TYPE_NAME },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  if (values.length === 0) {
    return [];
  }

  // Group by equipment_group_id to reconstruct individual equipment items
  const equipmentMap = new Map();

  // First pass: collect all group IDs
  for (const value of values) {
    if (value.attribute_name === 'equipment_group_id') {
      const groupId = value.valueString;
      if (!equipmentMap.has(groupId)) {
        equipmentMap.set(groupId, { 
          _groupId: groupId, 
          _sortOrder: value.sortOrder 
        });
      }
    }
  }

  // Second pass: populate equipment data
  for (const value of values) {
    // Find the group this value belongs to by sortOrder
    let targetGroupId = null;
    
    for (const [groupId, equipment] of equipmentMap.entries()) {
      if (equipment._sortOrder === value.sortOrder) {
        targetGroupId = groupId;
        break;
      }
    }

    if (!targetGroupId) continue;

    const equipment = equipmentMap.get(targetGroupId);
    const attrName = value.attribute_name;
    
    // Extract the value based on type
    let attrValue;
    switch (value.valueType) {
      case 'string':
        attrValue = value.valueString;
        break;
      case 'integer':
        // PostgreSQL returns integers as strings in raw queries, so parse them
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
      'equipment_name': 'name',
      'equipment_quantity': 'quantity',
      'equipment_condition': 'condition',
      'equipment_notes': 'notes',
      'equipment_group_id': '_groupId',
    };

    const fieldName = fieldMap[attrName] || attrName;
    equipment[fieldName] = attrValue;
  }

  // Convert map to array and clean up internal fields
  return Array.from(equipmentMap.values()).map(equipment => {
    const { _groupId, _sortOrder, ...cleanEquipment } = equipment;
    return { id: _groupId, ...cleanEquipment };
  });
}

/**
 * Get equipment from legacy TEXT column
 * @param {string} facilityId - The facility's UUID
 * @returns {Promise<Array>} Array of equipment objects
 */
async function getEquipmentFromLegacy(facilityId) {
  const [facility] = await sequelize.query(
    `SELECT "equipmentList" FROM facilities WHERE id = :facilityId`,
    {
      replacements: { facilityId },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  if (!facility || !facility.equipmentList) {
    return [];
  }

  // Legacy equipmentList is stored as TEXT (JSON string)
  try {
    const parsed = JSON.parse(facility.equipmentList);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // If not valid JSON, try to parse as comma-separated string
    if (typeof facility.equipmentList === 'string') {
      return facility.equipmentList.split(',').map(item => ({ 
        name: item.trim(),
        quantity: 1,
        condition: 'Good'
      })).filter(item => item.name);
    }
    return [];
  }
}

/**
 * Add a new equipment item to a facility via EAV tables
 * @param {string} facilityId - The facility's UUID
 * @param {object} equipmentData - The equipment data to add
 * @returns {Promise<object>} The created equipment with its group ID
 */
async function addFacilityEquipment(facilityId, equipmentData) {
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
      throw new Error('Facility entity type not found in EAV system. Run migration script first.');
    }

    // Get attribute definitions
    const attributeDefs = await sequelize.query(
      `SELECT id, name, value_type as "valueType" FROM attribute_definitions 
       WHERE entity_type_id = :entityTypeId AND name LIKE 'equipment_%' AND "deletedAt" IS NULL`,
      {
        replacements: { entityTypeId: entityType.id },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    const attrMap = new Map(attributeDefs.map(a => [a.name, a]));
    
    // Generate a new group ID for this equipment item
    const equipmentGroupId = uuidv4();
    
    // Get the next sort order
    const [maxSort] = await sequelize.query(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order 
       FROM attribute_values 
       WHERE entity_id = :facilityId AND entity_type = :entityType AND "deletedAt" IS NULL`,
      {
        replacements: { facilityId, entityType: ENTITY_TYPE_NAME },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );
    const sortOrder = maxSort.next_order;

    // Map input fields to attribute names
    const fieldToAttr = {
      name: 'equipment_name',
      quantity: 'equipment_quantity',
      condition: 'equipment_condition',
      notes: 'equipment_notes',
    };

    // Always store the group ID
    const valuesToInsert = [
      { attrName: 'equipment_group_id', value: equipmentGroupId, valueType: 'string' },
    ];

    // Add provided fields
    for (const [field, attrName] of Object.entries(fieldToAttr)) {
      if (equipmentData[field] !== undefined && equipmentData[field] !== null && equipmentData[field] !== '') {
        const attrDef = attrMap.get(attrName);
        if (attrDef) {
          valuesToInsert.push({
            attrName,
            attrId: attrDef.id,
            value: equipmentData[field],
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
        value_string: null,
        value_integer: null,
        value_text: null,
      };

      switch (attrDef.valueType || item.valueType) {
        case 'string':
          valueColumns.value_string = String(item.value).substring(0, 500);
          break;
        case 'integer':
          valueColumns.value_integer = parseInt(item.value, 10);
          break;
        case 'text':
          valueColumns.value_text = String(item.value);
          break;
      }

      await sequelize.query(
        `INSERT INTO attribute_values 
         (id, attribute_id, entity_type, entity_id, 
          value_string, value_integer, value_text, sort_order, "createdAt", "updatedAt")
         VALUES (:id, :attribute_id, :entity_type, :entity_id,
                 :value_string, :value_integer, :value_text, :sort_order, NOW(), NOW())`,
        {
          replacements: {
            id: uuidv4(),
            attribute_id: attrDef.id,
            entity_type: ENTITY_TYPE_NAME,
            entity_id: facilityId,
            value_string: valueColumns.value_string,
            value_integer: valueColumns.value_integer,
            value_text: valueColumns.value_text,
            sort_order: sortOrder,
          },
          transaction,
        }
      );
    }

    // Mark facility as EAV migrated
    await sequelize.query(
      `UPDATE facilities SET "equipmentEavMigrated" = true WHERE id = :facilityId`,
      { replacements: { facilityId }, transaction }
    );

    await transaction.commit();

    return {
      id: equipmentGroupId,
      ...equipmentData,
    };

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Update an existing equipment item in EAV tables
 * @param {string} facilityId - The facility's UUID  
 * @param {string} equipmentGroupId - The equipment's group ID
 * @param {object} equipmentData - The updated equipment data
 * @returns {Promise<object>} The updated equipment
 */
async function updateFacilityEquipment(facilityId, equipmentGroupId, equipmentData) {
  const transaction = await sequelize.transaction();

  try {
    const fieldToAttr = {
      name: 'equipment_name',
      quantity: 'equipment_quantity',
      condition: 'equipment_condition',
      notes: 'equipment_notes',
    };

    for (const [field, attrName] of Object.entries(fieldToAttr)) {
      if (equipmentData[field] !== undefined) {
        const [attrDef] = await sequelize.query(
          `SELECT ad.id, ad.value_type as "valueType" 
           FROM attribute_definitions ad
           JOIN entity_types et ON ad.entity_type_id = et.id
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
          `SELECT av.sort_order as "sortOrder" 
           FROM attribute_values av
           JOIN attribute_definitions ad ON av.attribute_id = ad.id
           WHERE av.entity_id = :facilityId 
             AND av.entity_type = :entityType
             AND ad.name = 'equipment_group_id'
             AND av.value_string = :equipmentGroupId
             AND av."deletedAt" IS NULL`,
          {
            replacements: { facilityId, entityType: ENTITY_TYPE_NAME, equipmentGroupId },
            type: sequelize.QueryTypes.SELECT,
            transaction,
          }
        );

        if (!groupValue) {
          throw new Error(`Equipment with group ID ${equipmentGroupId} not found`);
        }

        const sortOrder = groupValue.sortOrder;

        // Build update based on value type (snake_case columns)
        const valueColumn = attrDef.valueType === 'integer' ? 'value_integer' :
                           attrDef.valueType === 'text' ? 'value_text' : 'value_string';
        const valueToSet = attrDef.valueType === 'integer' ? parseInt(equipmentData[field], 10) :
                          String(equipmentData[field]);

        await sequelize.query(
          `UPDATE attribute_values 
           SET ${valueColumn} = :value, "updatedAt" = NOW()
           WHERE entity_id = :facilityId 
             AND entity_type = :entityType
             AND attribute_id = :attrId
             AND sort_order = :sortOrder
             AND "deletedAt" IS NULL`,
          {
            replacements: {
              facilityId,
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
    return { id: equipmentGroupId, ...equipmentData };

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Delete an equipment item from EAV tables (soft delete)
 * @param {string} facilityId - The facility's UUID
 * @param {string} equipmentGroupId - The equipment's group ID
 * @returns {Promise<boolean>} True if deleted successfully
 */
async function deleteFacilityEquipment(facilityId, equipmentGroupId) {
  // Find the sortOrder for this equipment group
  const [groupValue] = await sequelize.query(
    `SELECT av.sort_order as "sortOrder" 
     FROM attribute_values av
     JOIN attribute_definitions ad ON av.attribute_id = ad.id
     WHERE av.entity_id = :facilityId 
       AND av.entity_type = :entityType
       AND ad.name = 'equipment_group_id'
       AND av.value_string = :equipmentGroupId
       AND av."deletedAt" IS NULL`,
    {
      replacements: { facilityId, entityType: ENTITY_TYPE_NAME, equipmentGroupId },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  if (!groupValue) {
    return false;
  }

  // Soft delete all attribute values for this equipment (matching sortOrder)
  await sequelize.query(
    `UPDATE attribute_values 
     SET "deletedAt" = NOW()
     WHERE entity_id = :facilityId 
       AND entity_type = :entityType
       AND sort_order = :sortOrder
       AND "deletedAt" IS NULL`,
    {
      replacements: {
        facilityId,
        entityType: ENTITY_TYPE_NAME,
        sortOrder: groupValue.sortOrder,
      },
    }
  );

  return true;
}

/**
 * Check if a facility's equipment has been migrated to EAV
 * @param {string} facilityId - The facility's UUID
 * @returns {Promise<boolean>} True if migrated
 */
async function isFacilityEquipmentMigrated(facilityId) {
  const [facility] = await sequelize.query(
    `SELECT "equipmentEavMigrated" FROM facilities WHERE id = :facilityId`,
    {
      replacements: { facilityId },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  return facility?.equipmentEavMigrated === true;
}

/**
 * Migrate equipment from legacy to EAV (for bulk migration)
 * @param {string} facilityId - The facility's UUID
 * @param {boolean} dryRun - If true, don't commit changes
 * @returns {Promise<object>} Migration result
 */
async function migrateEquipmentToEav(facilityId, dryRun = false) {
  const legacyEquipment = await getEquipmentFromLegacy(facilityId);
  
  if (legacyEquipment.length === 0) {
    return { migrated: 0, facilityId };
  }

  const transaction = dryRun ? null : await sequelize.transaction();

  try {
    let migrated = 0;

    for (const equipment of legacyEquipment) {
      if (!dryRun) {
        await addFacilityEquipment(facilityId, {
          name: equipment.name || 'Unknown',
          quantity: equipment.quantity || 1,
          condition: equipment.condition || 'Good',
          notes: equipment.notes || null,
        });
      }
      migrated++;
    }

    if (transaction) {
      await transaction.commit();
    }

    return { migrated, facilityId };

  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }
    throw error;
  }
}

module.exports = {
  getFacilityEquipment,
  getEquipmentFromEav,
  getEquipmentFromLegacy,
  addFacilityEquipment,
  updateFacilityEquipment,
  deleteFacilityEquipment,
  isFacilityEquipmentMigrated,
  migrateEquipmentToEav,
  ENTITY_TYPE_NAME,
};
