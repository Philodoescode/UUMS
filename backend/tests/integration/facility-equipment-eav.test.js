/**
 * Integration Tests: Facility Equipment EAV Migration
 * 
 * These tests validate:
 * 1. EAV schema is set up correctly
 * 2. Data migration from legacy column works
 * 3. CRUD operations via EAV service work correctly
 * 4. Fallback to legacy data works when EAV is empty
 * 5. Legacy column can be safely deprecated after validation
 * 
 * Run with: node tests/integration/facility-equipment-eav.test.js
 * 
 * Prerequisites:
 * - Database must be running
 * - EAV tables must exist (entity_types, attribute_definitions, attribute_values)
 * - Run migration script first: node scripts/migrate-facility-equipment-to-eav.js --dry-run
 */

const { sequelize } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

// Import the service
const facilityEquipmentService = require('../../utils/facilityEquipmentEavService');

// Test data
const TEST_FACILITY_ID = uuidv4();
const TEST_FACILITY_DATA = {
  id: TEST_FACILITY_ID,
  name: 'Test Lab 101',
  code: 'TST101',
  type: 'Laboratory',
  capacity: 30,
  status: 'Active',
  isActive: true,
  equipmentList: JSON.stringify([
    { name: 'Projector', quantity: 1, condition: 'Good' },
    { name: 'Whiteboard', quantity: 2, condition: 'Excellent' },
    { name: 'Computer', quantity: 25, condition: 'Good', notes: 'Dell OptiPlex' },
  ]),
};

// Test counters
let passed = 0;
let failed = 0;
const results = [];

function log(message, type = 'info') {
  const prefix = {
    info: '  ',
    pass: '✓ ',
    fail: '✗ ',
    section: '\n📋 ',
  }[type] || '  ';
  console.log(`${prefix}${message}`);
}

function assert(condition, testName) {
  if (condition) {
    passed++;
    results.push({ name: testName, status: 'pass' });
    log(`${testName}`, 'pass');
  } else {
    failed++;
    results.push({ name: testName, status: 'fail' });
    log(`${testName}`, 'fail');
  }
}

async function cleanup() {
  log('Cleaning up test data...', 'section');
  
  try {
    // Remove test attribute values
    await sequelize.query(
      `DELETE FROM attribute_values WHERE "entityId" = :facilityId`,
      { replacements: { facilityId: TEST_FACILITY_ID } }
    );

    // Remove test facility
    await sequelize.query(
      `DELETE FROM facilities WHERE id = :id`,
      { replacements: { id: TEST_FACILITY_ID } }
    );

    log('Cleanup completed');
  } catch (error) {
    log(`Cleanup error: ${error.message}`, 'fail');
  }
}

async function setupTestData() {
  log('Setting up test data...', 'section');
  
  try {
    // Check if facility exists
    const [existing] = await sequelize.query(
      `SELECT id FROM facilities WHERE id = :id`,
      { replacements: { id: TEST_FACILITY_ID }, type: sequelize.QueryTypes.SELECT }
    );

    if (!existing) {
      await sequelize.query(
        `INSERT INTO facilities (id, name, code, type, capacity, status, "isActive", "equipmentList", "createdAt", "updatedAt")
         VALUES (:id, :name, :code, :type, :capacity, :status, :isActive, :equipmentList, NOW(), NOW())`,
        { replacements: TEST_FACILITY_DATA }
      );
      log('Test facility created');
    } else {
      log('Test facility already exists');
    }

    return true;
  } catch (error) {
    log(`Setup error: ${error.message}`, 'fail');
    return false;
  }
}

// ============================================================================
// Test Suite: EAV Schema Validation
// ============================================================================

async function testEavSchemaExists() {
  log('EAV Schema Validation', 'section');

  // Test entity type exists
  const [entityType] = await sequelize.query(
    `SELECT id, name FROM entity_types WHERE name = 'Facility' AND "deletedAt" IS NULL`,
    { type: sequelize.QueryTypes.SELECT }
  );
  assert(!!entityType, 'Facility entity type exists');

  if (!entityType) {
    log('Skipping attribute tests - entity type not found');
    return;
  }

  // Test required attributes exist
  const requiredAttrs = ['equipment_group_id', 'equipment_name', 'equipment_quantity', 'equipment_condition', 'equipment_notes'];
  
  for (const attrName of requiredAttrs) {
    const [attr] = await sequelize.query(
      `SELECT id FROM attribute_definitions 
       WHERE "entityTypeId" = :entityTypeId AND name = :name AND "deletedAt" IS NULL`,
      {
        replacements: { entityTypeId: entityType.id, name: attrName },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    assert(!!attr, `Attribute '${attrName}' exists`);
  }
}

// ============================================================================
// Test Suite: Legacy Data Fallback
// ============================================================================

async function testLegacyFallback() {
  log('Legacy Data Fallback', 'section');

  // Ensure no EAV data exists for test facility
  await sequelize.query(
    `DELETE FROM attribute_values WHERE "entityId" = :facilityId AND "entityType" = 'Facility'`,
    { replacements: { facilityId: TEST_FACILITY_ID } }
  );

  // Reset migration flag
  await sequelize.query(
    `UPDATE facilities SET "equipmentEavMigrated" = false WHERE id = :id`,
    { replacements: { id: TEST_FACILITY_ID } }
  );

  // Test fallback
  const equipment = await facilityEquipmentService.getFacilityEquipment(TEST_FACILITY_ID);
  
  assert(Array.isArray(equipment), 'Fallback returns array');
  assert(equipment.length === 3, 'Fallback returns correct number of items');
  
  if (equipment.length > 0) {
    assert(equipment[0].name === 'Projector', 'First equipment item has correct name');
    assert(equipment[0].quantity === 1, 'First equipment item has correct quantity');
  }
}

// ============================================================================
// Test Suite: EAV CRUD Operations
// ============================================================================

async function testEavCrudOperations() {
  log('EAV CRUD Operations', 'section');

  // Test Add Equipment
  const newEquipment = {
    name: 'Microscope',
    quantity: 10,
    condition: 'Excellent',
    notes: 'Digital microscopes with USB connection',
  };

  let addedEquipment;
  try {
    addedEquipment = await facilityEquipmentService.addFacilityEquipment(TEST_FACILITY_ID, newEquipment);
    assert(!!addedEquipment, 'Add equipment succeeds');
    assert(!!addedEquipment.id, 'Added equipment has group ID');
    assert(addedEquipment.name === newEquipment.name, 'Added equipment has correct name');
  } catch (error) {
    assert(false, `Add equipment: ${error.message}`);
    return;
  }

  // Test Read Equipment (should now prefer EAV)
  const isMigrated = await facilityEquipmentService.isFacilityEquipmentMigrated(TEST_FACILITY_ID);
  assert(isMigrated === true, 'Migration flag is set after add');

  const eavEquipment = await facilityEquipmentService.getEquipmentFromEav(TEST_FACILITY_ID);
  assert(eavEquipment.length >= 1, 'EAV read returns equipment');

  const foundAdded = eavEquipment.find(e => e.name === 'Microscope');
  assert(!!foundAdded, 'Added equipment found in EAV read');

  // Test Update Equipment
  if (addedEquipment && addedEquipment.id) {
    try {
      const updated = await facilityEquipmentService.updateFacilityEquipment(
        TEST_FACILITY_ID,
        addedEquipment.id,
        { quantity: 15, notes: 'Updated notes' }
      );
      assert(updated.quantity === 15, 'Update equipment succeeds');
    } catch (error) {
      assert(false, `Update equipment: ${error.message}`);
    }

    // Verify update
    const afterUpdate = await facilityEquipmentService.getEquipmentFromEav(TEST_FACILITY_ID);
    const updatedItem = afterUpdate.find(e => e.name === 'Microscope');
    assert(updatedItem && updatedItem.quantity === 15, 'Update persisted correctly');

    // Test Delete Equipment
    try {
      const deleted = await facilityEquipmentService.deleteFacilityEquipment(
        TEST_FACILITY_ID,
        addedEquipment.id
      );
      assert(deleted === true, 'Delete equipment succeeds');
    } catch (error) {
      assert(false, `Delete equipment: ${error.message}`);
    }

    // Verify delete (soft delete)
    const afterDelete = await facilityEquipmentService.getEquipmentFromEav(TEST_FACILITY_ID);
    const deletedItem = afterDelete.find(e => e.name === 'Microscope');
    assert(!deletedItem, 'Deleted equipment not found in read');
  }
}

// ============================================================================
// Test Suite: Data Migration
// ============================================================================

async function testDataMigration() {
  log('Data Migration', 'section');

  // Reset state
  await sequelize.query(
    `DELETE FROM attribute_values WHERE "entityId" = :facilityId AND "entityType" = 'Facility'`,
    { replacements: { facilityId: TEST_FACILITY_ID } }
  );
  await sequelize.query(
    `UPDATE facilities SET "equipmentEavMigrated" = false WHERE id = :id`,
    { replacements: { id: TEST_FACILITY_ID } }
  );

  // Run migration for this facility
  try {
    const result = await facilityEquipmentService.migrateEquipmentToEav(TEST_FACILITY_ID, false);
    assert(result.migrated === 3, 'Migration migrates correct number of items');
  } catch (error) {
    assert(false, `Migration execution: ${error.message}`);
    return;
  }

  // Verify migrated data
  const migratedEquipment = await facilityEquipmentService.getEquipmentFromEav(TEST_FACILITY_ID);
  assert(migratedEquipment.length === 3, 'All equipment items migrated');

  // Verify data integrity
  const projector = migratedEquipment.find(e => e.name === 'Projector');
  assert(!!projector, 'Projector found after migration');
  assert(projector && projector.quantity === 1, 'Projector quantity preserved');
  assert(projector && projector.condition === 'Good', 'Projector condition preserved');
}

// ============================================================================
// Test Suite: Deprecation Safety Checks
// ============================================================================

async function testDeprecationSafety() {
  log('Deprecation Safety Checks', 'section');

  // Get facilities with unmigrated equipment
  const [unmigrated] = await sequelize.query(
    `SELECT COUNT(*) as count FROM facilities 
     WHERE "equipmentList" IS NOT NULL 
       AND "equipmentList" != '' 
       AND "equipmentList" != '[]'
       AND ("equipmentEavMigrated" IS NULL OR "equipmentEavMigrated" = false)`,
    { type: sequelize.QueryTypes.SELECT }
  );

  const unmigratedCount = parseInt(unmigrated.count, 10);
  
  // This is informational - not a pass/fail
  log(`Unmigrated facilities with equipment: ${unmigratedCount}`);
  
  // Test: All test facility data should be migrated
  const [testFacility] = await sequelize.query(
    `SELECT "equipmentEavMigrated" FROM facilities WHERE id = :id`,
    { replacements: { id: TEST_FACILITY_ID }, type: sequelize.QueryTypes.SELECT }
  );
  
  assert(testFacility && testFacility.equipmentEavMigrated === true, 
    'Test facility marked as migrated');

  // Verify EAV data matches legacy data count
  const legacyEquipment = await facilityEquipmentService.getEquipmentFromLegacy(TEST_FACILITY_ID);
  const eavEquipment = await facilityEquipmentService.getEquipmentFromEav(TEST_FACILITY_ID);
  
  assert(legacyEquipment.length === eavEquipment.length, 
    'EAV equipment count matches legacy');
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('Facility Equipment EAV Integration Tests');
  console.log('='.repeat(60));

  try {
    await sequelize.authenticate();
    log('Database connection established');

    // Setup
    const setupSuccess = await setupTestData();
    if (!setupSuccess) {
      log('Setup failed, aborting tests', 'fail');
      process.exit(1);
    }

    // Run test suites
    await testEavSchemaExists();
    await testLegacyFallback();
    await testEavCrudOperations();
    await testDataMigration();
    await testDeprecationSafety();

    // Cleanup
    await cleanup();

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Test Summary');
    console.log('='.repeat(60));
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total:  ${passed + failed}`);
    console.log('='.repeat(60) + '\n');

    if (failed > 0) {
      console.log('Failed tests:');
      results.filter(r => r.status === 'fail').forEach(r => {
        console.log(`  - ${r.name}`);
      });
      console.log('');
    }

    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('\nTest execution failed:', error);
    await cleanup();
    process.exit(1);
  }
}

// Run tests
runTests();
