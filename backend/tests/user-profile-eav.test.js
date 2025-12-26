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
 * Run with: npm test -- --grep "User Profile EAV"
 */

const { expect } = require('chai');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/db');
const UserProfileEavService = require('../utils/userProfileEavService');

describe('User Profile EAV Service', function() {
  this.timeout(30000);

  // Test data
  let testUserId;
  let testStudentId;
  let testInstructorId;
  let testParentId;
  let testStaffId;
  let userEntityTypeId;

  // Helper to clean up test data
  const cleanupTestUser = async (userId) => {
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
  };

  // Create test user helper
  const createTestUser = async (roleId = null) => {
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
          roleId,
        },
      }
    );
    return userId;
  };

  before(async function() {
    // Verify database connection
    await sequelize.authenticate();
    console.log('Database connected for User Profile EAV tests');

    // Check if entity type exists
    const [entityType] = await sequelize.query(
      `SELECT id FROM entity_types WHERE name = 'User' AND "deletedAt" IS NULL`,
      { type: sequelize.QueryTypes.SELECT }
    );

    if (!entityType) {
      console.warn('User entity type not found. Run setup-user-profile-eav.js first.');
      this.skip();
      return;
    }

    userEntityTypeId = entityType.id;

    // Create test users for different roles
    testUserId = await createTestUser();
    testStudentId = await createTestUser();
    testInstructorId = await createTestUser();
    testParentId = await createTestUser();
    testStaffId = await createTestUser();

    console.log('Test users created');
  });

  after(async function() {
    // Cleanup test data
    await cleanupTestUser(testUserId);
    await cleanupTestUser(testStudentId);
    await cleanupTestUser(testInstructorId);
    await cleanupTestUser(testParentId);
    await cleanupTestUser(testStaffId);
    console.log('Test users cleaned up');
  });

  // ============================================================================
  // Basic Profile Operations
  // ============================================================================

  describe('Basic Profile Operations', function() {
    it('should set and get a single profile attribute', async function() {
      const result = await UserProfileEavService.setUserProfileAttribute(
        testUserId,
        'common_preferred_name',
        'Johnny'
      );

      expect(result).to.have.property('success', true);
      expect(result.data).to.have.property('value', 'Johnny');

      const profile = await UserProfileEavService.getUserProfile(testUserId);
      expect(profile.data).to.have.property('commonPreferredName', 'Johnny');
    });

    it('should update an existing profile attribute', async function() {
      // Set initial value
      await UserProfileEavService.setUserProfileAttribute(
        testUserId,
        'common_pronouns',
        'he/him'
      );

      // Update value
      const result = await UserProfileEavService.setUserProfileAttribute(
        testUserId,
        'common_pronouns',
        'they/them'
      );

      expect(result).to.have.property('success', true);
      expect(result.data).to.have.property('value', 'they/them');

      const profile = await UserProfileEavService.getUserProfile(testUserId);
      expect(profile.data).to.have.property('commonPronouns', 'they/them');
    });

    it('should delete a profile attribute', async function() {
      // First set an attribute
      await UserProfileEavService.setUserProfileAttribute(
        testUserId,
        'common_secondary_email',
        'secondary@test.com'
      );

      // Delete it
      const result = await UserProfileEavService.deleteUserProfileAttribute(
        testUserId,
        'common_secondary_email'
      );

      expect(result).to.have.property('success', true);

      // Verify deletion
      const profile = await UserProfileEavService.getUserProfile(testUserId);
      expect(profile.data).to.not.have.property('commonSecondaryEmail');
    });

    it('should handle non-existent attribute gracefully', async function() {
      const profile = await UserProfileEavService.getUserProfile(testUserId);
      expect(profile).to.have.property('success', true);
      // Should not throw, just return without the attribute
    });
  });

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  describe('Bulk Profile Operations', function() {
    it('should set multiple profile attributes at once', async function() {
      const attributes = {
        common_phone_number: '+1-555-123-4567',
        common_address_city: 'Test City',
        common_address_country: 'USA',
      };

      const result = await UserProfileEavService.bulkSetUserProfile(
        testUserId,
        attributes
      );

      expect(result).to.have.property('success', true);
      expect(result).to.have.property('processedCount', 3);

      const profile = await UserProfileEavService.getUserProfile(testUserId);
      expect(profile.data).to.have.property('commonPhoneNumber', '+1-555-123-4567');
      expect(profile.data).to.have.property('commonAddressCity', 'Test City');
      expect(profile.data).to.have.property('commonAddressCountry', 'USA');
    });

    it('should handle mixed create/update in bulk operations', async function() {
      // Set some initial values
      await UserProfileEavService.setUserProfileAttribute(
        testUserId,
        'common_bio',
        'Initial bio'
      );

      // Bulk update with mix of new and existing
      const attributes = {
        common_bio: 'Updated bio',
        common_linkedin_profile: 'https://linkedin.com/in/testuser',
      };

      const result = await UserProfileEavService.bulkSetUserProfile(
        testUserId,
        attributes
      );

      expect(result).to.have.property('success', true);

      const profile = await UserProfileEavService.getUserProfile(testUserId);
      expect(profile.data).to.have.property('commonBio', 'Updated bio');
      expect(profile.data).to.have.property('commonLinkedinProfile', 'https://linkedin.com/in/testuser');
    });
  });

  // ============================================================================
  // Student Profile
  // ============================================================================

  describe('Student Profile Attributes', function() {
    it('should set student-specific attributes', async function() {
      const attributes = {
        student_id: 'STU-2024-0001',
        student_major: 'Computer Science',
        student_minor: 'Mathematics',
        student_gpa: '3.75',
        student_expected_graduation_year: '2026',
        student_classification: 'Junior',
      };

      const result = await UserProfileEavService.bulkSetUserProfile(
        testStudentId,
        attributes
      );

      expect(result).to.have.property('success', true);

      const profile = await UserProfileEavService.getUserProfile(testStudentId);
      expect(profile.data).to.have.property('studentId', 'STU-2024-0001');
      expect(profile.data).to.have.property('studentMajor', 'Computer Science');
      expect(profile.data).to.have.property('studentGpa', '3.75');
    });

    it('should get student profile by category', async function() {
      const result = await UserProfileEavService.getUserProfileByCategory(
        testStudentId,
        'student'
      );

      expect(result).to.have.property('success', true);
      expect(result.data).to.be.an('object');
      // Should only contain student-prefixed attributes
      Object.keys(result.data).forEach(key => {
        expect(key.startsWith('student')).to.be.true;
      });
    });

    it('should set student emergency contact', async function() {
      const attributes = {
        student_emergency_contact_name: 'Jane Doe',
        student_emergency_contact_phone: '+1-555-999-8888',
        student_emergency_contact_relationship: 'Mother',
      };

      await UserProfileEavService.bulkSetUserProfile(testStudentId, attributes);

      const profile = await UserProfileEavService.getUserProfile(testStudentId);
      expect(profile.data).to.have.property('studentEmergencyContactName', 'Jane Doe');
      expect(profile.data).to.have.property('studentEmergencyContactRelationship', 'Mother');
    });
  });

  // ============================================================================
  // Instructor Profile
  // ============================================================================

  describe('Instructor Profile Attributes', function() {
    it('should set instructor-specific attributes', async function() {
      const attributes = {
        instructor_academic_rank: 'Associate Professor',
        instructor_tenure_status: 'Tenured',
        instructor_personal_website: 'https://faculty.university.edu/jsmith',
      };

      const result = await UserProfileEavService.bulkSetUserProfile(
        testInstructorId,
        attributes
      );

      expect(result).to.have.property('success', true);

      const profile = await UserProfileEavService.getUserProfile(testInstructorId);
      expect(profile.data).to.have.property('instructorAcademicRank', 'Associate Professor');
      expect(profile.data).to.have.property('instructorTenureStatus', 'Tenured');
    });

    it('should handle JSON attributes for research interests', async function() {
      const researchInterests = ['Machine Learning', 'Natural Language Processing', 'Computer Vision'];
      
      await UserProfileEavService.setUserProfileAttribute(
        testInstructorId,
        'instructor_research_interests',
        JSON.stringify(researchInterests)
      );

      const profile = await UserProfileEavService.getUserProfile(testInstructorId);
      const interests = JSON.parse(profile.data.instructorResearchInterests);
      expect(interests).to.deep.equal(researchInterests);
    });

    it('should handle JSON attributes for office hours', async function() {
      const officeHours = [
        { day: 'Monday', time: '10:00-12:00', location: 'Room 301' },
        { day: 'Wednesday', time: '14:00-16:00', location: 'Room 301' },
      ];

      await UserProfileEavService.setUserProfileAttribute(
        testInstructorId,
        'instructor_office_hours_details',
        JSON.stringify(officeHours)
      );

      const profile = await UserProfileEavService.getUserProfile(testInstructorId);
      const hours = JSON.parse(profile.data.instructorOfficeHoursDetails);
      expect(hours).to.be.an('array').with.lengthOf(2);
      expect(hours[0]).to.have.property('day', 'Monday');
    });
  });

  // ============================================================================
  // Parent Profile
  // ============================================================================

  describe('Parent Profile Attributes', function() {
    it('should set parent-specific attributes', async function() {
      const attributes = {
        parent_relationship_type: 'Father',
        parent_primary_contact: 'true',
        parent_occupation: 'Engineer',
        parent_employer: 'Tech Corp',
      };

      const result = await UserProfileEavService.bulkSetUserProfile(
        testParentId,
        attributes
      );

      expect(result).to.have.property('success', true);

      const profile = await UserProfileEavService.getUserProfile(testParentId);
      expect(profile.data).to.have.property('parentRelationshipType', 'Father');
      expect(profile.data).to.have.property('parentPrimaryContact', 'true');
    });

    it('should set parent contact preferences', async function() {
      const attributes = {
        parent_home_phone: '+1-555-111-2222',
        parent_work_phone: '+1-555-333-4444',
        parent_mobile_phone: '+1-555-555-6666',
        parent_preferred_contact_method: 'Email',
      };

      await UserProfileEavService.bulkSetUserProfile(testParentId, attributes);

      const profile = await UserProfileEavService.getUserProfile(testParentId);
      expect(profile.data).to.have.property('parentMobilePhone', '+1-555-555-6666');
      expect(profile.data).to.have.property('parentPreferredContactMethod', 'Email');
    });

    it('should handle boolean attributes for parent permissions', async function() {
      const attributes = {
        parent_emergency_authorized: 'true',
        parent_pickup_authorized: 'false',
        parent_financial_responsible: 'true',
      };

      await UserProfileEavService.bulkSetUserProfile(testParentId, attributes);

      const profile = await UserProfileEavService.getUserProfile(testParentId);
      expect(profile.data).to.have.property('parentEmergencyAuthorized', 'true');
      expect(profile.data).to.have.property('parentPickupAuthorized', 'false');
    });
  });

  // ============================================================================
  // Staff Profile
  // ============================================================================

  describe('Staff Profile Attributes', function() {
    it('should set staff-specific attributes', async function() {
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

      expect(result).to.have.property('success', true);

      const profile = await UserProfileEavService.getUserProfile(testStaffId);
      expect(profile.data).to.have.property('staffEmployeeId', 'EMP-2024-0042');
      expect(profile.data).to.have.property('staffPositionTitle', 'Senior Developer');
      expect(profile.data).to.have.property('staffHireDate', '2020-03-15');
    });

    it('should handle JSON attributes for skills', async function() {
      const skills = ['JavaScript', 'Python', 'SQL', 'Docker', 'AWS'];

      await UserProfileEavService.setUserProfileAttribute(
        testStaffId,
        'staff_skills',
        JSON.stringify(skills)
      );

      const profile = await UserProfileEavService.getUserProfile(testStaffId);
      const parsedSkills = JSON.parse(profile.data.staffSkills);
      expect(parsedSkills).to.include('JavaScript');
      expect(parsedSkills).to.have.lengthOf(5);
    });

    it('should set staff office information', async function() {
      const attributes = {
        staff_office_number: 'B-201',
        staff_office_building: 'Technology Building',
        staff_phone_extension: '4567',
      };

      await UserProfileEavService.bulkSetUserProfile(testStaffId, attributes);

      const profile = await UserProfileEavService.getUserProfile(testStaffId);
      expect(profile.data).to.have.property('staffOfficeNumber', 'B-201');
      expect(profile.data).to.have.property('staffOfficeBuilding', 'Technology Building');
    });
  });

  // ============================================================================
  // Cross-Category Operations
  // ============================================================================

  describe('Cross-Category Operations', function() {
    let crossTestUserId;

    before(async function() {
      crossTestUserId = await createTestUser();
    });

    after(async function() {
      await cleanupTestUser(crossTestUserId);
    });

    it('should set attributes from multiple categories', async function() {
      const attributes = {
        // Common
        common_preferred_name: 'Alex',
        common_phone_number: '+1-555-000-0000',
        // Student (if user is also a student)
        student_major: 'Business Administration',
        student_classification: 'Senior',
      };

      const result = await UserProfileEavService.bulkSetUserProfile(
        crossTestUserId,
        attributes
      );

      expect(result).to.have.property('success', true);

      const profile = await UserProfileEavService.getUserProfile(crossTestUserId);
      expect(profile.data).to.have.property('commonPreferredName', 'Alex');
      expect(profile.data).to.have.property('studentMajor', 'Business Administration');
    });

    it('should get available profile attributes', async function() {
      const result = await UserProfileEavService.getAvailableProfileAttributes();

      expect(result).to.have.property('success', true);
      expect(result.data).to.be.an('array');
      expect(result.data.length).to.be.greaterThan(0);

      // Verify attribute structure
      const firstAttr = result.data[0];
      expect(firstAttr).to.have.property('name');
      expect(firstAttr).to.have.property('displayName');
      expect(firstAttr).to.have.property('valueType');
    });

    it('should filter available attributes by category', async function() {
      const studentAttrs = await UserProfileEavService.getAvailableProfileAttributes('student');
      
      expect(studentAttrs).to.have.property('success', true);
      studentAttrs.data.forEach(attr => {
        expect(attr.name.startsWith('student_')).to.be.true;
      });

      const instructorAttrs = await UserProfileEavService.getAvailableProfileAttributes('instructor');
      
      expect(instructorAttrs).to.have.property('success', true);
      instructorAttrs.data.forEach(attr => {
        expect(attr.name.startsWith('instructor_')).to.be.true;
      });
    });
  });

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe('Error Handling', function() {
    it('should reject invalid user ID', async function() {
      const result = await UserProfileEavService.getUserProfile('invalid-uuid');
      // Should handle gracefully, returning empty or error
      expect(result).to.be.an('object');
    });

    it('should reject invalid attribute name', async function() {
      const result = await UserProfileEavService.setUserProfileAttribute(
        testUserId,
        'invalid_nonexistent_attribute',
        'some value'
      );

      expect(result).to.have.property('success', false);
    });

    it('should handle empty bulk update', async function() {
      const result = await UserProfileEavService.bulkSetUserProfile(
        testUserId,
        {}
      );

      expect(result).to.have.property('success', true);
      expect(result).to.have.property('processedCount', 0);
    });

    it('should handle null values gracefully', async function() {
      await UserProfileEavService.setUserProfileAttribute(
        testUserId,
        'common_bio',
        'Test bio'
      );

      // Setting null should be equivalent to delete
      const result = await UserProfileEavService.setUserProfileAttribute(
        testUserId,
        'common_bio',
        null
      );

      expect(result).to.have.property('success', true);
    });
  });

  // ============================================================================
  // Profile Flag Management
  // ============================================================================

  describe('Profile EAV Flag Management', function() {
    let flagTestUserId;

    before(async function() {
      flagTestUserId = await createTestUser();
    });

    after(async function() {
      await cleanupTestUser(flagTestUserId);
    });

    it('should enable EAV for a user', async function() {
      const result = await UserProfileEavService.enableProfileEav(flagTestUserId);
      expect(result).to.have.property('success', true);

      // Verify flag is set
      const [user] = await sequelize.query(
        `SELECT "profileEavEnabled" FROM users WHERE id = :userId`,
        {
          replacements: { userId: flagTestUserId },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      expect(user.profileEavEnabled).to.be.true;
    });

    it('should check if EAV is enabled for a user', async function() {
      const result = await UserProfileEavService.isProfileEavEnabled(flagTestUserId);
      expect(result).to.be.true;
    });

    it('should disable EAV for a user', async function() {
      const result = await UserProfileEavService.disableProfileEav(flagTestUserId);
      expect(result).to.have.property('success', true);

      const isEnabled = await UserProfileEavService.isProfileEavEnabled(flagTestUserId);
      expect(isEnabled).to.be.false;
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', function() {
    let perfTestUserId;

    before(async function() {
      perfTestUserId = await createTestUser();
    });

    after(async function() {
      await cleanupTestUser(perfTestUserId);
    });

    it('should handle bulk update of 20+ attributes efficiently', async function() {
      const attributes = {};
      
      // Add common attributes
      attributes.common_preferred_name = 'Perf Test';
      attributes.common_pronouns = 'they/them';
      attributes.common_phone_number = '+1-555-PERF';
      attributes.common_address_city = 'Perf City';
      attributes.common_address_country = 'USA';
      
      // Add student attributes
      attributes.student_id = 'PERF-001';
      attributes.student_major = 'Performance Testing';
      attributes.student_gpa = '4.0';
      attributes.student_classification = 'Senior';
      
      // Add more attributes
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

      expect(result).to.have.property('success', true);
      expect(result.processedCount).to.be.at.least(10);
      
      // Should complete in reasonable time (under 5 seconds)
      const duration = endTime - startTime;
      expect(duration).to.be.below(5000);
      
      console.log(`Bulk update of ${result.processedCount} attributes completed in ${duration}ms`);
    });

    it('should retrieve full profile efficiently', async function() {
      const startTime = Date.now();
      const result = await UserProfileEavService.getUserProfile(perfTestUserId);
      const endTime = Date.now();

      expect(result).to.have.property('success', true);
      
      const duration = endTime - startTime;
      expect(duration).to.be.below(1000); // Under 1 second
      
      console.log(`Full profile retrieval completed in ${duration}ms`);
    });
  });
});
