#!/usr/bin/env node

/**
 * Integration Tests: User Profile EAV Service
 * 
 * Tests the EAV (Entity-Attribute-Value) pattern implementation for
 * extensible user profile attributes supporting multiple roles:
 * - Common attributes (shared across all users)
 * - Student-specific attributes
 * - Instructor-specific attributes
 * - Parent-specific attributes
 * - Staff-specific attributes
 * 
 * Run with: pnpm run test:eav:user
 */

const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/db');
const UserProfileEavService = require('../utils/userProfileEavService');

// Test result tracking
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
    pass: `${c.green}[PASS]${c.reset}`,
    fail: `${c.red}[FAIL]${c.reset}`,
    section: `\n${c.cyan}>>>${c.reset}`,
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

// Test data
let testUserId;
let testStudentId;
let testInstructorId;
let testParentId;
let testStaffId;
let userEntityTypeId;
let defaultRoleId; // Role ID for test users

// Helper to clean up test data
async function cleanupTestUser(userId) {
  if (!userId) return;
  
  try {
    await sequelize.query(
      `DELETE FROM attribute_values 
       WHERE "entityId" = :userId AND "entityType" = 'User'`,
      { replacements: { userId } }
    );
    await sequelize.query(
      `DELETE FROM users WHERE id = :userId`,
      { replacements: { userId } }
    );
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Create test user helper
async function createTestUser() {
  if (!defaultRoleId) {
    throw new Error('defaultRoleId not set. Run initialization first.');
  }
  const userId = uuidv4();
  await sequelize.query(
    `INSERT INTO users (id, "fullName", email, password, "isActive", "roleId", "createdAt", "updatedAt")
     VALUES (:id, :fullName, :email, :password, true, :roleId, NOW(), NOW())`,
    {
      replacements: {
        id: userId,
        fullName: `Test User ${userId.slice(0, 8)}`,
        email: `test-${userId.slice(0, 8)}@example.com`,
        password: '$2b$10$test.hashed.password.here',
        roleId: defaultRoleId,
      },
    }
  );
  return userId;
}

// ============================================================================
// Test Suites
// ============================================================================

async function testBasicProfileOperations() {
  log('Basic Profile Operations', 'section');

  // Test set and get single attribute
  try {
    const result = await UserProfileEavService.setUserProfileAttribute(
      testUserId,
      'common_preferred_name',
      'Johnny'
    );

    assert(result.success === true, 'Set profile attribute returns success');
    assert(result.data && result.data.value === 'Johnny', 'Set attribute has correct value');

    const profile = await UserProfileEavService.getUserProfile(testUserId);
    assert(profile.data && profile.data.commonPreferredName === 'Johnny', 'Get profile returns set attribute');
  } catch (error) {
    assert(false, `Set and get attribute: ${error.message}`);
  }

  // Test update existing attribute
  try {
    await UserProfileEavService.setUserProfileAttribute(
      testUserId,
      'common_pronouns',
      'he/him'
    );

    const result = await UserProfileEavService.setUserProfileAttribute(
      testUserId,
      'common_pronouns',
      'they/them'
    );

    assert(result.success === true, 'Update attribute returns success');
    assert(result.data && result.data.value === 'they/them', 'Updated attribute has new value');

    const profile = await UserProfileEavService.getUserProfile(testUserId);
    assert(profile.data && profile.data.commonPronouns === 'they/them', 'Profile reflects updated value');
  } catch (error) {
    assert(false, `Update attribute: ${error.message}`);
  }

  // Test delete attribute
  try {
    await UserProfileEavService.setUserProfileAttribute(
      testUserId,
      'common_secondary_email',
      'secondary@test.com'
    );

    const result = await UserProfileEavService.deleteUserProfileAttribute(
      testUserId,
      'common_secondary_email'
    );

    assert(result.success === true, 'Delete attribute returns success');

    const profile = await UserProfileEavService.getUserProfile(testUserId);
    assert(!profile.data || !profile.data.commonSecondaryEmail, 'Deleted attribute not in profile');
  } catch (error) {
    assert(false, `Delete attribute: ${error.message}`);
  }

  // Test handle non-existent attribute gracefully
  try {
    const profile = await UserProfileEavService.getUserProfile(testUserId);
    assert(profile.success === true, 'Get profile with missing attributes succeeds');
  } catch (error) {
    assert(false, `Handle non-existent attribute: ${error.message}`);
  }
}

async function testBulkOperations() {
  log('Bulk Profile Operations', 'section');

  // Test set multiple attributes at once
  try {
    const attributes = {
      common_phone_number: '+1-555-123-4567',
      common_address_city: 'Test City',
      common_address_country: 'USA',
    };

    const result = await UserProfileEavService.bulkSetUserProfile(
      testUserId,
      attributes
    );

    assert(result.success === true, 'Bulk set returns success');
    assert(result.processedCount === 3, 'Bulk set processes all attributes');

    const profile = await UserProfileEavService.getUserProfile(testUserId);
    assert(profile.data && profile.data.commonPhoneNumber === '+1-555-123-4567', 'Bulk set attribute 1 correct');
    assert(profile.data && profile.data.commonAddressCity === 'Test City', 'Bulk set attribute 2 correct');
    assert(profile.data && profile.data.commonAddressCountry === 'USA', 'Bulk set attribute 3 correct');
  } catch (error) {
    assert(false, `Bulk set attributes: ${error.message}`);
  }

  // Test mixed create/update in bulk
  try {
    await UserProfileEavService.setUserProfileAttribute(
      testUserId,
      'common_bio',
      'Initial bio'
    );

    const attributes = {
      common_bio: 'Updated bio',
      common_linkedin_profile: 'https://linkedin.com/in/testuser',
    };

    const result = await UserProfileEavService.bulkSetUserProfile(
      testUserId,
      attributes
    );

    assert(result.success === true, 'Mixed bulk update returns success');

    const profile = await UserProfileEavService.getUserProfile(testUserId);
    assert(profile.data && profile.data.commonBio === 'Updated bio', 'Bulk update existing attribute works');
    assert(profile.data && profile.data.commonLinkedinProfile === 'https://linkedin.com/in/testuser', 'Bulk create new attribute works');
  } catch (error) {
    assert(false, `Mixed bulk update: ${error.message}`);
  }
}

async function testStudentProfile() {
  log('Student Profile Attributes', 'section');

  // Test set student-specific attributes
  try {
    const attributes = {
      student_id: 'STU-2024-0001',
      student_major: 'Computer Science',
      student_minor: 'Mathematics',
      student_gpa: 3.75,
      student_expected_graduation_year: '2026',
      student_classification: 'Junior',
    };

    const result = await UserProfileEavService.bulkSetUserProfile(
      testStudentId,
      attributes
    );

    assert(result.success === true, 'Set student attributes returns success');

    const profile = await UserProfileEavService.getUserProfile(testStudentId);
    assert(profile.data && profile.data.studentId === 'STU-2024-0001', 'Student ID attribute correct');
    assert(profile.data && profile.data.studentMajor === 'Computer Science', 'Student major attribute correct');
    assert(profile.data && profile.data.studentGpa === 3.75, 'Student GPA attribute correct');
  } catch (error) {
    assert(false, `Set student attributes: ${error.message}`);
  }

  // Test get profile by category
  try {
    const result = await UserProfileEavService.getUserProfileByCategory(
      testStudentId,
      'student'
    );

    assert(result.success === true, 'Get student profile by category succeeds');
    assert(typeof result.data === 'object', 'Category profile returns object');
    
    // Verify only student attributes returned
    const keys = Object.keys(result.data);
    const allStudent = keys.every(key => key.startsWith('student'));
    assert(allStudent || keys.length === 0, 'Category profile contains only student attributes');
  } catch (error) {
    assert(false, `Get profile by category: ${error.message}`);
  }

  // Test student emergency contact
  try {
    const attributes = {
      student_emergency_contact_name: 'Jane Doe',
      student_emergency_contact_phone: '+1-555-999-8888',
      student_emergency_contact_relationship: 'Mother',
    };

    await UserProfileEavService.bulkSetUserProfile(testStudentId, attributes);

    const profile = await UserProfileEavService.getUserProfile(testStudentId);
    assert(profile.data && profile.data.studentEmergencyContactName === 'Jane Doe', 'Emergency contact name correct');
    assert(profile.data && profile.data.studentEmergencyContactRelationship === 'Mother', 'Emergency contact relationship correct');
  } catch (error) {
    assert(false, `Set student emergency contact: ${error.message}`);
  }
}

async function testInstructorProfile() {
  log('Instructor Profile Attributes', 'section');

  // Test set instructor-specific attributes
  try {
    const attributes = {
      instructor_academic_rank: 'Associate Professor',
      instructor_tenure_status: 'Tenured',
      instructor_personal_website: 'https://faculty.university.edu/jsmith',
    };

    const result = await UserProfileEavService.bulkSetUserProfile(
      testInstructorId,
      attributes
    );

    assert(result.success === true, 'Set instructor attributes returns success');

    const profile = await UserProfileEavService.getUserProfile(testInstructorId);
    assert(profile.data && profile.data.instructorAcademicRank === 'Associate Professor', 'Instructor rank correct');
    assert(profile.data && profile.data.instructorTenureStatus === 'Tenured', 'Instructor tenure status correct');
  } catch (error) {
    assert(false, `Set instructor attributes: ${error.message}`);
  }

  // Test JSON attributes for research interests
  try {
    const researchInterests = ['Machine Learning', 'Natural Language Processing', 'Computer Vision'];
    
    await UserProfileEavService.setUserProfileAttribute(
      testInstructorId,
      'instructor_research_interests',
      researchInterests
    );

    const profile = await UserProfileEavService.getUserProfile(testInstructorId);
    const interests = profile.data.instructorResearchInterests;
    assert(JSON.stringify(interests) === JSON.stringify(researchInterests), 'Research interests JSON preserved');
  } catch (error) {
    assert(false, `JSON research interests: ${error.message}`);
  }

  // Test JSON attributes for office hours
  try {
    const officeHours = [
      { day: 'Monday', time: '10:00-12:00', location: 'Room 301' },
      { day: 'Wednesday', time: '14:00-16:00', location: 'Room 301' },
    ];

    await UserProfileEavService.setUserProfileAttribute(
      testInstructorId,
      'instructor_office_hours_details',
      officeHours
    );

    const profile = await UserProfileEavService.getUserProfile(testInstructorId);
    const hours = profile.data.instructorOfficeHoursDetails;
    assert(Array.isArray(hours) && hours.length === 2, 'Office hours JSON is array with 2 items');
    assert(hours[0].day === 'Monday', 'Office hours first item correct');
  } catch (error) {
    assert(false, `JSON office hours: ${error.message}`);
  }
}

async function testParentProfile() {
  log('Parent Profile Attributes', 'section');

  // Test set parent-specific attributes
  try {
    const attributes = {
      parent_relationship_type: 'Father',
      parent_primary_contact: true,
      parent_occupation: 'Engineer',
      parent_employer: 'Tech Corp',
    };

    const result = await UserProfileEavService.bulkSetUserProfile(
      testParentId,
      attributes
    );

    assert(result.success === true, 'Set parent attributes returns success');

    const profile = await UserProfileEavService.getUserProfile(testParentId);
    assert(profile.data && profile.data.parentRelationshipType === 'Father', 'Parent relationship type correct');
    assert(profile.data && profile.data.parentPrimaryContact === true, 'Parent primary contact correct');
  } catch (error) {
    assert(false, `Set parent attributes: ${error.message}`);
  }

  // Test parent contact preferences
  try {
    const attributes = {
      parent_home_phone: '+1-555-111-2222',
      parent_work_phone: '+1-555-333-4444',
      parent_mobile_phone: '+1-555-555-6666',
      parent_preferred_contact_method: 'Email',
    };

    await UserProfileEavService.bulkSetUserProfile(testParentId, attributes);

    const profile = await UserProfileEavService.getUserProfile(testParentId);
    assert(profile.data && profile.data.parentMobilePhone === '+1-555-555-6666', 'Parent mobile phone correct');
    assert(profile.data && profile.data.parentPreferredContactMethod === 'Email', 'Parent preferred contact correct');
  } catch (error) {
    assert(false, `Parent contact preferences: ${error.message}`);
  }

  // Test boolean attributes for permissions
  try {
    const attributes = {
      parent_emergency_authorized: true,
      parent_pickup_authorized: false,
      parent_financial_responsible: true,
    };

    await UserProfileEavService.bulkSetUserProfile(testParentId, attributes);

    const profile = await UserProfileEavService.getUserProfile(testParentId);
    assert(profile.data && profile.data.parentEmergencyAuthorized === true, 'Parent emergency authorized correct');
    assert(profile.data && profile.data.parentPickupAuthorized === false, 'Parent pickup authorized correct');
  } catch (error) {
    assert(false, `Parent boolean permissions: ${error.message}`);
  }
}

async function testStaffProfile() {
  log('Staff Profile Attributes', 'section');

  // Test set staff-specific attributes
  try {
    const attributes = {
      staff_employee_id: 'EMP-2024-0042',
      staff_position_title: 'Senior Developer',
      staff_department: 'IT Department',
      staff_hire_date: '2020-03-15',
    };

    const result = await UserProfileEavService.bulkSetUserProfile(
      testStaffId,
      attributes
    );

    assert(result.success === true, 'Set staff attributes returns success');

    const profile = await UserProfileEavService.getUserProfile(testStaffId);
    assert(profile.data && profile.data.staffEmployeeId === 'EMP-2024-0042', 'Staff employee ID correct');
    assert(profile.data && profile.data.staffPositionTitle === 'Senior Developer', 'Staff position title correct');
    assert(profile.data && profile.data.staffHireDate === '2020-03-15', 'Staff hire date correct');
  } catch (error) {
    assert(false, `Set staff attributes: ${error.message}`);
  }

  // Test JSON attributes for skills
  try {
    const skills = ['JavaScript', 'Python', 'SQL', 'Docker', 'AWS'];

    await UserProfileEavService.setUserProfileAttribute(
      testStaffId,
      'staff_skills',
      skills
    );

    const profile = await UserProfileEavService.getUserProfile(testStaffId);
    const parsedSkills = profile.data.staffSkills;
    assert(parsedSkills.includes('JavaScript'), 'Staff skills contains JavaScript');
    assert(parsedSkills.length === 5, 'Staff skills has 5 items');
  } catch (error) {
    assert(false, `JSON staff skills: ${error.message}`);
  }

  // Test staff office information
  try {
    const attributes = {
      staff_office_number: 'B-201',
      staff_office_building: 'Technology Building',
      staff_phone_extension: '4567',
    };

    await UserProfileEavService.bulkSetUserProfile(testStaffId, attributes);

    const profile = await UserProfileEavService.getUserProfile(testStaffId);
    assert(profile.data && profile.data.staffOfficeNumber === 'B-201', 'Staff office number correct');
    assert(profile.data && profile.data.staffOfficeBuilding === 'Technology Building', 'Staff office building correct');
  } catch (error) {
    assert(false, `Staff office information: ${error.message}`);
  }
}

async function testCrossCategoryOperations() {
  log('Cross-Category Operations', 'section');

  let crossTestUserId;

  try {
    crossTestUserId = await createTestUser();

    // Test set attributes from multiple categories
    const attributes = {
      common_preferred_name: 'Alex',
      common_phone_number: '+1-555-000-0000',
      student_major: 'Business Administration',
      student_classification: 'Senior',
    };

    const result = await UserProfileEavService.bulkSetUserProfile(
      crossTestUserId,
      attributes
    );

    assert(result.success === true, 'Cross-category bulk set returns success');

    const profile = await UserProfileEavService.getUserProfile(crossTestUserId);
    assert(profile.data && profile.data.commonPreferredName === 'Alex', 'Common attribute in cross-category');
    assert(profile.data && profile.data.studentMajor === 'Business Administration', 'Student attribute in cross-category');
  } catch (error) {
    assert(false, `Cross-category set: ${error.message}`);
  }

  // Test get available profile attributes
  try {
    const result = await UserProfileEavService.getAvailableProfileAttributes();

    assert(result.success === true, 'Get available attributes returns success');
    assert(Array.isArray(result.data), 'Available attributes is array');
    assert(result.data.length > 0, 'Available attributes not empty');

    if (result.data.length > 0) {
      const firstAttr = result.data[0];
      assert(firstAttr.name !== undefined, 'Attribute has name property');
      assert(firstAttr.valueType !== undefined, 'Attribute has valueType property');
    }
  } catch (error) {
    assert(false, `Get available attributes: ${error.message}`);
  }

  // Test filter available attributes by category
  try {
    const studentAttrs = await UserProfileEavService.getAvailableProfileAttributes('student');
    
    assert(studentAttrs.success === true, 'Get student attributes by category succeeds');
    
    if (studentAttrs.data.length > 0) {
      // Should include both common_ and student_ attributes
      const allValid = studentAttrs.data.every(attr => 
        attr.name.startsWith('student_') || attr.name.startsWith('common_')
      );
      assert(allValid, 'All filtered attributes start with student_ or common_');
    }
  } catch (error) {
    assert(false, `Filter attributes by category: ${error.message}`);
  }

  // Cleanup
  await cleanupTestUser(crossTestUserId);
}

async function testErrorHandling() {
  log('Error Handling', 'section');

  // Test reject invalid user ID (database will reject invalid UUID format)
  try {
    const result = await UserProfileEavService.getUserProfile('invalid-uuid');
    // If service handles gracefully without throwing, check for empty or error result
    assert(typeof result === 'object', 'Invalid UUID returns object');
  } catch (error) {
    // Database error for invalid UUID is also acceptable
    assert(error.message.includes('uuid') || error.message.includes('invalid'), 'Invalid UUID throws expected error');
  }

  // Test reject invalid attribute name
  try {
    const result = await UserProfileEavService.setUserProfileAttribute(
      testUserId,
      'invalid_nonexistent_attribute',
      'some value'
    );

    assert(result.success === false, 'Invalid attribute name rejected');
  } catch (error) {
    // This is also acceptable - error thrown for invalid attribute
    assert(true, 'Invalid attribute name throws error');
  }

  // Test handle empty bulk update
  try {
    const result = await UserProfileEavService.bulkSetUserProfile(
      testUserId,
      {}
    );

    assert(result.success === true, 'Empty bulk update returns success');
    assert(result.processedCount === 0, 'Empty bulk update processes 0 attributes');
  } catch (error) {
    assert(false, `Empty bulk update: ${error.message}`);
  }

  // Test handle null values gracefully
  try {
    await UserProfileEavService.setUserProfileAttribute(
      testUserId,
      'common_bio',
      'Test bio'
    );

    const result = await UserProfileEavService.setUserProfileAttribute(
      testUserId,
      'common_bio',
      null
    );

    assert(result.success === true, 'Null value handled gracefully');
  } catch (error) {
    assert(false, `Null value handling: ${error.message}`);
  }
}

async function testProfileFlagManagement() {
  log('Profile EAV Flag Management', 'section');

  let flagTestUserId;

  try {
    flagTestUserId = await createTestUser();

    // Test enable EAV for a user
    const enableResult = await UserProfileEavService.enableProfileEav(flagTestUserId);
    assert(enableResult.success === true, 'Enable EAV returns success');

    // Verify flag is set
    const [user] = await sequelize.query(
      `SELECT "profileEavEnabled" FROM users WHERE id = :userId`,
      {
        replacements: { userId: flagTestUserId },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    assert(user && user.profileEavEnabled === true, 'EAV flag is set in database');

    // Test check if EAV is enabled
    const isEnabled = await UserProfileEavService.isProfileEavEnabled(flagTestUserId);
    assert(isEnabled === true, 'isProfileEavEnabled returns true after enable');

    // Test disable EAV
    const disableResult = await UserProfileEavService.disableProfileEav(flagTestUserId);
    assert(disableResult.success === true, 'Disable EAV returns success');

    const isEnabledAfter = await UserProfileEavService.isProfileEavEnabled(flagTestUserId);
    assert(isEnabledAfter === false, 'isProfileEavEnabled returns false after disable');
  } catch (error) {
    assert(false, `EAV flag management: ${error.message}`);
  }

  // Cleanup
  await cleanupTestUser(flagTestUserId);
}

async function testPerformance() {
  log('Performance Tests', 'section');

  let perfTestUserId;

  try {
    perfTestUserId = await createTestUser();

    // Test bulk update of 20+ attributes
    const attributes = {};
    
    attributes.common_preferred_name = 'Perf Test';
    attributes.common_pronouns = 'they/them';
    attributes.common_phone_number = '+1-555-PERF';
    attributes.common_address_city = 'Perf City';
    attributes.common_address_country = 'USA';
    
    attributes.student_id = 'PERF-001';
    attributes.student_major = 'Performance Testing';
    attributes.student_gpa = '4.0';
    attributes.student_classification = 'Senior';
    
    attributes.common_bio = 'Performance test user';
    attributes.common_linkedin_profile = 'https://linkedin.com/perf';
    attributes.student_enrollment_status = 'Full-time';
    attributes.student_housing_status = 'On-campus';

    const startTime = Date.now();
    const result = await UserProfileEavService.bulkSetUserProfile(
      perfTestUserId,
      attributes
    );
    const endTime = Date.now();

    assert(result.success === true, 'Bulk update of many attributes succeeds');
    assert(result.processedCount >= 10, 'Bulk update processes 10+ attributes');
    
    const duration = endTime - startTime;
    assert(duration < 5000, `Bulk update completes under 5s (took ${duration}ms)`);
    
    log(`Bulk update of ${result.processedCount} attributes completed in ${duration}ms`, 'info');

    // Test retrieve full profile efficiently
    const startRetrieve = Date.now();
    const profileResult = await UserProfileEavService.getUserProfile(perfTestUserId);
    const endRetrieve = Date.now();

    assert(profileResult.success === true, 'Full profile retrieval succeeds');
    
    const retrieveDuration = endRetrieve - startRetrieve;
    assert(retrieveDuration < 1000, `Profile retrieval under 1s (took ${retrieveDuration}ms)`);
    
    log(`Full profile retrieval completed in ${retrieveDuration}ms`, 'info');
  } catch (error) {
    assert(false, `Performance test: ${error.message}`);
  }

  // Cleanup
  await cleanupTestUser(perfTestUserId);
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runTests() {
  console.log('\n');
  console.log('============================================================');
  console.log('   User Profile EAV Integration Tests');
  console.log('============================================================');
  
  try {
    // Setup
    await sequelize.authenticate();
    log('Database connection established', 'info');

    // Check if entity type exists
    const [entityType] = await sequelize.query(
      `SELECT id FROM entity_types WHERE name = 'User' AND "deletedAt" IS NULL`,
      { type: sequelize.QueryTypes.SELECT }
    );

    if (!entityType) {
      console.warn('\nUser entity type not found. Run setup-user-profile-eav.js first.');
      console.warn('Skipping all tests.\n');
      process.exit(1);
    }

    userEntityTypeId = entityType.id;

    // Get a role ID for test users (required foreign key)
    const [role] = await sequelize.query(
      `SELECT id FROM roles LIMIT 1`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    if (!role) {
      console.warn('\nNo roles found in database. Create at least one role first.');
      console.warn('Skipping all tests.\n');
      process.exit(1);
    }
    defaultRoleId = role.id;

    // Create test users
    testUserId = await createTestUser();
    testStudentId = await createTestUser();
    testInstructorId = await createTestUser();
    testParentId = await createTestUser();
    testStaffId = await createTestUser();
    log('Test users created', 'info');

    // Run test suites
    await testBasicProfileOperations();
    await testBulkOperations();
    await testStudentProfile();
    await testInstructorProfile();
    await testParentProfile();
    await testStaffProfile();
    await testCrossCategoryOperations();
    await testErrorHandling();
    await testProfileFlagManagement();
    await testPerformance();

  } catch (error) {
    console.error(`\nUnexpected error: ${error.message}`);
    console.error(error.stack);
  } finally {
    // Cleanup
    log('Cleaning up test data...', 'section');
    await cleanupTestUser(testUserId);
    await cleanupTestUser(testStudentId);
    await cleanupTestUser(testInstructorId);
    await cleanupTestUser(testParentId);
    await cleanupTestUser(testStaffId);
    log('Test users cleaned up', 'info');

    await sequelize.close();
  }

  // Print summary
  console.log('\n');
  console.log('============================================================');
  console.log('   Test Summary');
  console.log('============================================================');
  console.log(`  ${c.green}Passed:${c.reset}  ${results.passed}`);
  console.log(`  ${c.red}Failed:${c.reset}  ${results.failed}`);
  console.log(`  Total:   ${results.passed + results.failed}`);
  console.log('============================================================');

  if (results.errors.length > 0) {
    console.log(`\n${c.red}Failed Tests:${c.reset}`);
    results.errors.forEach(err => console.log(`  - ${err}`));
  }

  console.log('\n');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests();
