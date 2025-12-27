/**
 * Facility Equipment EAV Service
 * 
 * Provides unified access to facility equipment data using entity-specific EAV tables.
 * 
 * Equipment items are stored as individual EAV entries with:
 * - equipment_name: Name of the equipment
 * - equipment_quantity: Quantity available
 * - equipment_condition: Condition (Excellent, Good, Fair, Poor)
 * - equipment_notes: Additional notes
 * - equipment_group_id: Groups attributes of a single equipment item
 * 
 * === Entity-Specific Table ===
 * Uses facility_attribute_values table exclusively with proper FK constraints.
 */

const { sequelize } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const ENTITY_TYPE_NAME = 'Facility';

/**
 * Get all equipment for a facility
 * @param {string} facilityId - The facility's UUID
 * @returns {Promise<Array>} Array of equipment objects
 */
async function getFacilityEquipment(facilityId) {
  // First, try to get from entity-specific EAV table
  const eavEquipment = await getEquipmentFromEav(facilityId);
  
  if (eavEquipment.length > 0) {
    return eavEquipment;
  }

  // Fallback to legacy TEXT column
  const legacyEquipment = await getEquipmentFromLegacy(facilityId);
  return legacyEquipment;
}

/**
 * Get equipment from entity-specific EAV table
 * @param {string} facilityId - The facility's UUID
 * @returns {Promise<Array>} Array of equipment objects grouped by equipment_group_id
 */
async function getEquipmentFromEav(facilityId) {
  const values = await sequelize.query(
    `SELECT 
       fav.facility_id,
       fav.attribute_id as "attributeId",
       ad.name as attribute_name,
       ad."displayName" as attribute_display_name,
       ad."valueType",
       fav.value_string as "valueString",
       fav.value_integer as "valueInteger",
       fav.value_text as "valueText",
       fav.sort_order as "sortOrder"
     FROM facility_attribute_values fav
     JOIN attribute_definitions ad ON fav.attribute_id = ad.id
     WHERE fav.facility_id = :facilityId
       AND ad.name LIKE 'equipment_%'
       AND ad."deletedAt" IS NULL
     ORDER BY fav.sort_order, ad."sortOrder"`,
    {
      replacements: { facilityId },
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

  try {
    const parsed = JSON.parse(facility.equipmentList);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
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
 * Add a new equipment item to a facility
 * @param {string} facilityId - The facility's UUID
 * @param {object} equipmentData - The equipment data to add
 * @returns {Promise<object>} The created equipment with its group ID
 */
async function addFacilityEquipment(facilityId, equipmentData) {
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
      throw new Error('Facility entity type not found in EAV system. Run migration script first.');
    }

    // Get attribute definitions
    const attributeDefs = await sequelize.query(
      `SELECT id, name, "valueType" FROM attribute_definitions 
       WHERE "entityTypeId" = :entityTypeId AND name LIKE 'equipment_%' AND "deletedAt" IS NULL`,
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
       FROM facility_attribute_values 
       WHERE facility_id = :facilityId`,
      {
        replacements: { facilityId },
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

      const valueColumns = prepareValueColumns(item.value, attrDef.valueType || item.valueType);

      await sequelize.query(
        `INSERT INTO facility_attribute_values 
         (facility_id, attribute_id,
          value_string, value_integer, value_decimal, value_boolean,
          value_date, value_datetime, value_text, value_json,
          sort_order, "createdAt", "updatedAt")
         VALUES (:facility_id, :attribute_id,
                 :value_string, :value_integer, :value_decimal, :value_boolean,
                 :value_date, :value_datetime, :value_text, :value_json,
                 :sort_order, NOW(), NOW())`,
        {
          replacements: {
            facility_id: facilityId,
            attribute_id: attrDef.id,
            ...valueColumns,
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
 * Update an existing equipment item
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

    // Find the sortOrder for this equipment group
    const [groupValue] = await sequelize.query(
      `SELECT fav.sort_order as "sortOrder" 
       FROM facility_attribute_values fav
       JOIN attribute_definitions ad ON fav.attribute_id = ad.id
       WHERE fav.facility_id = :facilityId 
         AND ad.name = 'equipment_group_id'
         AND fav.value_string = :equipmentGroupId`,
      {
        replacements: { facilityId, equipmentGroupId },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    if (!groupValue) {
      throw new Error(`Equipment with group ID ${equipmentGroupId} not found`);
    }

    const sortOrder = groupValue.sortOrder;

    for (const [field, attrName] of Object.entries(fieldToAttr)) {
      if (equipmentData[field] !== undefined) {
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

        const valueColumns = prepareValueColumns(equipmentData[field], attrDef.valueType);

        // Upsert the value
        await sequelize.query(
          `INSERT INTO facility_attribute_values 
           (facility_id, attribute_id,
            value_string, value_integer, value_decimal, value_boolean,
            value_date, value_datetime, value_text, value_json,
            sort_order, "createdAt", "updatedAt")
           VALUES (:facility_id, :attribute_id,
                   :value_string, :value_integer, :value_decimal, :value_boolean,
                   :value_date, :value_datetime, :value_text, :value_json,
                   :sort_order, NOW(), NOW())
           ON CONFLICT (facility_id, attribute_id) 
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
              facility_id: facilityId,
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
    return { id: equipmentGroupId, ...equipmentData };

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Delete an equipment item (hard delete)
 * @param {string} facilityId - The facility's UUID
 * @param {string} equipmentGroupId - The equipment's group ID
 * @returns {Promise<boolean>} True if deleted successfully
 */
async function deleteFacilityEquipment(facilityId, equipmentGroupId) {
  // Find the sortOrder for this equipment group
  const [groupValue] = await sequelize.query(
    `SELECT fav.sort_order as "sortOrder" 
     FROM facility_attribute_values fav
     JOIN attribute_definitions ad ON fav.attribute_id = ad.id
     WHERE fav.facility_id = :facilityId 
       AND ad.name = 'equipment_group_id'
       AND fav.value_string = :equipmentGroupId`,
    {
      replacements: { facilityId, equipmentGroupId },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  if (!groupValue) {
    return false;
  }

  // Delete all attribute values for this equipment (matching sortOrder)
  await sequelize.query(
    `DELETE FROM facility_attribute_values 
     WHERE facility_id = :facilityId 
       AND sort_order = :sortOrder`,
    {
      replacements: {
        facilityId,
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
 * Migrate equipment from legacy to EAV
 * @param {string} facilityId - The facility's UUID
 * @param {boolean} dryRun - If true, don't commit changes
 * @returns {Promise<object>} Migration result
 */
async function migrateEquipmentToEav(facilityId, dryRun = false) {
  const legacyEquipment = await getEquipmentFromLegacy(facilityId);
  
  if (legacyEquipment.length === 0) {
    return { migrated: 0, facilityId };
  }

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

  return { migrated, facilityId };
}

/**
 * Get information about which table is being used
 * @returns {object} Configuration info
 */
function getEavTableInfo() {
  return {
    entityType: ENTITY_TYPE_NAME,
    tableName: 'facility_attribute_values',
    description: 'Entity-specific EAV table with proper foreign key constraints',
  };
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
  getEavTableInfo,
  ENTITY_TYPE_NAME,
};
