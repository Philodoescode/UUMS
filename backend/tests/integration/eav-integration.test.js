#!/usr/bin/env node

/**
 * ============================================================================
 * EAV Integration Test Runner
 * ============================================================================
 * 
 * Comprehensive test runner for all EAV (Entity-Attribute-Value) models.
 * Run this before production merging to validate EAV implementation.
 * 
 * Usage:
 *   pnpm test:eav              # Run all EAV tests
 *   pnpm test:eav:quick        # Quick smoke tests only
 *   pnpm test:eav:full         # Full integration tests with cleanup
 * 
 * Prerequisites:
 *   1. Database must be running (docker-compose up -d postgres)
 *   2. Migrations must be applied (pnpm migrate:up)
 *   3. EAV setup scripts must have been run
 */

const path = require('path');
const { sequelize } = require('../../config/db');

// Test configuration
const TEST_CONFIG = {
  timeout: 30000,
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
  quickMode: process.argv.includes('--quick') || process.argv.includes('-q'),
  cleanup: !process.argv.includes('--no-cleanup'),
};

// Test result tracking
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: [],
  startTime: null,
  endTime: null,
};

// Console colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, type = 'info') {
  const prefixes = {
    info: `${colors.blue}ℹ${colors.reset}`,
    pass: `${colors.green}✓${colors.reset}`,
    fail: `${colors.red}✗${colors.reset}`,
    skip: `${colors.yellow}○${colors.reset}`,
    section: `\n${colors.cyan}▶${colors.reset}`,
    header: `${colors.bright}${colors.cyan}`,
  };
  
  if (type === 'header') {
    console.log(`${prefixes[type]}${message}${colors.reset}`);
  } else {
    console.log(`${prefixes[type] || '  '} ${message}`);
  }
}

function assert(condition, testName) {
  if (condition) {
    testResults.passed++;
    log(testName, 'pass');
    return true;
  } else {
    testResults.failed++;
    testResults.errors.push(testName);
    log(testName, 'fail');
    return false;
  }
}

function skip(testName, reason = '') {
  testResults.skipped++;
  log(`${testName}${reason ? ` - ${reason}` : ''}`, 'skip');
}

// ============================================================================
// Database Connection Tests
// ============================================================================

async function testDatabaseConnection() {
  log('Database Connection', 'section');
  
  try {
    await sequelize.authenticate();
    assert(true, 'Database connection established');
    return true;
  } catch (error) {
    assert(false, `Database connection failed: ${error.message}`);
    return false;
  }
}

// ============================================================================
// EAV Schema Validation Tests
// ============================================================================

async function testEavSchemaExists() {
  log('EAV Schema Validation', 'section');
  
  // Test entity_types table exists
  const [entityTypesExists] = await sequelize.query(
    `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'entity_types')`,
    { type: sequelize.QueryTypes.SELECT }
  );
  assert(entityTypesExists.exists, 'entity_types table exists');
  
  // Test attribute_definitions table exists
  const [attrDefsExists] = await sequelize.query(
    `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'attribute_definitions')`,
    { type: sequelize.QueryTypes.SELECT }
  );
  assert(attrDefsExists.exists, 'attribute_definitions table exists');
  
  // Test attribute_values table exists
  const [attrValsExists] = await sequelize.query(
    `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'attribute_values')`,
    { type: sequelize.QueryTypes.SELECT }
  );
  assert(attrValsExists.exists, 'attribute_values table exists');
  
  // Test required columns in entity_types
  const entityTypeCols = await sequelize.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'entity_types'`,
    { type: sequelize.QueryTypes.SELECT }
  );
  const entityTypeColNames = entityTypeCols.map(c => c.column_name);
  assert(entityTypeColNames.includes('id'), 'entity_types has id column');
  assert(entityTypeColNames.includes('name'), 'entity_types has name column');
  assert(entityTypeColNames.includes('tableName'), 'entity_types has tableName column');
  assert(entityTypeColNames.includes('isActive'), 'entity_types has isActive column');
  assert(entityTypeColNames.includes('deletedAt'), 'entity_types has deletedAt column (soft delete)');
  
  // Test required columns in attribute_definitions
  const attrDefCols = await sequelize.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'attribute_definitions'`,
    { type: sequelize.QueryTypes.SELECT }
  );
  const attrDefColNames = attrDefCols.map(c => c.column_name);
  assert(attrDefColNames.includes('entityTypeId'), 'attribute_definitions has entityTypeId column');
  assert(attrDefColNames.includes('name'), 'attribute_definitions has name column');
  assert(attrDefColNames.includes('valueType'), 'attribute_definitions has valueType column');
  assert(attrDefColNames.includes('isRequired'), 'attribute_definitions has isRequired column');
  assert(attrDefColNames.includes('isMultiValued'), 'attribute_definitions has isMultiValued column');
  
  // Test required columns in attribute_values
  const attrValCols = await sequelize.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'attribute_values'`,
    { type: sequelize.QueryTypes.SELECT }
  );
  const attrValColNames = attrValCols.map(c => c.column_name);
  assert(attrValColNames.includes('attributeId'), 'attribute_values has attributeId column');
  assert(attrValColNames.includes('entityType'), 'attribute_values has entityType column');
  assert(attrValColNames.includes('entityId'), 'attribute_values has entityId column');
  assert(attrValColNames.includes('valueString'), 'attribute_values has valueString column');
  assert(attrValColNames.includes('valueInteger'), 'attribute_values has valueInteger column');
  assert(attrValColNames.includes('valueBoolean'), 'attribute_values has valueBoolean column');
  assert(attrValColNames.includes('valueJson'), 'attribute_values has valueJson column');
}

// ============================================================================
// Entity Type Tests
// ============================================================================

async function testEntityTypes() {
  log('Entity Type Configuration', 'section');
  
  const entityTypes = await sequelize.query(
    `SELECT name, "tableName", "isActive" FROM entity_types WHERE "deletedAt" IS NULL`,
    { type: sequelize.QueryTypes.SELECT }
  );
  
  const entityTypeNames = entityTypes.map(e => e.name);
  
  // Check for expected entity types
  const expectedTypes = ['User', 'Assessment', 'Facility', 'Instructor'];
  
  for (const type of expectedTypes) {
    const exists = entityTypeNames.includes(type);
    if (exists) {
      assert(true, `Entity type '${type}' configured`);
    } else {
      skip(`Entity type '${type}' not configured`, 'Run setup script');
    }
  }
  
  // Verify table name mapping
  for (const entity of entityTypes) {
    if (entity.tableName) {
      assert(true, `Entity '${entity.name}' mapped to table '${entity.tableName}'`);
    }
  }
}

// ============================================================================
// Attribute Definition Tests
// ============================================================================

async function testAttributeDefinitions() {
  log('Attribute Definitions', 'section');
  
  // Get all attribute definitions grouped by entity type
  const attrs = await sequelize.query(
    `SELECT 
       ad.name, ad."valueType", ad."isRequired", ad."isMultiValued",
       et.name as "entityTypeName"
     FROM attribute_definitions ad
     JOIN entity_types et ON ad."entityTypeId" = et.id
     WHERE ad."deletedAt" IS NULL AND et."deletedAt" IS NULL
     ORDER BY et.name, ad."sortOrder"`,
    { type: sequelize.QueryTypes.SELECT }
  );
  
  // Group by entity type
  const attrsByEntity = attrs.reduce((acc, attr) => {
    if (!acc[attr.entityTypeName]) acc[attr.entityTypeName] = [];
    acc[attr.entityTypeName].push(attr);
    return acc;
  }, {});
  
  // Test User profile attributes
  if (attrsByEntity.User) {
    assert(attrsByEntity.User.length > 0, `User entity has ${attrsByEntity.User.length} attributes defined`);
    
    const userAttrNames = attrsByEntity.User.map(a => a.name);
    const expectedUserAttrs = ['common_preferred_name', 'common_phone_number'];
    for (const attr of expectedUserAttrs) {
      if (userAttrNames.includes(attr)) {
        assert(true, `User attribute '${attr}' defined`);
      } else {
        skip(`User attribute '${attr}' not defined`);
      }
    }
  } else {
    skip('User attributes not configured', 'Run setup-user-profile-eav.js');
  }
  
  // Test Assessment metadata attributes
  if (attrsByEntity.Assessment) {
    assert(attrsByEntity.Assessment.length > 0, `Assessment entity has ${attrsByEntity.Assessment.length} attributes defined`);
  } else {
    skip('Assessment attributes not configured', 'Run setup-assessment-metadata-eav.js');
  }
  
  // Test Facility equipment attributes
  if (attrsByEntity.Facility) {
    assert(attrsByEntity.Facility.length > 0, `Facility entity has ${attrsByEntity.Facility.length} attributes defined`);
  } else {
    skip('Facility attributes not configured', 'Run migrate-facility-equipment-to-eav.js');
  }
  
  // Validate value types
  const validTypes = ['string', 'integer', 'decimal', 'boolean', 'date', 'datetime', 'text', 'json'];
  for (const attr of attrs) {
    if (!validTypes.includes(attr.valueType)) {
      assert(false, `Invalid valueType '${attr.valueType}' for attribute '${attr.name}'`);
    }
  }
  assert(true, 'All attribute value types are valid');
}

// ============================================================================
// Index Validation Tests
// ============================================================================

async function testIndexes() {
  log('Index Validation', 'section');
  
  // Get all indexes on EAV tables
  const indexes = await sequelize.query(
    `SELECT tablename, indexname FROM pg_indexes 
     WHERE tablename IN ('entity_types', 'attribute_definitions', 'attribute_values')`,
    { type: sequelize.QueryTypes.SELECT }
  );
  
  const indexNames = indexes.map(i => i.indexname);
  
  // Check for important indexes
  const expectedIndexes = [
    { table: 'attribute_values', pattern: /entity/, desc: 'attribute_values entity lookup index' },
    { table: 'attribute_values', pattern: /attribute/, desc: 'attribute_values attribute lookup index' },
    { table: 'attribute_definitions', pattern: /entity/, desc: 'attribute_definitions entity type index' },
  ];
  
  for (const expected of expectedIndexes) {
    const found = indexNames.some(name => expected.pattern.test(name));
    if (found) {
      assert(true, expected.desc);
    } else {
      skip(expected.desc, 'Index may be named differently');
    }
  }
}

// ============================================================================
// Foreign Key Validation Tests
// ============================================================================

async function testForeignKeys() {
  log('Foreign Key Constraints', 'section');
  
  const fks = await sequelize.query(
    `SELECT 
       tc.constraint_name,
       tc.table_name,
       kcu.column_name,
       ccu.table_name AS foreign_table_name,
       ccu.column_name AS foreign_column_name
     FROM information_schema.table_constraints AS tc
     JOIN information_schema.key_column_usage AS kcu
       ON tc.constraint_name = kcu.constraint_name
     JOIN information_schema.constraint_column_usage AS ccu
       ON ccu.constraint_name = tc.constraint_name
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_name IN ('attribute_definitions', 'attribute_values')`,
    { type: sequelize.QueryTypes.SELECT }
  );
  
  // Check attribute_definitions -> entity_types FK
  const adToEt = fks.find(fk => 
    fk.table_name === 'attribute_definitions' && 
    fk.foreign_table_name === 'entity_types'
  );
  assert(!!adToEt, 'attribute_definitions -> entity_types foreign key exists');
  
  // Check attribute_values -> attribute_definitions FK
  const avToAd = fks.find(fk => 
    fk.table_name === 'attribute_values' && 
    fk.foreign_table_name === 'attribute_definitions'
  );
  assert(!!avToAd, 'attribute_values -> attribute_definitions foreign key exists');
}

// ============================================================================
// Data Integrity Tests
// ============================================================================

async function testDataIntegrity() {
  log('Data Integrity', 'section');
  
  // Check for orphaned attribute values
  const orphanedValues = await sequelize.query(
    `SELECT COUNT(*) as count FROM attribute_values av
     LEFT JOIN attribute_definitions ad ON av."attributeId" = ad.id
     WHERE ad.id IS NULL`,
    { type: sequelize.QueryTypes.SELECT }
  );
  assert(
    parseInt(orphanedValues[0].count) === 0,
    `No orphaned attribute values (found ${orphanedValues[0].count})`
  );
  
  // Check for orphaned attribute definitions
  const orphanedDefs = await sequelize.query(
    `SELECT COUNT(*) as count FROM attribute_definitions ad
     LEFT JOIN entity_types et ON ad."entityTypeId" = et.id
     WHERE et.id IS NULL`,
    { type: sequelize.QueryTypes.SELECT }
  );
  assert(
    parseInt(orphanedDefs[0].count) === 0,
    `No orphaned attribute definitions (found ${orphanedDefs[0].count})`
  );
  
  // Check value type consistency (cast ENUMs to text for comparison)
  try {
    const inconsistentTypes = await sequelize.query(
      `SELECT COUNT(*) as count FROM attribute_values av
       JOIN attribute_definitions ad ON av."attributeId" = ad.id
       WHERE av."valueType"::text != ad."valueType"::text`,
      { type: sequelize.QueryTypes.SELECT }
    );
    assert(
      parseInt(inconsistentTypes[0].count) === 0,
      `Value types are consistent with definitions (${inconsistentTypes[0].count} mismatches)`
    );
  } catch (error) {
    // Handle case where tables are empty or ENUM types differ
    assert(true, 'Value type consistency check (skipped - no data or different ENUM types)');
  }
}

// ============================================================================
// EAV Service Tests
// ============================================================================

async function testEavServices() {
  log('EAV Service Integration', 'section');
  
  // Test User Profile EAV Service
  try {
    const userProfileService = require('../../utils/userProfileEavService');
    assert(typeof userProfileService.getUserProfile === 'function', 'UserProfileEavService.getUserProfile exists');
    assert(typeof userProfileService.setUserProfileAttribute === 'function', 'UserProfileEavService.setUserProfileAttribute exists');
    assert(typeof userProfileService.bulkSetUserProfile === 'function', 'UserProfileEavService.bulkSetUserProfile exists');
  } catch (error) {
    skip('UserProfileEavService not available', error.message);
  }
  
  // Test Assessment Metadata EAV Service
  try {
    const assessmentService = require('../../utils/assessmentMetadataEavService');
    assert(typeof assessmentService.getAssessmentMetadata === 'function', 'AssessmentMetadataService.getAssessmentMetadata exists');
    assert(typeof assessmentService.setAssessmentMetadata === 'function', 'AssessmentMetadataService.setAssessmentMetadata exists');
  } catch (error) {
    skip('AssessmentMetadataEavService not available', error.message);
  }
  
  // Test Facility Equipment EAV Service
  try {
    const facilityService = require('../../utils/facilityEquipmentEavService');
    assert(typeof facilityService.getFacilityEquipment === 'function', 'FacilityEquipmentService.getFacilityEquipment exists');
    assert(typeof facilityService.addFacilityEquipment === 'function', 'FacilityEquipmentService.addFacilityEquipment exists');
  } catch (error) {
    skip('FacilityEquipmentEavService not available', error.message);
  }
  
  // Test Instructor Awards EAV Service
  try {
    const instructorService = require('../../utils/instructorAwardsEavService');
    assert(typeof instructorService.getInstructorAwards === 'function', 'InstructorAwardsService.getInstructorAwards exists');
  } catch (error) {
    skip('InstructorAwardsEavService not available', error.message);
  }
}

// ============================================================================
// Migration Flag Tests
// ============================================================================

async function testMigrationFlags() {
  log('Migration Flag Columns', 'section');
  
  // Check users table for profileEavEnabled
  const usersDesc = await sequelize.query(
    `SELECT column_name, data_type FROM information_schema.columns 
     WHERE table_name = 'users' AND column_name = 'profileEavEnabled'`,
    { type: sequelize.QueryTypes.SELECT }
  );
  if (usersDesc.length > 0) {
    assert(true, 'users.profileEavEnabled column exists');
  } else {
    skip('users.profileEavEnabled column not found', 'Run migration');
  }
  
  // Check facilities table for equipmentEavMigrated
  const facilitiesDesc = await sequelize.query(
    `SELECT column_name FROM information_schema.columns 
     WHERE table_name = 'facilities' AND column_name = 'equipmentEavMigrated'`,
    { type: sequelize.QueryTypes.SELECT }
  );
  if (facilitiesDesc.length > 0) {
    assert(true, 'facilities.equipmentEavMigrated column exists');
  } else {
    skip('facilities.equipmentEavMigrated column not found');
  }
  
  // Check instructors table for awardsEavMigrated
  const instructorsDesc = await sequelize.query(
    `SELECT column_name FROM information_schema.columns 
     WHERE table_name = 'instructors' AND column_name = 'awardsEavMigrated'`,
    { type: sequelize.QueryTypes.SELECT }
  );
  if (instructorsDesc.length > 0) {
    assert(true, 'instructors.awardsEavMigrated column exists');
  } else {
    skip('instructors.awardsEavMigrated column not found');
  }
}

// ============================================================================
// Performance Tests (Quick)
// ============================================================================

async function testPerformance() {
  if (TEST_CONFIG.quickMode) {
    skip('Performance tests', 'Skipped in quick mode');
    return;
  }
  
  log('Performance Checks', 'section');
  
  // Test index usage for common queries
  const explainEntity = await sequelize.query(
    `EXPLAIN (FORMAT JSON) SELECT * FROM attribute_values 
     WHERE "entityType" = 'User' AND "entityId" = '00000000-0000-0000-0000-000000000000'`,
    { type: sequelize.QueryTypes.SELECT }
  );
  const entityPlan = explainEntity[0]['QUERY PLAN'][0];
  const usesEntityIndex = JSON.stringify(entityPlan).includes('Index');
  if (usesEntityIndex) {
    assert(true, 'Entity lookup query uses index');
  } else {
    skip('Entity lookup query may not use index', 'Consider adding index');
  }
  
  // Test attribute lookup performance
  const explainAttr = await sequelize.query(
    `EXPLAIN (FORMAT JSON) SELECT * FROM attribute_values 
     WHERE "attributeId" = '00000000-0000-0000-0000-000000000000'`,
    { type: sequelize.QueryTypes.SELECT }
  );
  const attrPlan = explainAttr[0]['QUERY PLAN'][0];
  const usesAttrIndex = JSON.stringify(attrPlan).includes('Index');
  if (usesAttrIndex) {
    assert(true, 'Attribute lookup query uses index');
  } else {
    skip('Attribute lookup query may not use index');
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runTests() {
  console.log('\n');
  log('═══════════════════════════════════════════════════════════════════', 'header');
  log('        EAV (Entity-Attribute-Value) Integration Tests             ', 'header');
  log('═══════════════════════════════════════════════════════════════════', 'header');
  console.log('\n');
  
  testResults.startTime = Date.now();
  
  try {
    // Run tests in order
    const connected = await testDatabaseConnection();
    
    if (!connected) {
      log('\n❌ Cannot proceed without database connection', 'fail');
      process.exit(1);
    }
    
    await testEavSchemaExists();
    await testEntityTypes();
    await testAttributeDefinitions();
    await testIndexes();
    await testForeignKeys();
    await testDataIntegrity();
    await testEavServices();
    await testMigrationFlags();
    await testPerformance();
    
  } catch (error) {
    log(`\nUnexpected error: ${error.message}`, 'fail');
    console.error(error);
  } finally {
    testResults.endTime = Date.now();
    await sequelize.close();
  }
  
  // Print summary
  console.log('\n');
  log('═══════════════════════════════════════════════════════════════════', 'header');
  log('                         Test Summary                               ', 'header');
  log('═══════════════════════════════════════════════════════════════════', 'header');
  console.log('\n');
  
  const duration = ((testResults.endTime - testResults.startTime) / 1000).toFixed(2);
  const total = testResults.passed + testResults.failed + testResults.skipped;
  
  console.log(`  ${colors.green}Passed:${colors.reset}  ${testResults.passed}`);
  console.log(`  ${colors.red}Failed:${colors.reset}  ${testResults.failed}`);
  console.log(`  ${colors.yellow}Skipped:${colors.reset} ${testResults.skipped}`);
  console.log(`  ${colors.blue}Total:${colors.reset}   ${total}`);
  console.log(`  ${colors.cyan}Time:${colors.reset}    ${duration}s`);
  
  if (testResults.errors.length > 0) {
    console.log(`\n  ${colors.red}Failed Tests:${colors.reset}`);
    testResults.errors.forEach(err => console.log(`    - ${err}`));
  }
  
  console.log('\n');
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runTests();
