/**
 * Migration Script: Instructor Awards JSONB to EAV Tables
 * 
 * This script migrates existing JSONB awards data from the instructors table
 * into the new Entity-Attribute-Value (EAV) tables for flexible attribute storage.
 * 
 * The original 'awards' column is kept as a read-only fallback for 2 sprints.
 * 
 * Run with: node scripts/migrate-instructor-awards-to-eav.js
 * 
 * Options:
 *   --dry-run    Preview changes without committing to database
 *   --verbose    Show detailed progress information
 *   --rollback   Rollback the migration (remove EAV data, restore column comment)
 */

const { sequelize } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

// Configuration
const ENTITY_TYPE_NAME = 'Instructor';
const ENTITY_TABLE_NAME = 'instructors';
const MIGRATION_VERSION = '1.0.0';
const FALLBACK_EXPIRY_SPRINTS = 2;

// Award attribute definitions to create in EAV
const AWARD_ATTRIBUTES = [
  {
    name: 'award_title',
    displayName: 'Award Title',
    description: 'Title/name of the award received',
    valueType: 'string',
    isRequired: true,
    isMultiValued: false,
    sortOrder: 1,
  },
  {
    name: 'award_year',
    displayName: 'Award Year',
    description: 'Year the award was received',
    valueType: 'integer',
    isRequired: false,
    isMultiValued: false,
    sortOrder: 2,
    validationRules: { min: 1900, max: 2100 },
  },
  {
    name: 'award_organization',
    displayName: 'Awarding Organization',
    description: 'Organization that granted the award',
    valueType: 'string',
    isRequired: false,
    isMultiValued: false,
    sortOrder: 3,
  },
  {
    name: 'award_description',
    displayName: 'Award Description',
    description: 'Detailed description of the award',
    valueType: 'text',
    isRequired: false,
    isMultiValued: false,
    sortOrder: 4,
  },
  {
    name: 'award_category',
    displayName: 'Award Category',
    description: 'Category of the award (e.g., teaching, research, service)',
    valueType: 'string',
    isRequired: false,
    isMultiValued: false,
    sortOrder: 5,
  },
  {
    name: 'award_group_id',
    displayName: 'Award Group ID',
    description: 'Groups related award attributes together (for multi-valued awards)',
    valueType: 'string',
    isRequired: true,
    isMultiValued: false,
    sortOrder: 0,
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
  log('Checking for existing Instructor entity type...');
  
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
          description: 'Instructor entity for EAV attribute storage',
        },
        transaction,
      }
    );
  }
  
  log(`Created entity type with ID: ${newId}`);
  return newId;
}

async function getOrCreateAttributeDefinitions(entityTypeId, transaction) {
  log('Setting up attribute definitions for awards...');
  const attributeIds = {};

  for (const attr of AWARD_ATTRIBUTES) {
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

async function migrateAwardsData(attributeIds, transaction) {
  log('Fetching instructors with awards data...');
  
  const instructors = await sequelize.query(
    `SELECT id, awards FROM instructors WHERE awards IS NOT NULL AND awards != '[]'::jsonb`,
    {
      type: sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  log(`Found ${instructors.length} instructors with awards to migrate`);

  let totalAwards = 0;
  let totalAttributeValues = 0;
  let errors = [];

  for (const instructor of instructors) {
    try {
      const awards = instructor.awards;
      
      if (!Array.isArray(awards) || awards.length === 0) {
        log(`Instructor ${instructor.id}: No valid awards array`, 'verbose');
        continue;
      }

      log(`Processing instructor ${instructor.id}: ${awards.length} awards`, 'verbose');

      for (let awardIndex = 0; awardIndex < awards.length; awardIndex++) {
        const award = awards[awardIndex];
        const awardGroupId = uuidv4();
        
        // Map JSONB fields to EAV attributes
        const awardMappings = [
          { attrName: 'award_group_id', value: awardGroupId, valueType: 'string' },
          { attrName: 'award_title', value: award.title || award.name || award.awardTitle, valueType: 'string' },
          { attrName: 'award_year', value: award.year || award.awardYear, valueType: 'integer' },
          { attrName: 'award_organization', value: award.organization || award.grantedBy || award.issuingBody, valueType: 'string' },
          { attrName: 'award_description', value: award.description || award.details, valueType: 'text' },
          { attrName: 'award_category', value: award.category || award.type, valueType: 'string' },
        ];

        for (const mapping of awardMappings) {
          if (mapping.value === null || mapping.value === undefined || mapping.value === '') {
            continue;
          }

          const attrId = attributeIds[mapping.attrName];
          if (!attrId) {
            log(`Missing attribute ID for ${mapping.attrName}`, 'warn');
            continue;
          }

          // Check if this value already exists (for idempotency)
          const [existingValue] = await sequelize.query(
            `SELECT id FROM attribute_values 
             WHERE "attributeId" = :attributeId 
               AND "entityId" = :entityId 
               AND "entityType" = :entityType
               AND "deletedAt" IS NULL
               AND (
                 ("valueType" = 'string' AND "valueString" = :valueString)
                 OR ("valueType" = 'integer' AND "valueInteger" = :valueInteger)
                 OR ("valueType" = 'text' AND "valueText" = :valueText)
               )`,
            {
              replacements: {
                attributeId: attrId,
                entityId: instructor.id,
                entityType: ENTITY_TYPE_NAME,
                valueString: mapping.valueType === 'string' ? String(mapping.value) : null,
                valueInteger: mapping.valueType === 'integer' ? parseInt(mapping.value, 10) : null,
                valueText: mapping.valueType === 'text' ? String(mapping.value) : null,
              },
              type: sequelize.QueryTypes.SELECT,
              transaction,
            }
          );

          if (existingValue) {
            log(`Value already exists for ${mapping.attrName} on instructor ${instructor.id}`, 'verbose');
            continue;
          }

          const valueId = uuidv4();
          
          if (!isDryRun) {
            // Build value columns based on type
            const valueColumns = {
              valueString: null,
              valueInteger: null,
              valueText: null,
              valueDecimal: null,
              valueBoolean: null,
              valueDate: null,
              valueDatetime: null,
              valueJson: null,
            };

            switch (mapping.valueType) {
              case 'string':
                valueColumns.valueString = String(mapping.value).substring(0, 500);
                break;
              case 'integer':
                valueColumns.valueInteger = parseInt(mapping.value, 10);
                break;
              case 'text':
                valueColumns.valueText = String(mapping.value);
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
                  id: valueId,
                  attributeId: attrId,
                  entityType: ENTITY_TYPE_NAME,
                  entityId: instructor.id,
                  valueType: mapping.valueType,
                  valueString: valueColumns.valueString,
                  valueInteger: valueColumns.valueInteger,
                  valueText: valueColumns.valueText,
                  sortOrder: awardIndex,
                },
                transaction,
              }
            );
          }

          totalAttributeValues++;
        }

        totalAwards++;
      }
    } catch (err) {
      errors.push({ instructorId: instructor.id, error: err.message });
      log(`Error processing instructor ${instructor.id}: ${err.message}`, 'error');
    }
  }

  return { totalAwards, totalAttributeValues, errors };
}

async function markColumnAsReadOnlyFallback(transaction) {
  log('Marking original awards column as read-only fallback...');
  
  const fallbackComment = `[DEPRECATED - READ-ONLY FALLBACK] ` +
    `Migrated to EAV tables on ${new Date().toISOString()}. ` +
    `Will be removed after ${FALLBACK_EXPIRY_SPRINTS} sprints. ` +
    `Use AttributeValue table for new data. Migration v${MIGRATION_VERSION}`;

  if (!isDryRun) {
    await sequelize.query(
      `COMMENT ON COLUMN instructors.awards IS :comment`,
      {
        replacements: { comment: fallbackComment },
        transaction,
      }
    );
  }

  log(`Column comment updated: "${fallbackComment}"`);
}

async function createMigrationLog(stats, transaction) {
  log('Recording migration in audit log...');
  
  const migrationLog = {
    id: uuidv4(),
    migrationName: 'instructor_awards_to_eav',
    version: MIGRATION_VERSION,
    executedAt: new Date().toISOString(),
    dryRun: isDryRun,
    stats: {
      instructorsProcessed: stats.instructorsProcessed,
      awardsExtracted: stats.totalAwards,
      attributeValuesCreated: stats.totalAttributeValues,
      errors: stats.errors.length,
    },
    fallbackExpiry: `${FALLBACK_EXPIRY_SPRINTS} sprints`,
  };

  // Check if there's a migrations table, if not just log to console
  try {
    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS eav_migration_logs (
         id UUID PRIMARY KEY,
         migration_name VARCHAR(255) NOT NULL,
         version VARCHAR(50) NOT NULL,
         executed_at TIMESTAMP NOT NULL,
         dry_run BOOLEAN DEFAULT false,
         stats JSONB,
         notes TEXT,
         created_at TIMESTAMP DEFAULT NOW()
       )`,
      { transaction }
    );

    if (!isDryRun) {
      await sequelize.query(
        `INSERT INTO eav_migration_logs (id, migration_name, version, executed_at, dry_run, stats, notes)
         VALUES (:id, :migrationName, :version, :executedAt, :dryRun, :stats, :notes)`,
        {
          replacements: {
            id: migrationLog.id,
            migrationName: migrationLog.migrationName,
            version: migrationLog.version,
            executedAt: migrationLog.executedAt,
            dryRun: migrationLog.dryRun,
            stats: JSON.stringify(migrationLog.stats),
            notes: `Fallback expires after ${FALLBACK_EXPIRY_SPRINTS} sprints`,
          },
          transaction,
        }
      );
    }
  } catch (err) {
    log(`Could not create migration log table: ${err.message}`, 'warn');
  }

  return migrationLog;
}

async function rollbackMigration() {
  log('Starting rollback of awards migration...', 'warn');
  
  const transaction = await sequelize.transaction();
  
  try {
    // Get entity type ID
    const [entityType] = await sequelize.query(
      `SELECT id FROM entity_types WHERE name = :name AND "deletedAt" IS NULL`,
      {
        replacements: { name: ENTITY_TYPE_NAME },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    if (!entityType) {
      log('No entity type found for Instructor, nothing to rollback');
      await transaction.rollback();
      return;
    }

    // Get award-related attribute definitions
    const attributeDefs = await sequelize.query(
      `SELECT id, name FROM attribute_definitions 
       WHERE "entityTypeId" = :entityTypeId AND name LIKE 'award_%'`,
      {
        replacements: { entityTypeId: entityType.id },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    if (attributeDefs.length === 0) {
      log('No award attribute definitions found');
    } else {
      const attrIds = attributeDefs.map(a => a.id);
      
      // Soft delete attribute values
      if (!isDryRun) {
        const [, deleteResult] = await sequelize.query(
          `UPDATE attribute_values SET "deletedAt" = NOW() 
           WHERE "attributeId" IN (:attrIds) AND "deletedAt" IS NULL`,
          {
            replacements: { attrIds },
            transaction,
          }
        );
        log(`Soft-deleted attribute values for ${attributeDefs.length} attributes`);

        // Soft delete attribute definitions
        await sequelize.query(
          `UPDATE attribute_definitions SET "deletedAt" = NOW() 
           WHERE id IN (:attrIds) AND "deletedAt" IS NULL`,
          {
            replacements: { attrIds },
            transaction,
          }
        );
        log(`Soft-deleted ${attributeDefs.length} attribute definitions`);
      }
    }

    // Remove the deprecation comment from the awards column
    if (!isDryRun) {
      await sequelize.query(
        `COMMENT ON COLUMN instructors.awards IS 'Instructor awards and recognitions'`,
        { transaction }
      );
    }
    
    log('Restored awards column comment');

    await transaction.commit();
    log('Rollback completed successfully!');
    
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function runMigration() {
  console.log('\n' + '='.repeat(60));
  console.log(' Instructor Awards JSONB to EAV Migration');
  console.log(' Version:', MIGRATION_VERSION);
  console.log(' Mode:', isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE');
  console.log('='.repeat(60) + '\n');

  if (isRollback) {
    await rollbackMigration();
    return;
  }

  const transaction = await sequelize.transaction();

  try {
    // Step 1: Connect to database
    log('Connecting to database...');
    await sequelize.authenticate();
    log('Database connection established');

    // Step 2: Get or create entity type
    const entityTypeId = await getOrCreateEntityType(transaction);

    // Step 3: Get or create attribute definitions
    const attributeIds = await getOrCreateAttributeDefinitions(entityTypeId, transaction);
    log(`Attribute definitions ready: ${Object.keys(attributeIds).length} attributes`);

    // Step 4: Migrate awards data
    const migrationStats = await migrateAwardsData(attributeIds, transaction);

    // Count instructors
    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as count FROM instructors WHERE awards IS NOT NULL AND awards != '[]'::jsonb`,
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    migrationStats.instructorsProcessed = parseInt(countResult.count, 10);

    // Step 5: Mark original column as read-only fallback
    await markColumnAsReadOnlyFallback(transaction);

    // Step 6: Create migration log
    const migrationLog = await createMigrationLog(migrationStats, transaction);

    // Commit or rollback based on dry run
    if (isDryRun) {
      await transaction.rollback();
      log('DRY RUN: All changes rolled back');
    } else {
      await transaction.commit();
      log('All changes committed to database');
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log(' Migration Summary');
    console.log('='.repeat(60));
    console.log(` Entity Type ID:        ${entityTypeId}`);
    console.log(` Instructors Processed: ${migrationStats.instructorsProcessed}`);
    console.log(` Awards Extracted:      ${migrationStats.totalAwards}`);
    console.log(` Attribute Values:      ${migrationStats.totalAttributeValues}`);
    console.log(` Errors:                ${migrationStats.errors.length}`);
    console.log(` Dry Run:               ${isDryRun}`);
    console.log(` Fallback Period:       ${FALLBACK_EXPIRY_SPRINTS} sprints`);
    console.log('='.repeat(60) + '\n');

    if (migrationStats.errors.length > 0) {
      console.log('Errors encountered:');
      migrationStats.errors.forEach((e, i) => {
        console.log(`  ${i + 1}. Instructor ${e.instructorId}: ${e.error}`);
      });
      console.log('');
    }

    if (!isDryRun) {
      console.log('IMPORTANT: Update instructorModel.js to make the awards column read-only.');
      console.log('The EAV migration is complete. Original data is preserved as fallback.\n');
    }

  } catch (error) {
    await transaction.rollback();
    log(`Migration failed: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the migration
runMigration().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
