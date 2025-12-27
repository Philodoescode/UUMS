/**
 * Integration Tests: Assessment Metadata EAV
 * 
 * These tests validate:
 * 1. EAV schema is set up correctly for assessments
 * 2. Metadata CRUD operations work correctly
 * 3. Bulk metadata operations work
 * 4. Data type handling is correct
 * 5. Available attribute definitions can be queried
 * 
 * Run with: node tests/integration/assessment-metadata-eav.test.js
 * 
 * Prerequisites:
 * - Database must be running
 * - EAV tables must exist
 * - Run setup script first: node scripts/setup-assessment-metadata-eav.js
 */

const { sequelize } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

// Import the service
const assessmentMetadataService = require('../../utils/assessmentMetadataEavService');

// Test data
const TEST_COURSE_ID = uuidv4();
const TEST_ASSESSMENT_ID = uuidv4();
const TEST_ASSESSMENT_DATA = {
  id: TEST_ASSESSMENT_ID,
  courseId: TEST_COURSE_ID,
  title: 'Test Quiz: Integration Testing',
  description: 'A quiz for testing EAV metadata',
  accessCode: 'TEST123',
  timeLimit: 60,
  attemptsAllowed: 2,
  isActive: true,
  type: 'QUIZ',
  latePolicy: 'BLOCK_LATE',
  latePenalty: 0,
  questions: JSON.stringify([
    { type: 'multiple_choice', text: 'Test question', options: ['A', 'B', 'C'], correctAnswer: 0 }
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
      `DELETE FROM attribute_values WHERE "entityId" = :assessmentId`,
      { replacements: { assessmentId: TEST_ASSESSMENT_ID } }
    );

    // Remove test assessment
    await sequelize.query(
      `DELETE FROM assessments WHERE id = :id`,
      { replacements: { id: TEST_ASSESSMENT_ID } }
    );

    // Remove test course (if created)
    await sequelize.query(
      `DELETE FROM courses WHERE id = :id`,
      { replacements: { id: TEST_COURSE_ID } }
    );

    log('Cleanup completed');
  } catch (error) {
    log(`Cleanup error: ${error.message}`, 'fail');
  }
}

async function setupTestData() {
  log('Setting up test data...', 'section');
  
  try {
    // Check if course exists (required for foreign key)
    const [existingCourse] = await sequelize.query(
      `SELECT id FROM courses WHERE id = :id`,
      { replacements: { id: TEST_COURSE_ID }, type: sequelize.QueryTypes.SELECT }
    );

    if (!existingCourse) {
      // Get a department for the course (required foreign key)
      const [dept] = await sequelize.query(
        `SELECT id FROM departments LIMIT 1`,
        { type: sequelize.QueryTypes.SELECT }
      );
      
      if (!dept) {
        log('No departments found - creating test department');
        const deptId = uuidv4();
        await sequelize.query(
          `INSERT INTO departments (id, name, code, "isActive", "createdAt", "updatedAt")
           VALUES (:id, 'Test Department', 'TEST', true, NOW(), NOW())`,
          { replacements: { id: deptId } }
        );
        dept = { id: deptId };
      }
      
      // Create a minimal test course (includes all required columns)
      await sequelize.query(
        `INSERT INTO courses (id, "courseCode", name, description, credits, "departmentId", semester, year, capacity, "isActive", "createdAt", "updatedAt")
         VALUES (:id, 'TEST101', 'Test Course', 'A test course', 3, :deptId, 'Fall', 2025, 30, true, NOW(), NOW())`,
        { replacements: { id: TEST_COURSE_ID, deptId: dept.id } }
      );
      log('Test course created');
    }

    // Check if assessment exists
    const [existingAssessment] = await sequelize.query(
      `SELECT id FROM assessments WHERE id = :id`,
      { replacements: { id: TEST_ASSESSMENT_ID }, type: sequelize.QueryTypes.SELECT }
    );

    if (!existingAssessment) {
      await sequelize.query(
        `INSERT INTO assessments (id, "courseId", title, description, "accessCode", "timeLimit", 
         "attemptsAllowed", "isActive", type, "latePolicy", "latePenalty", questions, "createdAt", "updatedAt")
         VALUES (:id, :courseId, :title, :description, :accessCode, :timeLimit, 
                 :attemptsAllowed, :isActive, :type, :latePolicy, :latePenalty, :questions, NOW(), NOW())`,
        { replacements: TEST_ASSESSMENT_DATA }
      );
      log('Test assessment created');
    } else {
      log('Test assessment already exists');
    }

    return true;
  } catch (error) {
    log(`Setup error: ${error.message}`, 'fail');
    console.error(error);
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
    `SELECT id, name FROM entity_types WHERE name = 'Assessment' AND "deletedAt" IS NULL`,
    { type: sequelize.QueryTypes.SELECT }
  );
  assert(!!entityType, 'Assessment entity type exists');

  if (!entityType) {
    log('Skipping attribute tests - entity type not found');
    return;
  }

  // Test key attributes exist
  const keyAttrs = [
    'grading_rubric',
    'difficulty_level',
    'estimated_duration',
    'proctoring_required',
    'calculator_allowed',
    'passing_score',
  ];
  
  for (const attrName of keyAttrs) {
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

  // Test available attributes query
  const availableAttrs = await assessmentMetadataService.getAvailableMetadataAttributes();
  assert(Array.isArray(availableAttrs), 'Available attributes returns array');
  assert(availableAttrs.length >= 10, 'Multiple attributes available');
}

// ============================================================================
// Test Suite: Single Metadata Operations
// ============================================================================

async function testSingleMetadataOperations() {
  log('Single Metadata Operations', 'section');

  // Test set string metadata
  try {
    const result = await assessmentMetadataService.setAssessmentMetadata(
      TEST_ASSESSMENT_ID,
      'difficulty_level',
      'Medium'
    );
    assert(result.action === 'created', 'Set string metadata (create)');
    assert(result.value === 'Medium', 'String value set correctly');
  } catch (error) {
    assert(false, `Set string metadata: ${error.message}`);
  }

  // Test update string metadata
  try {
    const result = await assessmentMetadataService.setAssessmentMetadata(
      TEST_ASSESSMENT_ID,
      'difficulty_level',
      'Hard'
    );
    assert(result.action === 'updated', 'Set string metadata (update)');
    assert(result.value === 'Hard', 'String value updated correctly');
  } catch (error) {
    assert(false, `Update string metadata: ${error.message}`);
  }

  // Test set integer metadata
  try {
    const result = await assessmentMetadataService.setAssessmentMetadata(
      TEST_ASSESSMENT_ID,
      'estimated_duration',
      45
    );
    assert(result.action === 'created', 'Set integer metadata');
  } catch (error) {
    assert(false, `Set integer metadata: ${error.message}`);
  }

  // Test set boolean metadata
  try {
    const result = await assessmentMetadataService.setAssessmentMetadata(
      TEST_ASSESSMENT_ID,
      'proctoring_required',
      true
    );
    assert(result.action === 'created', 'Set boolean metadata');
  } catch (error) {
    assert(false, `Set boolean metadata: ${error.message}`);
  }

  // Test set decimal metadata
  try {
    const result = await assessmentMetadataService.setAssessmentMetadata(
      TEST_ASSESSMENT_ID,
      'passing_score',
      70.5
    );
    assert(result.action === 'created', 'Set decimal metadata');
  } catch (error) {
    assert(false, `Set decimal metadata: ${error.message}`);
  }

  // Test set text metadata
  try {
    const result = await assessmentMetadataService.setAssessmentMetadata(
      TEST_ASSESSMENT_ID,
      'grading_rubric',
      'Question 1: 10 points\nQuestion 2: 20 points\nTotal: 30 points'
    );
    assert(result.action === 'created', 'Set text metadata');
  } catch (error) {
    assert(false, `Set text metadata: ${error.message}`);
  }

  // Test set JSON metadata
  try {
    const result = await assessmentMetadataService.setAssessmentMetadata(
      TEST_ASSESSMENT_ID,
      'learning_objectives',
      ['Understand EAV pattern', 'Apply integration testing', 'Validate data migrations']
    );
    assert(result.action === 'created', 'Set JSON metadata');
  } catch (error) {
    assert(false, `Set JSON metadata: ${error.message}`);
  }
}

// ============================================================================
// Test Suite: Read Metadata
// ============================================================================

async function testReadMetadata() {
  log('Read Metadata Operations', 'section');

  // Test get all metadata
  const metadata = await assessmentMetadataService.getAssessmentMetadata(TEST_ASSESSMENT_ID);
  
  assert(typeof metadata === 'object', 'Get metadata returns object');
  assert(metadata.difficultyLevel === 'Hard', 'String metadata reads correctly');
  assert(metadata.estimatedDuration === 45, 'Integer metadata reads correctly');
  assert(metadata.proctoringRequired === true, 'Boolean metadata reads correctly');
  assert(Math.abs(metadata.passingScore - 70.5) < 0.01, 'Decimal metadata reads correctly');
  assert(typeof metadata.gradingRubric === 'string', 'Text metadata reads correctly');
  assert(Array.isArray(metadata.learningObjectives), 'JSON metadata reads correctly');
  assert(metadata.learningObjectives.length === 3, 'JSON array length correct');

  // Test get metadata with details
  const detailedMetadata = await assessmentMetadataService.getAssessmentMetadataWithDetails(TEST_ASSESSMENT_ID);
  
  assert(Array.isArray(detailedMetadata), 'Detailed metadata returns array');
  assert(detailedMetadata.length >= 6, 'All set metadata returned');
  
  const difficultyDetail = detailedMetadata.find(m => m.name === 'difficulty_level');
  assert(!!difficultyDetail, 'Difficulty level found in detailed response');
  assert(difficultyDetail && difficultyDetail.displayName === 'Difficulty Level', 'Display name included');
  assert(difficultyDetail && difficultyDetail.valueType === 'string', 'Value type included');

  // Test has metadata
  const hasMetadata = await assessmentMetadataService.hasAssessmentMetadata(TEST_ASSESSMENT_ID);
  assert(hasMetadata === true, 'Has metadata returns true for assessment with metadata');

  // Test has metadata for non-existent assessment
  const noMetadata = await assessmentMetadataService.hasAssessmentMetadata(uuidv4());
  assert(noMetadata === false, 'Has metadata returns false for assessment without metadata');
}

// ============================================================================
// Test Suite: Bulk Metadata Operations
// ============================================================================

async function testBulkMetadataOperations() {
  log('Bulk Metadata Operations', 'section');

  // Clean slate for bulk test
  await sequelize.query(
    `DELETE FROM attribute_values WHERE "entityId" = :assessmentId`,
    { replacements: { assessmentId: TEST_ASSESSMENT_ID } }
  );

  // Test bulk set
  const bulkData = {
    difficulty_level: 'Expert',
    estimated_duration: 90,
    proctoring_required: true,
    calculator_allowed: false,
    passing_score: 80,
    instructor_notes: 'This is a challenging assessment',
    shuffle_questions: true,
    shuffle_options: true,
  };

  try {
    const results = await assessmentMetadataService.bulkSetAssessmentMetadata(
      TEST_ASSESSMENT_ID,
      bulkData
    );
    
    const createdCount = Object.values(results).filter(r => r.action === 'created').length;
    assert(createdCount === 8, 'Bulk set creates all attributes');
  } catch (error) {
    assert(false, `Bulk set: ${error.message}`);
  }

  // Verify bulk set
  const metadata = await assessmentMetadataService.getAssessmentMetadata(TEST_ASSESSMENT_ID);
  assert(metadata.difficultyLevel === 'Expert', 'Bulk set value correct');
  assert(metadata.shuffleQuestions === true, 'Bulk set boolean correct');

  // Test bulk update
  const updateData = {
    difficulty_level: 'Hard',
    estimated_duration: 75,
  };

  try {
    const results = await assessmentMetadataService.bulkSetAssessmentMetadata(
      TEST_ASSESSMENT_ID,
      updateData
    );
    
    const updatedCount = Object.values(results).filter(r => r.action === 'updated').length;
    assert(updatedCount === 2, 'Bulk update updates existing attributes');
  } catch (error) {
    assert(false, `Bulk update: ${error.message}`);
  }

  // Verify bulk update
  const updatedMetadata = await assessmentMetadataService.getAssessmentMetadata(TEST_ASSESSMENT_ID);
  assert(updatedMetadata.difficultyLevel === 'Hard', 'Bulk update value correct');
  assert(updatedMetadata.estimatedDuration === 75, 'Bulk update integer correct');
  
  // Verify other values unchanged
  assert(updatedMetadata.proctoringRequired === true, 'Unmodified value preserved');
}

// ============================================================================
// Test Suite: Delete Metadata
// ============================================================================

async function testDeleteMetadata() {
  log('Delete Metadata Operations', 'section');

  // Test delete
  const deleted = await assessmentMetadataService.deleteAssessmentMetadata(
    TEST_ASSESSMENT_ID,
    'instructor_notes'
  );
  assert(deleted === true, 'Delete metadata returns true');

  // Verify deletion
  const metadata = await assessmentMetadataService.getAssessmentMetadata(TEST_ASSESSMENT_ID);
  assert(metadata.instructorNotes === undefined, 'Deleted metadata not in response');

  // Test delete non-existent
  const deletedAgain = await assessmentMetadataService.deleteAssessmentMetadata(
    TEST_ASSESSMENT_ID,
    'instructor_notes'
  );
  assert(deletedAgain === false, 'Delete non-existent returns false');
}

// ============================================================================
// Test Suite: Error Handling
// ============================================================================

async function testErrorHandling() {
  log('Error Handling', 'section');

  // Test invalid attribute name
  try {
    await assessmentMetadataService.setAssessmentMetadata(
      TEST_ASSESSMENT_ID,
      'nonexistent_attribute',
      'value'
    );
    assert(false, 'Invalid attribute should throw error');
  } catch (error) {
    assert(error.message.includes('not found'), 'Invalid attribute throws correct error');
  }

  // Test invalid entity (no entity type set up)
  const fakeAssessmentId = uuidv4();
  const metadata = await assessmentMetadataService.getAssessmentMetadata(fakeAssessmentId);
  assert(Object.keys(metadata).length === 0, 'Non-existent assessment returns empty object');
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('Assessment Metadata EAV Integration Tests');
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
    await testSingleMetadataOperations();
    await testReadMetadata();
    await testBulkMetadataOperations();
    await testDeleteMetadata();
    await testErrorHandling();

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
