/**
 * Migration Script: Assessment Metadata EAV Setup
 * 
 * This script sets up the EAV infrastructure for assessment extensible metadata.
 * Unlike other migrations, this creates new capabilities rather than migrating existing data.
 * 
 * Run with: node scripts/setup-assessment-metadata-eav.js
 * 
 * Options:
 *   --dry-run    Preview changes without committing to database
 *   --verbose    Show detailed progress information
 *   --rollback   Remove EAV setup (soft delete attribute definitions)
 */

const { sequelize } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Configuration
const ENTITY_TYPE_NAME = 'Assessment';
const ENTITY_TABLE_NAME = 'assessments';
const MIGRATION_VERSION = '1.0.0';

// Assessment metadata attribute definitions
const METADATA_ATTRIBUTES = [
  {
    name: 'grading_rubric',
    displayName: 'Grading Rubric',
    description: 'Detailed grading criteria and point distribution',
    valueType: 'text',
    isRequired: false,
    isMultiValued: false,
    sortOrder: 1,
  },
  {
    name: 'difficulty_level',
    displayName: 'Difficulty Level',
    description: 'Assessment difficulty (Easy, Medium, Hard, Expert)',
    valueType: 'string',
    isRequired: false,
    isMultiValued: false,
    sortOrder: 2,
    validationRules: { enum: ['Easy', 'Medium', 'Hard', 'Expert'] },
  },
  {
    name: 'estimated_duration',
    displayName: 'Estimated Duration',
    description: 'Expected completion time in minutes (for student guidance)',
    valueType: 'integer',
    isRequired: false,
    isMultiValued: false,
    sortOrder: 3,
    validationRules: { min: 1, max: 600 },
  },
  {
    name: 'prerequisite_topics',
    displayName: 'Prerequisite Topics',
    description: 'Topics/concepts students should know before attempting',
    valueType: 'json',
    isRequired: false,
    isMultiValued: false,
    sortOrder: 4,
  },
  {
    name: 'learning_objectives',
    displayName: 'Learning Objectives',
    description: 'What students should learn from this assessment',
    valueType: 'json',
    isRequired: false,
    isMultiValued: false,
    sortOrder: 5,
  },
  {
    name: 'instructor_notes',
    displayName: 'Instructor Notes',
    description: 'Private notes for instructors (not visible to students)',
    valueType: 'text',
    isRequired: false,
    isMultiValued: false,
    sortOrder: 6,
  },
  {
    name: 'proctoring_required',
    displayName: 'Proctoring Required',
    description: 'Whether proctoring/supervision is required',
    valueType: 'boolean',
    isRequired: false,
    isMultiValued: false,
    sortOrder: 7,
    defaultValue: 'false',
  },
  {
    name: 'calculator_allowed',
    displayName: 'Calculator Allowed',
    description: 'Whether calculator use is permitted',
    valueType: 'boolean',
    isRequired: false,
    isMultiValued: false,
    sortOrder: 8,
    defaultValue: 'false',
  },
  {
    name: 'reference_materials',
    displayName: 'Allowed Reference Materials',
    description: 'List of permitted reference materials (open book, notes, etc.)',
    valueType: 'text',
    isRequired: false,
    isMultiValued: false,
    sortOrder: 9,
  },
  {
    name: 'accommodation_notes',
    displayName: 'Accommodation Notes',
    description: 'Notes for accessibility accommodations',
    valueType: 'text',
    isRequired: false,
    isMultiValued: false,
    sortOrder: 10,
  },
  {
    name: 'assessment_weight',
    displayName: 'Assessment Weight',
    description: 'Weight in final grade calculation (0-100%)',
    valueType: 'decimal',
    isRequired: false,
    isMultiValued: false,
    sortOrder: 11,
    validationRules: { min: 0, max: 100 },
  },
  {
    name: 'retry_delay_hours',
    displayName: 'Retry Delay (Hours)',
    description: 'Minimum hours between retry attempts',
    valueType: 'integer',
    isRequired: false,
    isMultiValued: false,
    sortOrder: 12,
    validationRules: { min: 0, max: 720 },
    defaultValue: '0',
  },
  {
    name: 'show_answers_after',
    displayName: 'Show Answers After Submission',
    description: 'When to reveal correct answers (immediately, after_due_date, never)',
    valueType: 'string',
    isRequired: false,
    isMultiValued: false,
    sortOrder: 13,
    validationRules: { enum: ['immediately', 'after_due_date', 'never'] },
    defaultValue: 'never',
  },
  {
    name: 'shuffle_questions',
    displayName: 'Shuffle Questions',
    description: 'Randomize question order for each student',
    valueType: 'boolean',
    isRequired: false,
    isMultiValued: false,
    sortOrder: 14,
    defaultValue: 'false',
  },
  {
    name: 'shuffle_options',
    displayName: 'Shuffle Options',
    description: 'Randomize answer options for multiple choice questions',
    valueType: 'boolean',
    isRequired: false,
    isMultiValued: false,
    sortOrder: 15,
    defaultValue: 'false',
  },
  {
    name: 'passing_score',
    displayName: 'Passing Score',
    description: 'Minimum score to pass (percentage)',
    valueType: 'decimal',
    isRequired: false,
    isMultiValued: false,
    sortOrder: 16,
    validationRules: { min: 0, max: 100 },
  },
  {
    name: 'custom_metadata',
    displayName: 'Custom Metadata',
    description: 'Additional custom metadata in JSON format',
    valueType: 'json',
    isRequired: false,
    isMultiValued: false,
    sortOrder: 99,
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
  log('Checking for existing Assessment entity type...');
  
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
          description: 'Assessment entity for extensible metadata storage',
        },
        transaction,
      }
    );
  }
  
  log(`Created entity type with ID: ${newId}`);
  return newId;
}

async function createAttributeDefinitions(entityTypeId, transaction) {
  log('Setting up attribute definitions for assessment metadata...');
  const created = [];
  const existing = [];

  for (const attr of METADATA_ATTRIBUTES) {
    const [existingAttr] = await sequelize.query(
      `SELECT id FROM attribute_definitions 
       WHERE "entityTypeId" = :entityTypeId AND name = :name AND "deletedAt" IS NULL`,
      {
        replacements: { entityTypeId, name: attr.name },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    if (existingAttr) {
      existing.push(attr.name);
      log(`Attribute '${attr.name}' already exists: ${existingAttr.id}`, 'verbose');
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

    created.push(attr.name);
    log(`Created attribute '${attr.name}' with ID: ${newId}`);
  }

  return { created, existing };
}

async function runSetup() {
  log(`\n${'='.repeat(60)}`);
  log(`Assessment Metadata EAV Setup - v${MIGRATION_VERSION}`);
  log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  log(`${'='.repeat(60)}\n`);

  const transaction = isDryRun ? null : await sequelize.transaction();

  try {
    // Step 1: Create/verify entity type
    const entityTypeId = await getOrCreateEntityType(transaction);

    // Step 2: Create attribute definitions
    const { created, existing } = await createAttributeDefinitions(entityTypeId, transaction);

    // Commit transaction
    if (transaction) {
      await transaction.commit();
    }

    // Summary
    log(`\n${'='.repeat(60)}`);
    log('Setup Summary');
    log(`${'='.repeat(60)}`);
    log(`Entity Type: ${ENTITY_TYPE_NAME} (${entityTypeId})`);
    log(`Attributes created: ${created.length}`);
    log(`Attributes already existing: ${existing.length}`);
    log(`Total attributes available: ${METADATA_ATTRIBUTES.length}`);
    log(`Mode: ${isDryRun ? 'DRY RUN (no changes committed)' : 'LIVE (changes committed)'}`);
    log(`${'='.repeat(60)}\n`);

    if (created.length > 0) {
      log('\nNew attributes created:');
      created.forEach(name => log(`  - ${name}`));
    }

    log('\nAssessment metadata EAV is now ready to use!');
    log('Use assessmentMetadataEavService.js to manage metadata.\n');

  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }
    log(`Setup failed: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

async function runRollback() {
  log(`\n${'='.repeat(60)}`);
  log('Assessment Metadata EAV Setup - ROLLBACK');
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
      log('No Assessment entity type found. Nothing to rollback.', 'warn');
      return;
    }

    // Remove attribute values
    log('Removing assessment metadata attribute values...');
    if (!isDryRun) {
      await sequelize.query(
        `UPDATE attribute_values 
         SET "deletedAt" = NOW()
         WHERE "entityType" = :entityType
           AND "attributeId" IN (
             SELECT id FROM attribute_definitions WHERE "entityTypeId" = :entityTypeId
           )
           AND "deletedAt" IS NULL`,
        {
          replacements: { entityType: ENTITY_TYPE_NAME, entityTypeId: entityType.id },
          transaction,
        }
      );
    }

    // Soft delete attribute definitions
    log('Soft deleting attribute definitions...');
    if (!isDryRun) {
      await sequelize.query(
        `UPDATE attribute_definitions 
         SET "deletedAt" = NOW(), "isActive" = false
         WHERE "entityTypeId" = :entityTypeId AND "deletedAt" IS NULL`,
        {
          replacements: { entityTypeId: entityType.id },
          transaction,
        }
      );
    }

    // Reset assessment flags
    log('Resetting assessment metadata flags...');
    if (!isDryRun) {
      await sequelize.query(
        `UPDATE assessments SET "metadataEavEnabled" = false WHERE "metadataEavEnabled" = true`,
        { transaction }
      );
    }

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
      await runSetup();
    }

    process.exit(0);
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
})();
