/**
 * Multi-Role and EAV Permissions Integration Tests
 * 
 * Tests the multi-role architecture and EAV-based dynamic permissions
 * as specified in the "Multi-Role" and "EAV for Dynamic Permissions" requirements.
 */

const { describe, it, before, after, beforeEach, afterEach } = require('mocha');
const { expect } = require('chai');
const { v4: uuidv4 } = require('uuid');
const {
  sequelize,
  User,
  Role,
  UserRole,
  EntityType,
  AttributeDefinition,
  AttributeValue,
  UserAttributeValue,
  RoleAttributeValue,
} = require('../../models');
const RoleEavService = require('../../utils/roleEavService');

describe('Multi-Role and EAV Permissions', function () {
  this.timeout(30000);

  let testUserId;
  let testRoleId1;
  let testRoleId2;
  let roleEntityTypeId;

  // Helper to clean up test data
  async function cleanupTestData() {
    if (testUserId) {
      await UserRole.destroy({ where: { userId: testUserId }, force: true });
      await UserAttributeValue.destroy({ where: { userId: testUserId }, force: true });
      await User.destroy({ where: { id: testUserId }, force: true });
    }
    if (testRoleId1) {
      await AttributeValue.destroy({ where: { entityId: testRoleId1 }, force: true });
      await RoleAttributeValue.destroy({ where: { roleId: testRoleId1 }, force: true });
      await UserRole.destroy({ where: { roleId: testRoleId1 }, force: true });
      await Role.destroy({ where: { id: testRoleId1 }, force: true });
    }
    if (testRoleId2) {
      await AttributeValue.destroy({ where: { entityId: testRoleId2 }, force: true });
      await RoleAttributeValue.destroy({ where: { roleId: testRoleId2 }, force: true });
      await UserRole.destroy({ where: { roleId: testRoleId2 }, force: true });
      await Role.destroy({ where: { id: testRoleId2 }, force: true });
    }
  }

  before(async function () {
    await sequelize.authenticate();
    
    // Get Role entity type ID
    const roleEntityType = await EntityType.findOne({ 
      where: { name: 'Role', deletedAt: null } 
    });
    if (roleEntityType) {
      roleEntityTypeId = roleEntityType.id;
    }
  });

  after(async function () {
    await cleanupTestData();
  });

  beforeEach(async function () {
    // Clear cache before each test
    RoleEavService.clearCache();
  });

  // ============================================================================
  // Multi-Role Tests
  // ============================================================================
  describe('Multi-Role Architecture', function () {
    
    it('should create a user without roleId column', async function () {
      testUserId = uuidv4();
      
      const user = await User.create({
        id: testUserId,
        fullName: 'Test Multi-Role User',
        email: `test-multirole-${Date.now()}@test.com`,
        password: 'test_password_hash',
        isActive: true,
      });

      expect(user).to.exist;
      expect(user.id).to.equal(testUserId);
      expect(user.roleId).to.be.undefined; // roleId should not exist
    });

    it('should assign multiple roles to a user via UserRole', async function () {
      // Create test roles
      testRoleId1 = uuidv4();
      testRoleId2 = uuidv4();

      await Role.create({ id: testRoleId1, name: `test-role-1-${Date.now()}` });
      await Role.create({ id: testRoleId2, name: `test-role-2-${Date.now()}` });

      // Assign both roles to user
      await UserRole.create({ userId: testUserId, roleId: testRoleId1 });
      await UserRole.create({ userId: testUserId, roleId: testRoleId2 });

      // Verify user has both roles
      const userWithRoles = await User.findByPk(testUserId, {
        include: [{ model: Role, as: 'roles', through: { attributes: [] } }],
      });

      expect(userWithRoles.roles).to.have.lengthOf(2);
      const roleIds = userWithRoles.roles.map(r => r.id);
      expect(roleIds).to.include(testRoleId1);
      expect(roleIds).to.include(testRoleId2);
    });

    it('should not allow duplicate role assignments', async function () {
      try {
        // Try to assign the same role again
        await UserRole.create({ userId: testUserId, roleId: testRoleId1 });
        expect.fail('Should have thrown a unique constraint error');
      } catch (error) {
        expect(error.name).to.match(/SequelizeUniqueConstraintError|SequelizeDatabaseError/);
      }
    });

    it('should remove a specific role from user', async function () {
      await UserRole.destroy({
        where: { userId: testUserId, roleId: testRoleId2 },
      });

      const userWithRoles = await User.findByPk(testUserId, {
        include: [{ model: Role, as: 'roles', through: { attributes: [] } }],
      });

      expect(userWithRoles.roles).to.have.lengthOf(1);
      expect(userWithRoles.roles[0].id).to.equal(testRoleId1);
    });

    it('should query users by role using UserRole join', async function () {
      // Re-add second role
      await UserRole.create({ userId: testUserId, roleId: testRoleId2 });

      // Query users with testRoleId1
      const usersWithRole1 = await User.findAll({
        include: [{
          model: Role,
          as: 'roles',
          through: { attributes: [] },
          where: { id: testRoleId1 },
        }],
      });

      expect(usersWithRole1.length).to.be.at.least(1);
      const foundUser = usersWithRole1.find(u => u.id === testUserId);
      expect(foundUser).to.exist;
    });
  });

  // ============================================================================
  // Role EAV Permission Tests
  // ============================================================================
  describe('EAV for Dynamic Permissions', function () {
    
    it('should have Role registered as EAV entity type', async function () {
      const roleEntityType = await EntityType.findOne({
        where: { name: 'Role', deletedAt: null },
      });

      expect(roleEntityType).to.exist;
      expect(roleEntityType.tableName).to.equal('roles');
    });

    it('should have permission attribute definitions for Role entity type', async function () {
      if (!roleEntityTypeId) {
        this.skip();
      }

      const definitions = await AttributeDefinition.findAll({
        where: { entityTypeId: roleEntityTypeId, deletedAt: null },
      });

      expect(definitions.length).to.be.at.least(1);
      
      const attrNames = definitions.map(d => d.name);
      expect(attrNames).to.include('can_create_users');
      expect(attrNames).to.include('can_manage_courses');
      expect(attrNames).to.include('can_view_grades');
    });

    it('should get role permissions via RoleEavService', async function () {
      // Use an existing role with seeded permissions
      const adminRole = await Role.findOne({ where: { name: 'admin' } });
      if (!adminRole) {
        this.skip();
      }

      const result = await RoleEavService.getRolePermissions(adminRole.id);
      
      expect(result.success).to.be.true;
      expect(result.data).to.exist;
      expect(result.data.can_create_users).to.be.true;
      expect(result.data.can_manage_courses).to.be.true;
    });

    it('should set role permission via RoleEavService', async function () {
      // Create a new test role for permission setting
      const testPermRoleId = uuidv4();
      await Role.create({ id: testPermRoleId, name: `test-perm-role-${Date.now()}` });

      // Set a permission
      const setResult = await RoleEavService.setRolePermission(
        testPermRoleId,
        'can_create_users',
        true
      );

      expect(setResult.success).to.be.true;

      // Verify it was set
      const getResult = await RoleEavService.getRolePermission(testPermRoleId, 'can_create_users');
      expect(getResult.success).to.be.true;
      expect(getResult.data.value).to.be.true;

      // Cleanup (both generic and entity-specific tables)
      await AttributeValue.destroy({ where: { entityId: testPermRoleId }, force: true });
      await RoleAttributeValue.destroy({ where: { roleId: testPermRoleId }, force: true });
      await Role.destroy({ where: { id: testPermRoleId }, force: true });
    });

    it('should check single role permission with hasPermission', async function () {
      const adminRole = await Role.findOne({ where: { name: 'admin' } });
      if (!adminRole) {
        this.skip();
      }

      const hasCreateUsers = await RoleEavService.hasPermission(adminRole.id, 'can_create_users');
      expect(hasCreateUsers).to.be.true;

      const studentRole = await Role.findOne({ where: { name: 'student' } });
      if (studentRole) {
        const studentHasCreateUsers = await RoleEavService.hasPermission(studentRole.id, 'can_create_users');
        expect(studentHasCreateUsers).to.be.false;
      }
    });

    it('should aggregate permissions across multiple roles', async function () {
      // Get admin and student roles
      const adminRole = await Role.findOne({ where: { name: 'admin' } });
      const studentRole = await Role.findOne({ where: { name: 'student' } });
      
      if (!adminRole || !studentRole) {
        this.skip();
      }

      const result = await RoleEavService.getAggregatedPermissions([
        adminRole.id,
        studentRole.id,
      ]);

      expect(result.success).to.be.true;
      // Aggregated should have admin's can_create_users (true)
      expect(result.data.can_create_users).to.be.true;
      // Aggregated should have student's can_view_grades (true)
      expect(result.data.can_view_grades).to.be.true;
    });

    it('should check user permissions across all roles', async function () {
      // Assign admin role to test user
      const adminRole = await Role.findOne({ where: { name: 'admin' } });
      if (!adminRole || !testUserId) {
        this.skip();
      }

      await UserRole.findOrCreate({
        where: { userId: testUserId, roleId: adminRole.id },
        defaults: { userId: testUserId, roleId: adminRole.id },
      });

      const hasPermission = await RoleEavService.userHasPermission(testUserId, 'can_create_users');
      expect(hasPermission).to.be.true;

      // Cleanup
      await UserRole.destroy({ where: { userId: testUserId, roleId: adminRole.id } });
    });
  });

  // ============================================================================
  // Migration Integrity Tests
  // ============================================================================
  describe('Migration Integrity', function () {
    
    it('should have user_roles table with correct structure', async function () {
      const [columns] = await sequelize.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'user_roles'
      `);

      const columnNames = columns.map(c => c.column_name);
      expect(columnNames).to.include('userId');
      expect(columnNames).to.include('roleId');
    });

    it('should NOT have roleId column in users table', async function () {
      const [columns] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'roleId'
      `);

      expect(columns).to.have.lengthOf(0);
    });

    it('should have permissionEavEnabled column in roles table', async function () {
      const [columns] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'roles' AND column_name = 'permissionEavEnabled'
      `);

      expect(columns).to.have.lengthOf(1);
    });

    it('should have entity_types entry for Role', async function () {
      const roleEntityType = await EntityType.findOne({
        where: { name: 'Role', deletedAt: null },
      });

      expect(roleEntityType).to.exist;
    });

    it('should have preserved existing role assignments in user_roles', async function () {
      // Check that existing users have roles in user_roles table
      const userRoleCount = await UserRole.count();
      expect(userRoleCount).to.be.at.least(1);
    });
  });

  // ============================================================================
  // Permission Resolution Tests
  // ============================================================================
  describe('Permission Resolution', function () {
    
    it('should return default value when no permission value is set', async function () {
      const newRoleId = uuidv4();
      await Role.create({ id: newRoleId, name: `fresh-role-${Date.now()}` });

      const result = await RoleEavService.getRolePermission(newRoleId, 'can_view_announcements');
      
      expect(result.success).to.be.true;
      // Default for can_view_announcements is 'true'
      expect(result.data.value).to.be.true;

      // Cleanup
      await Role.destroy({ where: { id: newRoleId }, force: true });
    });

    it('should use OR logic for boolean permissions across roles', async function () {
      const role1Id = uuidv4();
      const role2Id = uuidv4();

      await Role.create({ id: role1Id, name: `bool-test-role1-${Date.now()}` });
      await Role.create({ id: role2Id, name: `bool-test-role2-${Date.now()}` });

      // Set role1 to have permission, role2 to not have it
      await RoleEavService.setRolePermission(role1Id, 'can_create_users', true);
      await RoleEavService.setRolePermission(role2Id, 'can_create_users', false);

      const aggregated = await RoleEavService.getAggregatedPermissions([role1Id, role2Id]);
      
      // OR logic: true OR false = true
      expect(aggregated.data.can_create_users).to.be.true;

      // Cleanup (both generic and entity-specific tables)
      await AttributeValue.destroy({ where: { entityId: role1Id }, force: true });
      await AttributeValue.destroy({ where: { entityId: role2Id }, force: true });
      await RoleAttributeValue.destroy({ where: { roleId: role1Id }, force: true });
      await RoleAttributeValue.destroy({ where: { roleId: role2Id }, force: true });
      await Role.destroy({ where: { id: role1Id }, force: true });
      await Role.destroy({ where: { id: role2Id }, force: true });
    });

    it('should use MAX logic for numeric permissions across roles', async function () {
      const role1Id = uuidv4();
      const role2Id = uuidv4();

      await Role.create({ id: role1Id, name: `num-test-role1-${Date.now()}` });
      await Role.create({ id: role2Id, name: `num-test-role2-${Date.now()}` });

      // Set different max_course_load values
      await RoleEavService.setRolePermission(role1Id, 'max_course_load', 3);
      await RoleEavService.setRolePermission(role2Id, 'max_course_load', 7);

      const aggregated = await RoleEavService.getAggregatedPermissions([role1Id, role2Id]);
      
      // MAX logic: max(3, 7) = 7
      expect(aggregated.data.max_course_load).to.equal(7);

      // Cleanup (both generic and entity-specific tables)
      await AttributeValue.destroy({ where: { entityId: role1Id }, force: true });
      await AttributeValue.destroy({ where: { entityId: role2Id }, force: true });
      await RoleAttributeValue.destroy({ where: { roleId: role1Id }, force: true });
      await RoleAttributeValue.destroy({ where: { roleId: role2Id }, force: true });
      await Role.destroy({ where: { id: role1Id }, force: true });
      await Role.destroy({ where: { id: role2Id }, force: true });
    });
  });

  // ============================================================================
  // Entity-Specific Table Tests
  // ============================================================================
  describe('Entity-Specific Attribute Value Tables', function () {
    
    it('should have user_attribute_values table structure', async function () {
      const [columns] = await sequelize.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'user_attribute_values'
      `);

      // Skip if table doesn't exist yet (migration not run)
      if (columns.length === 0) {
        this.skip();
      }

      const columnNames = columns.map(c => c.column_name);
      expect(columnNames).to.include('userId');
      expect(columnNames).to.include('attributeId');
      expect(columnNames).to.include('valueType');
      expect(columnNames).to.include('valueString');
      expect(columnNames).to.include('valueBoolean');
    });

    it('should have role_attribute_values table structure', async function () {
      const [columns] = await sequelize.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'role_attribute_values'
      `);

      // Skip if table doesn't exist yet (migration not run)
      if (columns.length === 0) {
        this.skip();
      }

      const columnNames = columns.map(c => c.column_name);
      expect(columnNames).to.include('roleId');
      expect(columnNames).to.include('attributeId');
      expect(columnNames).to.include('valueType');
      expect(columnNames).to.include('valueString');
      expect(columnNames).to.include('valueBoolean');
    });

    it('should have useEntitySpecificTable column in entity_types', async function () {
      const [columns] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'entity_types' AND column_name = 'useEntitySpecificTable'
      `);

      // Skip if column doesn't exist yet (migration not run)
      if (columns.length === 0) {
        this.skip();
      }

      expect(columns).to.have.lengthOf(1);
    });

    it('should report correct table info from RoleEavService', async function () {
      const tableInfo = await RoleEavService.getEavTableInfo();
      
      expect(tableInfo).to.exist;
      expect(tableInfo.entityType).to.equal('Role');
      expect(tableInfo).to.have.property('useEntitySpecificTable');
      expect(tableInfo).to.have.property('tableName');
      
      // Table name should match the feature flag state
      if (tableInfo.useEntitySpecificTable) {
        expect(tableInfo.tableName).to.equal('role_attribute_values');
      } else {
        expect(tableInfo.tableName).to.equal('attribute_values');
      }
    });

    it('should have proper foreign key constraints on user_attribute_values', async function () {
      const [constraints] = await sequelize.query(`
        SELECT tc.constraint_name, tc.constraint_type, kcu.column_name, 
               ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'user_attribute_values'
          AND tc.constraint_type = 'FOREIGN KEY'
      `);

      // Skip if table doesn't exist yet
      if (constraints.length === 0) {
        this.skip();
      }

      const foreignTables = constraints.map(c => c.foreign_table_name);
      expect(foreignTables).to.include('users');
      expect(foreignTables).to.include('attribute_definitions');
    });

    it('should have proper foreign key constraints on role_attribute_values', async function () {
      const [constraints] = await sequelize.query(`
        SELECT tc.constraint_name, tc.constraint_type, kcu.column_name, 
               ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'role_attribute_values'
          AND tc.constraint_type = 'FOREIGN KEY'
      `);

      // Skip if table doesn't exist yet
      if (constraints.length === 0) {
        this.skip();
      }

      const foreignTables = constraints.map(c => c.foreign_table_name);
      expect(foreignTables).to.include('roles');
      expect(foreignTables).to.include('attribute_definitions');
    });
  });
});
