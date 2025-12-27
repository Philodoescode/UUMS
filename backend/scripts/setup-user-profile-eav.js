/**
 * Migration Script: User Profile EAV Setup
 * 
 * This script sets up the EAV infrastructure for extensible user profiles.
 * Different user types (Student, Instructor, Parent, Staff) get different attributes.
 * 
 * Run with: node scripts/setup-user-profile-eav.js
 * 
 * Options:
 *   --dry-run    Preview changes without committing to database
 *   --verbose    Show detailed progress information
 *   --rollback   Remove EAV setup (soft delete attribute definitions)
 */

const { sequelize } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Configuration
const ENTITY_TYPE_NAME = 'User';
const ENTITY_TABLE_NAME = 'users';
const MIGRATION_VERSION = '1.0.0';

// ============================================================================
// Attribute Definitions by Category
// ============================================================================

const COMMON_ATTRIBUTES = [
  {
    name: 'common_preferred_name',
    displayName: 'Preferred Name',
    description: 'Name the user prefers to be called',
    valueType: 'string',
    isRequired: false,
    sortOrder: 1,
  },
  {
    name: 'common_pronouns',
    displayName: 'Pronouns',
    description: 'User\'s preferred pronouns (e.g., he/him, she/her, they/them)',
    valueType: 'string',
    isRequired: false,
    sortOrder: 2,
  },
  {
    name: 'common_phone_number',
    displayName: 'Phone Number',
    description: 'Primary contact phone number',
    valueType: 'string',
    isRequired: false,
    sortOrder: 3,
  },
  {
    name: 'common_secondary_email',
    displayName: 'Secondary Email',
    description: 'Alternative email address',
    valueType: 'string',
    isRequired: false,
    sortOrder: 4,
  },
  {
    name: 'common_address_street',
    displayName: 'Street Address',
    description: 'Street address line',
    valueType: 'string',
    isRequired: false,
    sortOrder: 5,
  },
  {
    name: 'common_address_city',
    displayName: 'City',
    description: 'City name',
    valueType: 'string',
    isRequired: false,
    sortOrder: 6,
  },
  {
    name: 'common_address_state',
    displayName: 'State/Province',
    description: 'State or province',
    valueType: 'string',
    isRequired: false,
    sortOrder: 7,
  },
  {
    name: 'common_address_postal_code',
    displayName: 'Postal Code',
    description: 'ZIP or postal code',
    valueType: 'string',
    isRequired: false,
    sortOrder: 8,
  },
  {
    name: 'common_address_country',
    displayName: 'Country',
    description: 'Country of residence',
    valueType: 'string',
    isRequired: false,
    sortOrder: 9,
  },
  {
    name: 'common_date_of_birth',
    displayName: 'Date of Birth',
    description: 'User\'s date of birth',
    valueType: 'date',
    isRequired: false,
    sortOrder: 10,
  },
  {
    name: 'common_nationality',
    displayName: 'Nationality',
    description: 'User\'s nationality',
    valueType: 'string',
    isRequired: false,
    sortOrder: 11,
  },
  {
    name: 'common_profile_picture_url',
    displayName: 'Profile Picture URL',
    description: 'URL to user\'s profile picture',
    valueType: 'string',
    isRequired: false,
    sortOrder: 12,
  },
  {
    name: 'common_bio',
    displayName: 'Biography',
    description: 'Short biography or about me text',
    valueType: 'text',
    isRequired: false,
    sortOrder: 13,
  },
  {
    name: 'common_linkedin_profile',
    displayName: 'LinkedIn Profile',
    description: 'LinkedIn profile URL',
    valueType: 'string',
    isRequired: false,
    sortOrder: 14,
  },
];

const STUDENT_ATTRIBUTES = [
  {
    name: 'student_id',
    displayName: 'Student ID',
    description: 'Official student identification number',
    valueType: 'string',
    isRequired: false,
    sortOrder: 101,
  },
  {
    name: 'student_major',
    displayName: 'Major',
    description: 'Primary field of study',
    valueType: 'string',
    isRequired: false,
    sortOrder: 102,
  },
  {
    name: 'student_minor',
    displayName: 'Minor',
    description: 'Secondary field of study',
    valueType: 'string',
    isRequired: false,
    sortOrder: 103,
  },
  {
    name: 'student_gpa',
    displayName: 'GPA',
    description: 'Current grade point average',
    valueType: 'decimal',
    isRequired: false,
    sortOrder: 104,
    validationRules: { min: 0, max: 4.0 },
  },
  {
    name: 'student_expected_graduation_year',
    displayName: 'Expected Graduation Year',
    description: 'Expected year of graduation',
    valueType: 'integer',
    isRequired: false,
    sortOrder: 105,
    validationRules: { min: 2000, max: 2100 },
  },
  {
    name: 'student_enrollment_date',
    displayName: 'Enrollment Date',
    description: 'Date of initial enrollment',
    valueType: 'date',
    isRequired: false,
    sortOrder: 106,
  },
  {
    name: 'student_classification',
    displayName: 'Classification',
    description: 'Academic classification (Freshman, Sophomore, Junior, Senior, Graduate)',
    valueType: 'string',
    isRequired: false,
    sortOrder: 107,
    validationRules: { enum: ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'PhD'] },
  },
  {
    name: 'student_enrollment_status',
    displayName: 'Enrollment Status',
    description: 'Current enrollment status (Full-time, Part-time, etc.)',
    valueType: 'string',
    isRequired: false,
    sortOrder: 108,
    validationRules: { enum: ['Full-time', 'Part-time', 'Leave of Absence', 'Withdrawn'] },
  },
  {
    name: 'student_emergency_contact_name',
    displayName: 'Emergency Contact Name',
    description: 'Name of emergency contact person',
    valueType: 'string',
    isRequired: false,
    sortOrder: 109,
  },
  {
    name: 'student_emergency_contact_phone',
    displayName: 'Emergency Contact Phone',
    description: 'Phone number of emergency contact',
    valueType: 'string',
    isRequired: false,
    sortOrder: 110,
  },
  {
    name: 'student_emergency_contact_relationship',
    displayName: 'Emergency Contact Relationship',
    description: 'Relationship to emergency contact (Parent, Sibling, etc.)',
    valueType: 'string',
    isRequired: false,
    sortOrder: 111,
  },
  {
    name: 'student_housing_status',
    displayName: 'Housing Status',
    description: 'On-campus or off-campus housing',
    valueType: 'string',
    isRequired: false,
    sortOrder: 112,
    validationRules: { enum: ['On-campus', 'Off-campus', 'Commuter'] },
  },
  {
    name: 'student_meal_plan',
    displayName: 'Meal Plan',
    description: 'Current meal plan selection',
    valueType: 'string',
    isRequired: false,
    sortOrder: 113,
  },
  {
    name: 'student_financial_aid_status',
    displayName: 'Financial Aid Status',
    description: 'Financial aid eligibility status',
    valueType: 'string',
    isRequired: false,
    sortOrder: 114,
  },
  {
    name: 'student_academic_standing',
    displayName: 'Academic Standing',
    description: 'Current academic standing (Good, Probation, etc.)',
    valueType: 'string',
    isRequired: false,
    sortOrder: 115,
    validationRules: { enum: ['Good Standing', 'Academic Probation', 'Academic Warning', 'Dean\'s List'] },
  },
];

const INSTRUCTOR_ATTRIBUTES = [
  {
    name: 'instructor_research_interests',
    displayName: 'Research Interests',
    description: 'Areas of research interest',
    valueType: 'json',
    isRequired: false,
    sortOrder: 201,
  },
  {
    name: 'instructor_academic_rank',
    displayName: 'Academic Rank',
    description: 'Academic rank (Assistant Professor, Associate Professor, etc.)',
    valueType: 'string',
    isRequired: false,
    sortOrder: 202,
    validationRules: { enum: ['Adjunct', 'Lecturer', 'Assistant Professor', 'Associate Professor', 'Professor', 'Distinguished Professor', 'Emeritus'] },
  },
  {
    name: 'instructor_tenure_status',
    displayName: 'Tenure Status',
    description: 'Current tenure status',
    valueType: 'string',
    isRequired: false,
    sortOrder: 203,
    validationRules: { enum: ['Non-tenure Track', 'Tenure Track', 'Tenured'] },
  },
  {
    name: 'instructor_phone_extension',
    displayName: 'Phone Extension',
    description: 'Office phone extension',
    valueType: 'string',
    isRequired: false,
    sortOrder: 204,
  },
  {
    name: 'instructor_fax',
    displayName: 'Fax Number',
    description: 'Office fax number',
    valueType: 'string',
    isRequired: false,
    sortOrder: 205,
  },
  {
    name: 'instructor_personal_website',
    displayName: 'Personal Website',
    description: 'Personal or academic website URL',
    valueType: 'string',
    isRequired: false,
    sortOrder: 206,
  },
  {
    name: 'instructor_office_hours_details',
    displayName: 'Office Hours Details',
    description: 'Detailed office hours schedule with locations',
    valueType: 'json',
    isRequired: false,
    sortOrder: 207,
  },
  {
    name: 'instructor_publications',
    displayName: 'Publications',
    description: 'List of academic publications',
    valueType: 'json',
    isRequired: false,
    sortOrder: 208,
  },
  {
    name: 'instructor_education',
    displayName: 'Education',
    description: 'Educational background and degrees',
    valueType: 'json',
    isRequired: false,
    sortOrder: 209,
  },
  {
    name: 'instructor_courses_taught',
    displayName: 'Courses Taught',
    description: 'List of courses typically taught',
    valueType: 'json',
    isRequired: false,
    sortOrder: 210,
  },
  {
    name: 'instructor_cv_url',
    displayName: 'CV URL',
    description: 'URL to curriculum vitae document',
    valueType: 'string',
    isRequired: false,
    sortOrder: 211,
  },
  {
    name: 'instructor_google_scholar_id',
    displayName: 'Google Scholar ID',
    description: 'Google Scholar profile identifier',
    valueType: 'string',
    isRequired: false,
    sortOrder: 212,
  },
  {
    name: 'instructor_orcid',
    displayName: 'ORCID',
    description: 'ORCID identifier for researcher',
    valueType: 'string',
    isRequired: false,
    sortOrder: 213,
  },
  {
    name: 'instructor_expertise_keywords',
    displayName: 'Expertise Keywords',
    description: 'Keywords describing areas of expertise',
    valueType: 'json',
    isRequired: false,
    sortOrder: 214,
  },
];

const PARENT_ATTRIBUTES = [
  {
    name: 'parent_relationship_type',
    displayName: 'Relationship Type',
    description: 'Relationship to student (Mother, Father, Guardian, etc.)',
    valueType: 'string',
    isRequired: false,
    sortOrder: 301,
    validationRules: { enum: ['Mother', 'Father', 'Guardian', 'Stepmother', 'Stepfather', 'Grandparent', 'Other'] },
  },
  {
    name: 'parent_primary_contact',
    displayName: 'Primary Contact',
    description: 'Whether this is the primary contact for the student',
    valueType: 'boolean',
    isRequired: false,
    sortOrder: 302,
    defaultValue: 'false',
  },
  {
    name: 'parent_occupation',
    displayName: 'Occupation',
    description: 'Parent\'s occupation or profession',
    valueType: 'string',
    isRequired: false,
    sortOrder: 303,
  },
  {
    name: 'parent_employer',
    displayName: 'Employer',
    description: 'Current employer name',
    valueType: 'string',
    isRequired: false,
    sortOrder: 304,
  },
  {
    name: 'parent_home_phone',
    displayName: 'Home Phone',
    description: 'Home phone number',
    valueType: 'string',
    isRequired: false,
    sortOrder: 305,
  },
  {
    name: 'parent_work_phone',
    displayName: 'Work Phone',
    description: 'Work phone number',
    valueType: 'string',
    isRequired: false,
    sortOrder: 306,
  },
  {
    name: 'parent_mobile_phone',
    displayName: 'Mobile Phone',
    description: 'Mobile phone number',
    valueType: 'string',
    isRequired: false,
    sortOrder: 307,
  },
  {
    name: 'parent_preferred_contact_method',
    displayName: 'Preferred Contact Method',
    description: 'Preferred method of contact',
    valueType: 'string',
    isRequired: false,
    sortOrder: 308,
    validationRules: { enum: ['Email', 'Phone', 'Text', 'Mail'] },
  },
  {
    name: 'parent_best_contact_time',
    displayName: 'Best Contact Time',
    description: 'Best time to reach this parent',
    valueType: 'string',
    isRequired: false,
    sortOrder: 309,
  },
  {
    name: 'parent_emergency_authorized',
    displayName: 'Emergency Authorized',
    description: 'Authorized to be contacted in emergencies',
    valueType: 'boolean',
    isRequired: false,
    sortOrder: 310,
    defaultValue: 'true',
  },
  {
    name: 'parent_pickup_authorized',
    displayName: 'Pickup Authorized',
    description: 'Authorized to pick up student (for applicable situations)',
    valueType: 'boolean',
    isRequired: false,
    sortOrder: 311,
    defaultValue: 'false',
  },
  {
    name: 'parent_financial_responsible',
    displayName: 'Financially Responsible',
    description: 'Whether this parent is financially responsible',
    valueType: 'boolean',
    isRequired: false,
    sortOrder: 312,
    defaultValue: 'false',
  },
  {
    name: 'parent_student_ids',
    displayName: 'Student IDs',
    description: 'IDs of students this parent is associated with',
    valueType: 'json',
    isRequired: false,
    sortOrder: 313,
  },
];

const STAFF_ATTRIBUTES = [
  {
    name: 'staff_employee_id',
    displayName: 'Employee ID',
    description: 'Official employee identification number',
    valueType: 'string',
    isRequired: false,
    sortOrder: 401,
  },
  {
    name: 'staff_position_title',
    displayName: 'Position Title',
    description: 'Official job title',
    valueType: 'string',
    isRequired: false,
    sortOrder: 402,
  },
  {
    name: 'staff_department',
    displayName: 'Department',
    description: 'Department or unit name',
    valueType: 'string',
    isRequired: false,
    sortOrder: 403,
  },
  {
    name: 'staff_hire_date',
    displayName: 'Hire Date',
    description: 'Date of hire',
    valueType: 'date',
    isRequired: false,
    sortOrder: 404,
  },
  {
    name: 'staff_employment_type',
    displayName: 'Employment Type',
    description: 'Type of employment (Full-time, Part-time, Contract)',
    valueType: 'string',
    isRequired: false,
    sortOrder: 405,
    validationRules: { enum: ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Intern'] },
  },
  {
    name: 'staff_manager_id',
    displayName: 'Manager ID',
    description: 'User ID of direct manager',
    valueType: 'string',
    isRequired: false,
    sortOrder: 406,
  },
  {
    name: 'staff_office_number',
    displayName: 'Office Number',
    description: 'Office room number',
    valueType: 'string',
    isRequired: false,
    sortOrder: 407,
  },
  {
    name: 'staff_office_building',
    displayName: 'Office Building',
    description: 'Building where office is located',
    valueType: 'string',
    isRequired: false,
    sortOrder: 408,
  },
  {
    name: 'staff_phone_extension',
    displayName: 'Phone Extension',
    description: 'Office phone extension',
    valueType: 'string',
    isRequired: false,
    sortOrder: 409,
  },
  {
    name: 'staff_work_schedule',
    displayName: 'Work Schedule',
    description: 'Typical work schedule',
    valueType: 'json',
    isRequired: false,
    sortOrder: 410,
  },
  {
    name: 'staff_skills',
    displayName: 'Skills',
    description: 'Professional skills and competencies',
    valueType: 'json',
    isRequired: false,
    sortOrder: 411,
  },
  {
    name: 'staff_certifications',
    displayName: 'Certifications',
    description: 'Professional certifications',
    valueType: 'json',
    isRequired: false,
    sortOrder: 412,
  },
  {
    name: 'staff_emergency_contact_name',
    displayName: 'Emergency Contact Name',
    description: 'Name of emergency contact',
    valueType: 'string',
    isRequired: false,
    sortOrder: 413,
  },
  {
    name: 'staff_emergency_contact_phone',
    displayName: 'Emergency Contact Phone',
    description: 'Phone number of emergency contact',
    valueType: 'string',
    isRequired: false,
    sortOrder: 414,
  },
  {
    name: 'staff_employment_status',
    displayName: 'Employment Status',
    description: 'Current employment status',
    valueType: 'string',
    isRequired: false,
    sortOrder: 415,
    validationRules: { enum: ['Active', 'On Leave', 'Suspended', 'Terminated'] },
  },
];

// Combine all attributes
const ALL_ATTRIBUTES = [
  ...COMMON_ATTRIBUTES,
  ...STUDENT_ATTRIBUTES,
  ...INSTRUCTOR_ATTRIBUTES,
  ...PARENT_ATTRIBUTES,
  ...STAFF_ATTRIBUTES,
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
  log('Checking for existing User entity type...');
  
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
          description: 'User entity for extensible profile storage (students, instructors, parents, staff)',
        },
        transaction,
      }
    );
  }
  
  log(`Created entity type with ID: ${newId}`);
  return newId;
}

async function createAttributeDefinitions(entityTypeId, transaction) {
  log('Setting up attribute definitions for user profiles...');
  
  const stats = {
    common: { created: 0, existing: 0 },
    student: { created: 0, existing: 0 },
    instructor: { created: 0, existing: 0 },
    parent: { created: 0, existing: 0 },
    staff: { created: 0, existing: 0 },
  };

  for (const attr of ALL_ATTRIBUTES) {
    const [existingAttr] = await sequelize.query(
      `SELECT id FROM attribute_definitions 
       WHERE "entityTypeId" = :entityTypeId AND name = :name AND "deletedAt" IS NULL`,
      {
        replacements: { entityTypeId, name: attr.name },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    const category = attr.name.split('_')[0];

    if (existingAttr) {
      if (stats[category]) stats[category].existing++;
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
            isRequired: attr.isRequired || false,
            isMultiValued: attr.isMultiValued || false,
            defaultValue: attr.defaultValue || null,
            validationRules: attr.validationRules ? JSON.stringify(attr.validationRules) : null,
            sortOrder: attr.sortOrder,
          },
          transaction,
        }
      );
    }

    if (stats[category]) stats[category].created++;
    log(`Created attribute '${attr.name}' with ID: ${newId}`);
  }

  return stats;
}

async function runSetup() {
  log(`\n${'='.repeat(60)}`);
  log(`User Profile EAV Setup - v${MIGRATION_VERSION}`);
  log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  log(`${'='.repeat(60)}\n`);

  const transaction = isDryRun ? null : await sequelize.transaction();

  try {
    // Step 1: Create/verify entity type
    const entityTypeId = await getOrCreateEntityType(transaction);

    // Step 2: Create attribute definitions
    const stats = await createAttributeDefinitions(entityTypeId, transaction);

    // Commit transaction
    if (transaction) {
      await transaction.commit();
    }

    // Summary
    log(`\n${'='.repeat(60)}`);
    log('Setup Summary');
    log(`${'='.repeat(60)}`);
    log(`Entity Type: ${ENTITY_TYPE_NAME} (${entityTypeId})`);
    log(`\nAttributes by Category:`);
    log(`  Common:     ${stats.common.created} created, ${stats.common.existing} existing`);
    log(`  Student:    ${stats.student.created} created, ${stats.student.existing} existing`);
    log(`  Instructor: ${stats.instructor.created} created, ${stats.instructor.existing} existing`);
    log(`  Parent:     ${stats.parent.created} created, ${stats.parent.existing} existing`);
    log(`  Staff:      ${stats.staff.created} created, ${stats.staff.existing} existing`);
    log(`\nTotal: ${ALL_ATTRIBUTES.length} attribute definitions`);
    log(`Mode: ${isDryRun ? 'DRY RUN (no changes committed)' : 'LIVE (changes committed)'}`);
    log(`${'='.repeat(60)}\n`);

    log('User profile EAV is now ready to use!');
    log('Use userProfileEavService.js to manage profile data.\n');

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
  log('User Profile EAV Setup - ROLLBACK');
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
      log('No User entity type found. Nothing to rollback.', 'warn');
      return;
    }

    // Remove attribute values
    log('Removing user profile attribute values...');
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

    // Reset user flags
    log('Resetting user profile EAV flags...');
    if (!isDryRun) {
      await sequelize.query(
        `UPDATE users SET "profileEavEnabled" = false WHERE "profileEavEnabled" = true`,
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
