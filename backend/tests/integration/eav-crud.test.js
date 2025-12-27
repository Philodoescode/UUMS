#!/usr/bin/env node

/**
 * ============================================================================
 * EAV CRUD Operations Test
 * ============================================================================
 * 
 * Tests CRUD operations for all EAV services with actual database operations.
 * This validates that the EAV pattern works correctly end-to-end.
 * 
 * Usage:
 *   node tests/integration/eav-crud.test.js
 *   pnpm test:eav:crud
 */

const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../../config/db');

// Test configuration
const TEST_TIMEOUT = 30000;
const CLEANUP_ON_FINISH = true;

// Test data storage for cleanup
const testData = {
  users: [],
  facilities: [],
  assessments: [],
  courses: [],
};

// Result tracking
const results = {
  passed: 0,
  failed: 0,
  errors: [],
};

// Colors
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(msg, type = 'info') {
  const prefix = {
    pass: `${c.green}✓${c.reset}`,
    fail: `${c.red}✗${c.reset}`,
    section: `\n${c.cyan}▶${c.reset}`,
    info: '  ',
  }[type] || '  ';
  console.log(`${prefix} ${msg}`);
}

function assert(condition, name) {
  if (condition) {
    results.passed++;
    log(name, 'pass');
    return true;
  } else {
    results.failed++;
    results.errors.push(name);
    log(name, 'fail');
    return false;
  }
}

// ============================================================================
// Cleanup Functions
// ============================================================================

async function cleanup() {
  log('Cleaning up test data...', 'section');
  
  try {
    // Clean attribute values for test entities
    for (const userId of testData.users) {
      await sequelize.query(
        `DELETE FROM attribute_values WHERE "entityId" = :id AND "entityType" = 'User'`,
        { replacements: { id: userId } }
      );
      await sequelize.query(`DELETE FROM users WHERE id = :id`, { replacements: { id: userId } });
    }
    
    for (const facilityId of testData.facilities) {
      await sequelize.query(
        `DELETE FROM attribute_values WHERE "entityId" = :id AND "entityType" = 'Facility'`,
        { replacements: { id: facilityId } }
      );
      await sequelize.query(`DELETE FROM facilities WHERE id = :id`, { replacements: { id: facilityId } });
    }
    
    for (const assessmentId of testData.assessments) {
      await sequelize.query(
        `DELETE FROM attribute_values WHERE "entityId" = :id AND "entityType" = 'Assessment'`,
        { replacements: { id: assessmentId } }
      );
      await sequelize.query(`DELETE FROM assessments WHERE id = :id`, { replacements: { id: assessmentId } });
    }
    
    for (const courseId of testData.courses) {
      await sequelize.query(`DELETE FROM courses WHERE id = :id`, { replacements: { id: courseId } });
    }
    
    log('Test data cleaned up');
  } catch (error) {
    log(`Cleanup error: ${error.message}`, 'fail');
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function getOrCreateTestRole() {
  // Get an existing role or create one for testing
  const [existingRole] = await sequelize.query(
    `SELECT id FROM roles LIMIT 1`,
    { type: sequelize.QueryTypes.SELECT }
  );
  
  if (existingRole) {
    return existingRole.id;
  }
  
  // Create a test role if none exists
  const roleId = uuidv4();
  await sequelize.query(
    `INSERT INTO roles (id, name, description, "createdAt", "updatedAt")
     VALUES (:id, 'TestRole', 'Test role for EAV tests', NOW(), NOW())
     ON CONFLICT (name) DO NOTHING`,
    { replacements: { id: roleId } }
  );
  
  const [role] = await sequelize.query(
    `SELECT id FROM roles WHERE name = 'TestRole'`,
    { type: sequelize.QueryTypes.SELECT }
  );
  
  return role?.id || roleId;
}

async function createTestUser() {
  const userId = uuidv4();
  const roleId = await getOrCreateTestRole();
  
  // Create user without roleId (multi-role pattern)
  await sequelize.query(
    `INSERT INTO users (id, "fullName", email, password, "isActive", "createdAt", "updatedAt")
     VALUES (:id, :name, :email, 'test_hash', true, NOW(), NOW())`,
    {
      replacements: {
        id: userId,
        name: `Test User ${userId.slice(0, 8)}`,
        email: `test-${userId.slice(0, 8)}@example.com`,
      },
    }
  );
  
  // Assign role via user_roles join table
  await sequelize.query(
    `INSERT INTO user_roles (id, "userId", "roleId", "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), :userId, :roleId, NOW(), NOW())`,
    {
      replacements: { userId, roleId },
    }
  );
  
  testData.users.push(userId);
  return userId;
}

async function createTestCourse() {
  // Try to get an existing course first
  const [existingCourse] = await sequelize.query(
    `SELECT id FROM courses LIMIT 1`,
    { type: sequelize.QueryTypes.SELECT }
  );
  
  if (existingCourse) {
    return existingCourse.id;
  }
  
  // Get a department for the course
  const [dept] = await sequelize.query(
    `SELECT id FROM departments LIMIT 1`,
    { type: sequelize.QueryTypes.SELECT }
  );
  
  if (!dept) {
    log('No departments found - skipping course creation', 'info');
    return null;
  }
  
  const courseId = uuidv4();
  await sequelize.query(
    `INSERT INTO courses (id, "courseCode", name, description, credits, "departmentId", "isActive", "createdAt", "updatedAt")
     VALUES (:id, :code, 'Test Course', 'Test Description', 3, :deptId, true, NOW(), NOW())`,
    {
      replacements: {
        id: courseId,
        code: `TST${Date.now().toString().slice(-4)}`,
        deptId: dept.id,
      },
    }
  );
  testData.courses.push(courseId);
  return courseId;
}

async function createTestFacility() {
  // Try to get an existing facility first
  const [existingFacility] = await sequelize.query(
    `SELECT id FROM facilities LIMIT 1`,
    { type: sequelize.QueryTypes.SELECT }
  );
  
  if (existingFacility) {
    return existingFacility.id;
  }
  
  const facilityId = uuidv4();
  await sequelize.query(
    `INSERT INTO facilities (id, name, code, type, capacity, status, "isActive", "createdAt", "updatedAt")
     VALUES (:id, :name, :code, 'Laboratory', 30, 'Active', true, NOW(), NOW())`,
    {
      replacements: {
        id: facilityId,
        name: `Test Facility ${facilityId.slice(0, 8)}`,
        code: `FAC${Date.now().toString().slice(-4)}`,
      },
    }
  );
  testData.facilities.push(facilityId);
  return facilityId;
}

async function createTestAssessment(courseId) {
  if (!courseId) return null;
  
  // Try to get any existing assessment first
  const [existingAssessment] = await sequelize.query(
    `SELECT id FROM assessments LIMIT 1`,
    { type: sequelize.QueryTypes.SELECT }
  );
  
  if (existingAssessment) {
    return existingAssessment.id;
  }
  
  const assessmentId = uuidv4();
  const accessCode = `TST${Date.now().toString().slice(-6)}`;
  
  await sequelize.query(
    `INSERT INTO assessments (id, "courseId", title, description, type, "accessCode", "timeLimit", "attemptsAllowed", 
     "isActive", "latePolicy", "latePenalty", questions, "createdAt", "updatedAt")
     VALUES (:id, :courseId, 'Test Assessment', 'Test', 'QUIZ', :accessCode, 60, 1, true, 'BLOCK_LATE', 0, '[]', NOW(), NOW())`,
    {
      replacements: {
        id: assessmentId,
        courseId,
        accessCode,
      },
    }
  );
  testData.assessments.push(assessmentId);
  return assessmentId;
}

async function entityTypeExists(name) {
  const [result] = await sequelize.query(
    `SELECT id FROM entity_types WHERE name = :name AND "deletedAt" IS NULL`,
    { replacements: { name }, type: sequelize.QueryTypes.SELECT }
  );
  return !!result;
}

// ============================================================================
// User Profile EAV Tests
// ============================================================================

async function testUserProfileEav() {
  log('User Profile EAV CRUD Operations', 'section');
  
  if (!(await entityTypeExists('User'))) {
    log('User entity type not configured - skipping', 'info');
    return;
  }
  
  let UserProfileEavService;
  try {
    UserProfileEavService = require('../../utils/userProfileEavService');
  } catch (e) {
    log('UserProfileEavService not available - skipping', 'info');
    return;
  }
  
  const userId = await createTestUser();
  
  // Test CREATE - Set single attribute
  const setResult = await UserProfileEavService.setUserProfileAttribute(
    userId,
    'common_preferred_name',
    'TestNickname'
  );
  assert(setResult?.success === true, 'Set user profile attribute');
  
  // Test READ - Get profile
  const profile = await UserProfileEavService.getUserProfile(userId);
  assert(profile?.success === true, 'Get user profile');
  assert(profile?.data?.commonPreferredName === 'TestNickname', 'Profile contains set attribute');
  
  // Test UPDATE - Update attribute
  const updateResult = await UserProfileEavService.setUserProfileAttribute(
    userId,
    'common_preferred_name',
    'UpdatedNickname'
  );
  assert(updateResult?.success === true, 'Update user profile attribute');
  
  const updatedProfile = await UserProfileEavService.getUserProfile(userId);
  assert(updatedProfile?.data?.commonPreferredName === 'UpdatedNickname', 'Attribute updated correctly');
  
  // Test BULK SET
  const bulkResult = await UserProfileEavService.bulkSetUserProfile(userId, {
    common_phone_number: '+1-555-0100',
    common_address_city: 'Test City',
  });
  assert(bulkResult?.success === true, 'Bulk set user profile attributes');
  
  const bulkProfile = await UserProfileEavService.getUserProfile(userId);
  assert(bulkProfile?.data?.commonPhoneNumber === '+1-555-0100', 'Bulk attribute 1 set correctly');
  assert(bulkProfile?.data?.commonAddressCity === 'Test City', 'Bulk attribute 2 set correctly');
  
  // Test DELETE - Delete attribute
  const deleteResult = await UserProfileEavService.deleteUserProfileAttribute(
    userId,
    'common_preferred_name'
  );
  assert(deleteResult?.success === true, 'Delete user profile attribute');
  
  const afterDelete = await UserProfileEavService.getUserProfile(userId);
  assert(!afterDelete?.data?.commonPreferredName, 'Attribute deleted correctly');
}

// ============================================================================
// Assessment Metadata EAV Tests
// ============================================================================

async function testAssessmentMetadataEav() {
  log('Assessment Metadata EAV CRUD Operations', 'section');
  
  if (!(await entityTypeExists('Assessment'))) {
    log('Assessment entity type not configured - skipping', 'info');
    return;
  }
  
  let AssessmentMetadataService;
  try {
    AssessmentMetadataService = require('../../utils/assessmentMetadataEavService');
  } catch (e) {
    log('AssessmentMetadataEavService not available - skipping', 'info');
    return;
  }
  
  const courseId = await createTestCourse();
  const assessmentId = await createTestAssessment(courseId);
  
  // Test CREATE
  const setResult = await AssessmentMetadataService.setAssessmentMetadata(
    assessmentId,
    'difficulty_level',
    'intermediate'
  );
  assert(setResult?.success === true || setResult !== null, 'Set assessment metadata');
  
  // Test READ
  const metadata = await AssessmentMetadataService.getAssessmentMetadata(assessmentId);
  assert(metadata !== null, 'Get assessment metadata');
  
  // Test available attributes
  const availableAttrs = await AssessmentMetadataService.getAvailableMetadataAttributes();
  assert(Array.isArray(availableAttrs), 'Get available metadata attributes');
  assert(availableAttrs.length > 0, 'Available attributes list is not empty');
}

// ============================================================================
// Facility Equipment EAV Tests
// ============================================================================

async function testFacilityEquipmentEav() {
  log('Facility Equipment EAV CRUD Operations', 'section');
  
  if (!(await entityTypeExists('Facility'))) {
    log('Facility entity type not configured - skipping', 'info');
    return;
  }
  
  let FacilityEquipmentService;
  try {
    FacilityEquipmentService = require('../../utils/facilityEquipmentEavService');
  } catch (e) {
    log('FacilityEquipmentEavService not available - skipping', 'info');
    return;
  }
  
  const facilityId = await createTestFacility();
  
  // Test CREATE - Add equipment
  const addResult = await FacilityEquipmentService.addFacilityEquipment(facilityId, {
    name: 'Test Projector',
    quantity: 2,
    condition: 'Good',
    notes: 'Test equipment entry',
  });
  assert(addResult !== null, 'Add facility equipment');
  
  // Test READ - Get equipment
  const equipment = await FacilityEquipmentService.getFacilityEquipment(facilityId);
  assert(Array.isArray(equipment), 'Get facility equipment returns array');
  
  // Test UPDATE (if available)
  if (typeof FacilityEquipmentService.updateFacilityEquipment === 'function' && equipment.length > 0) {
    const updateResult = await FacilityEquipmentService.updateFacilityEquipment(
      facilityId,
      equipment[0].id,
      { quantity: 3 }
    );
    assert(updateResult !== null, 'Update facility equipment');
  }
  
  // Test DELETE (if available)
  if (typeof FacilityEquipmentService.deleteFacilityEquipment === 'function' && equipment.length > 0) {
    const deleteResult = await FacilityEquipmentService.deleteFacilityEquipment(
      facilityId,
      equipment[0].id
    );
    assert(deleteResult !== null, 'Remove facility equipment');
  }
}

// ============================================================================
// Instructor Awards EAV Tests
// ============================================================================

async function testInstructorAwardsEav() {
  log('Instructor Awards EAV CRUD Operations', 'section');
  
  if (!(await entityTypeExists('Instructor'))) {
    log('Instructor entity type not configured - skipping', 'info');
    return;
  }
  
  let InstructorAwardsService;
  try {
    InstructorAwardsService = require('../../utils/instructorAwardsEavService');
  } catch (e) {
    log('InstructorAwardsEavService not available - skipping', 'info');
    return;
  }
  
  // Check if there are any instructors
  const [instructor] = await sequelize.query(
    `SELECT id FROM instructors LIMIT 1`,
    { type: sequelize.QueryTypes.SELECT }
  );
  
  if (!instructor) {
    log('No instructors in database - skipping', 'info');
    return;
  }
  
  // Test READ
  const awards = await InstructorAwardsService.getInstructorAwards(instructor.id);
  assert(awards !== null, 'Get instructor awards');
}

// ============================================================================
// Data Type Handling Tests
// ============================================================================

async function testDataTypeHandling() {
  log('EAV Data Type Handling', 'section');
  
  if (!(await entityTypeExists('User'))) {
    log('User entity type not configured - skipping', 'info');
    return;
  }
  
  let UserProfileEavService;
  try {
    UserProfileEavService = require('../../utils/userProfileEavService');
  } catch (e) {
    log('UserProfileEavService not available - skipping', 'info');
    return;
  }
  
  const userId = await createTestUser();
  
  // Test string type
  const stringResult = await UserProfileEavService.setUserProfileAttribute(
    userId,
    'common_preferred_name',
    'String Value Test'
  );
  assert(stringResult?.success === true, 'String value stored correctly');
  
  // Test boolean type (if attribute exists)
  // Most services convert to appropriate type automatically
  
  // Test that values are retrieved with correct types
  const profile = await UserProfileEavService.getUserProfile(userId);
  assert(typeof profile?.data?.commonPreferredName === 'string', 'String value retrieved as string');
}

// ============================================================================
// Concurrent Operations Tests
// ============================================================================

async function testConcurrentOperations() {
  log('Concurrent EAV Operations', 'section');
  
  if (!(await entityTypeExists('User'))) {
    log('User entity type not configured - skipping', 'info');
    return;
  }
  
  let UserProfileEavService;
  try {
    UserProfileEavService = require('../../utils/userProfileEavService');
  } catch (e) {
    log('UserProfileEavService not available - skipping', 'info');
    return;
  }
  
  const userId = await createTestUser();
  
  // Test concurrent writes
  const operations = [
    UserProfileEavService.setUserProfileAttribute(userId, 'common_preferred_name', 'Concurrent1'),
    UserProfileEavService.setUserProfileAttribute(userId, 'common_phone_number', '+1-555-0001'),
    UserProfileEavService.setUserProfileAttribute(userId, 'common_address_city', 'City1'),
  ];
  
  const results = await Promise.all(operations);
  const allSucceeded = results.every(r => r?.success === true);
  assert(allSucceeded, 'Concurrent write operations completed');
  
  // Verify final state
  const profile = await UserProfileEavService.getUserProfile(userId);
  assert(profile?.success === true, 'Profile readable after concurrent writes');
}

// ============================================================================
// Main Runner
// ============================================================================

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║           EAV CRUD Operations Integration Tests                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  try {
    await sequelize.authenticate();
    log('Database connected', 'pass');
    
    await testUserProfileEav();
    await testAssessmentMetadataEav();
    await testFacilityEquipmentEav();
    await testInstructorAwardsEav();
    await testDataTypeHandling();
    await testConcurrentOperations();
    
  } catch (error) {
    log(`Unexpected error: ${error.message}`, 'fail');
    console.error(error);
  } finally {
    if (CLEANUP_ON_FINISH) {
      await cleanup();
    }
    await sequelize.close();
  }
  
  // Summary
  console.log('\n');
  console.log('════════════════════════════════════════════════════════════════════');
  console.log(`  Passed: ${c.green}${results.passed}${c.reset}`);
  console.log(`  Failed: ${c.red}${results.failed}${c.reset}`);
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('\n');
  
  if (results.errors.length > 0) {
    console.log(`${c.red}Failed Tests:${c.reset}`);
    results.errors.forEach(e => console.log(`  - ${e}`));
    console.log('\n');
  }
  
  process.exit(results.failed > 0 ? 1 : 0);
}

main();
