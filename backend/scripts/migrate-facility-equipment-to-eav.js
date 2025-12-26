/**
 * Migration Script: Facility Equipment to EAV Tables
 * 
 * This script migrates existing TEXT equipmentList data from the facilities table
 * into the new Entity-Attribute-Value (EAV) tables for flexible attribute storage.
 * 
 * The original 'equipmentList' column is kept as a read-only fallback for 2 sprints.
 * 
 * Run with: node scripts/migrate-facility-equipment-to-eav.js
 * 
 * Options:
 *   --dry-run    Preview changes without committing to database
 *   --verbose    Show detailed progress information
 *   --rollback   Rollback the migration (remove EAV data, reset migration flag)
 */

const { sequelize } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Configuration
const ENTITY_TYPE_NAME = 'Facility';
const ENTITY_TABLE_NAME = 'facilities';
const MIGRATION_VERSION = '1.0.0';
const FALLBACK_EXPIRY_SPRINTS = 2;

// Equipment attribute definitions to create in EAV
const EQUIPMENT_ATTRIBUTES = [
  {
    name: 'equipment_group_id',
    displayName: 'Equipment Group ID',
    description: 'Groups related equipment attributes together (for multi-valued equipment)',
    valueType: 'string',
    isRequired: true,
    isMultiValued: false,
    sortOrder: 0,
  },
  {
    name: 'equipment_name',
    displayName: 'Equipment Name',
    description: 'Name/type of the equipment',
    valueType: 'string',
    isRequired: true,
    isMultiValued: false,
    sortOrder: 1,
  },
  {
    name: 'equipment_quantity',
    displayName: 'Quantity',
    description: 'Number of units available',
    valueType: 'integer',
    isRequired: false,
    isMultiValued: false,
    sortOrder: 2,
    validationRules: { min: 0, max: 10000 },
  },
  {
    name: 'equipment_condition',
    displayName: 'Condition',
    description: 'Current condition of the equipment',
    valueType: 'string',
    isRequired: false,
    isMultiValued: false,
    sortOrder: 3,
    validationRules: { enum: ['Excellent', 'Good', 'Fair', 'Poor'] },
  },
  {
    name: 'equipment_notes',
    displayName: 'Notes',
    description: 'Additional notes about the equipment',
    valueType: 'text',
    isRequired: false,
    isMultiValued: false,
    sortOrder: 4,
  },
];

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');
const isRollback = args.includes('--rollback');

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '✓',
    warn: '⚠',
    error: '✗',
    verbose: '→',
  }[level] || '•';
  
  if (level === 'verbose' && !isVerbose) return;
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

async function getOrCreateEntityType(transaction) {
  log('Checking for existing Facility entity type...');
  
  const [entityType] = await sequelize.query(
    `SELECT id, name FROM entity_types WHERE name = :name AND "deletedAt" IS NULL`,
    {
      replacements: { name: ENTITY_TYPE_NAME },
      type: sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  if (entityType) {
    log(`Found existing entity type: ${entityType.id}`, 'verbose');
    return entityType.id;
  }

  const newId = uuidv4();
  log(`Creating new entity type for ${ENTITY_TYPE_NAME}...`);
  
  if (!isDryRun) {
    await sequelize.query(
      `INSERT INTO entity_types (id, name, "tableName", description, "isActive", "createdAt", "updatedAt")
       VALUES (:id, :name, :tableName, :description, true, NOW(), NOW())`,
      {
        replacements: {
          id: newId,
          name: ENTITY_TYPE_NAME,
          tableName: ENTITY_TABLE_NAME,
          description: 'Facility entity for EAV attribute storage (equipment, custom fields)',
        },
        transaction,
      }
    );
  }
  
  log(`Created entity type with ID: ${newId}`);
  return newId;
}

async function getOrCreateAttributeDefinitions(entityTypeId, transaction) {
  log('Setting up attribute definitions for equipment...');
  const attributeIds = {};

  for (const attr of EQUIPMENT_ATTRIBUTES) {
    const [existing] = await sequelize.query(
      `SELECT id FROM attribute_definitions 
       WHERE "entityTypeId" = :entityTypeId AND name = :name AND "deletedAt" IS NULL`,
      {
        replacements: { entityTypeId, name: attr.name },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    if (existing) {
      attributeIds[attr.name] = existing.id;
      log(`Attribute '${attr.name}' already exists: ${existing.id}`, 'verbose');
      continue;
    }

    const newId = uuidv4();
    log(`Creating attribute definition: ${attr.name}`, 'verbose');

    if (!isDryRun) {
      await sequelize.query(
        `INSERT INTO attribute_definitions 
         (id, "entityTypeId", name, "displayName", description, "valueType", "isRequired", 
          "isMultiValued", "defaultValue", "validationRules", "sortOrder", "isActive", "createdAt", "updatedAt")
         VALUES (:id, :entityTypeId, :name, :displayName, :description, :valueType, :isRequired,
                 :isMultiValued, :defaultValue, :validationRules, :sortOrder, true, NOW(), NOW())`,
        {
          replacements: {
            id: newId,
            entityTypeId,
            name: attr.name,
            displayName: attr.displayName,
            description: attr.description,
            valueType: attr.valueType,
            isRequired: attr.isRequired,
            isMultiValued: attr.isMultiValued,
            defaultValue: attr.defaultValue || null,
            validationRules: attr.validationRules ? JSON.stringify(attr.validationRules) : null,
            sortOrder: attr.sortOrder,
          },
          transaction,
        }
      );
    }

    attributeIds[attr.name] = newId;
    log(`Created attribute '${attr.name}' with ID: ${newId}`);
  }

  return attributeIds;
}

async function migrateFacilityEquipment(facilityId, equipmentList, attributeIds, transaction) {
  // Parse equipment list
  let equipment = [];
  
  if (equipmentList) {
    try {
      equipment = JSON.parse(equipmentList);
      if (!Array.isArray(equipment)) {
        equipment = [];
      }
    } catch {
      // If not valid JSON, try to parse as comma-separated
      if (typeof equipmentList === 'string') {
        equipment = equipmentList.split(',').map(item => ({
          name: item.trim(),
          quantity: 1,
          condition: 'Good',
        })).filter(item => item.name);
      }
    }
  }

  if (equipment.length === 0) {
    return 0;
  }

  let migratedCount = 0;

  for (let i = 0; i < equipment.length; i++) {
    const item = equipment[i];
    const equipmentGroupId = uuidv4();
    const sortOrder = i;

    // Map to attribute values
    const values = [
      { attrName: 'equipment_group_id', value: equipmentGroupId, valueType: 'string' },
    ];

    if (item.name) {
      values.push({ attrName: 'equipment_name', value: item.name, valueType: 'string' });
    }
    if (item.quantity !== undefined) {
      values.push({ attrName: 'equipment_quantity', value: parseInt(item.quantity, 10), valueType: 'integer' });
    }
    if (item.condition) {
      values.push({ attrName: 'equipment_condition', value: item.condition, valueType: 'string' });
    }
    if (item.notes) {
      values.push({ attrName: 'equipment_notes', value: item.notes, valueType: 'text' });
    }

    // Insert attribute values
    for (const val of values) {
      const attrId = attributeIds[val.attrName];
      if (!attrId) continue;

      const valueColumns = {
        valueString: null,
        valueInteger: null,
        valueText: null,
      };

      switch (val.valueType) {
        case 'string':
          valueColumns.valueString = String(val.value).substring(0, 500);
          break;
        case 'integer':
          valueColumns.valueInteger = val.value;
          break;
        case 'text':
          valueColumns.valueText = String(val.value);
          break;
      }

      if (!isDryRun) {
        await sequelize.query(
          `INSERT INTO attribute_values 
           (id, "attributeId", "entityType", "entityId", "valueType", 
            "valueString", "valueInteger", "valueText", "sortOrder", "createdAt", "updatedAt")
           VALUES (:id, :attributeId, :entityType, :entityId, :valueType,
                   :valueString, :valueInteger, :valueText, :sortOrder, NOW(), NOW())`,
          {
            replacements: {
              id: uuidv4(),
              attributeId: attrId,
              entityType: ENTITY_TYPE_NAME,
              entityId: facilityId,
              valueType: val.valueType,
              valueString: valueColumns.valueString,
              valueInteger: valueColumns.valueInteger,
              valueText: valueColumns.valueText,
              sortOrder,
            },
            transaction,
          }
        );
      }
    }

    migratedCount++;
  }

  return migratedCount;
}

async function runMigration() {
  log(`\n${'='.repeat(60)}`);
  log(`Facility Equipment to EAV Migration - v${MIGRATION_VERSION}`);
  log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  log(`${'='.repeat(60)}\n`);

  const transaction = isDryRun ? null : await sequelize.transaction();

  try {
    // Step 1: Create/verify entity type
    const entityTypeId = await getOrCreateEntityType(transaction);

    // Step 2: Create attribute definitions
    const attributeIds = await getOrCreateAttributeDefinitions(entityTypeId, transaction);

    // Step 3: Get all facilities with equipment
    log('\nFetching facilities with equipment data...');
    const facilities = await sequelize.query(
      `SELECT id, name, code, "equipmentList" 
       FROM facilities 
       WHERE "equipmentList" IS NOT NULL 
         AND "equipmentList" != '' 
         AND "equipmentList" != '[]'
         AND ("equipmentEavMigrated" IS NULL OR "equipmentEavMigrated" = false)`,
      {
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    log(`Found ${facilities.length} facilities with equipment to migrate`);

    // Step 4: Migrate each facility's equipment
    let totalMigrated = 0;
    let facilitiesMigrated = 0;

    for (const facility of facilities) {
      log(`\nMigrating facility: ${facility.name} (${facility.code})`, 'verbose');
      
      const count = await migrateFacilityEquipment(
        facility.id,
        facility.equipmentList,
        attributeIds,
        transaction
      );

      if (count > 0) {
        // Mark facility as migrated
        if (!isDryRun) {
          await sequelize.query(
            `UPDATE facilities SET "equipmentEavMigrated" = true WHERE id = :id`,
            { replacements: { id: facility.id }, transaction }
          );
        }

        totalMigrated += count;
        facilitiesMigrated++;
        log(`  Migrated ${count} equipment items`, 'verbose');
      }
    }

    // Step 5: Add deprecation comment to legacy column
    if (!isDryRun) {
      await sequelize.query(
        `COMMENT ON COLUMN facilities."equipmentList" IS 
         'DEPRECATED: Legacy equipment storage. Use EAV tables via facilityEquipmentEavService. Fallback expires in ${FALLBACK_EXPIRY_SPRINTS} sprints.'`,
        { transaction }
      );
    }

    // Commit transaction
    if (transaction) {
      await transaction.commit();
    }

    // Summary
    log(`\n${'='.repeat(60)}`);
    log('Migration Summary');
    log(`${'='.repeat(60)}`);
    log(`Facilities processed: ${facilitiesMigrated}`);
    log(`Equipment items migrated: ${totalMigrated}`);
    log(`Mode: ${isDryRun ? 'DRY RUN (no changes committed)' : 'LIVE (changes committed)'}`);
    log(`${'='.repeat(60)}\n`);

  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }
    log(`Migration failed: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

async function runRollback() {
  log(`\n${'='.repeat(60)}`);
  log('Facility Equipment EAV Migration - ROLLBACK');
  log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  log(`${'='.repeat(60)}\n`);

  const transaction = isDryRun ? null : await sequelize.transaction();

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
      log('No Facility entity type found. Nothing to rollback.', 'warn');
      return;
    }

    // Remove attribute values for equipment
    log('Removing equipment attribute values...');
    if (!isDryRun) {
      const [deleteResult] = await sequelize.query(
        `DELETE FROM attribute_values 
         WHERE "entityType" = :entityType
           AND "attributeId" IN (
             SELECT id FROM attribute_definitions 
             WHERE "entityTypeId" = :entityTypeId AND name LIKE 'equipment_%'
           )`,
        {
          replacements: { entityType: ENTITY_TYPE_NAME, entityTypeId: entityType.id },
          transaction,
        }
      );
      log(`Deleted attribute values`);
    }

    // Reset migration flags
    log('Resetting facility migration flags...');
    if (!isDryRun) {
      await sequelize.query(
        `UPDATE facilities SET "equipmentEavMigrated" = false WHERE "equipmentEavMigrated" = true`,
        { transaction }
      );
    }

    // Note: We don't delete attribute definitions to preserve schema
    log('Note: Attribute definitions preserved for future use', 'warn');

    if (transaction) {
      await transaction.commit();
    }

    log('\nRollback completed successfully');

  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }
    log(`Rollback failed: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

// Main execution
(async () => {
  try {
    await sequelize.authenticate();
    log('Database connection established');

    if (isRollback) {
      await runRollback();
    } else {
      await runMigration();
    }

    process.exit(0);
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
})();
