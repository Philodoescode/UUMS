'use strict';

/**
 * Sequelize CLI Migration: Multi-Role and EAV for Dynamic Permissions
 * 
 * This migration implements:
 * 1. Migrates existing roleId relationships to user_roles join table
 * 2. Removes the roleId column from users table (after migration)
 * 3. Registers Role as an EAV entity type
 * 4. Adds permission-related attribute definitions for roles
 * 
 * Run: pnpm migrate:up
 * Rollback: pnpm migrate:undo
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // ========================================
      // 1. Migrate existing roleId to user_roles
      // ========================================
      console.log('Step 1: Migrating existing user roles to user_roles table...');
      
      // Get all users with roleId set
      const usersWithRoles = await queryInterface.sequelize.query(
        `SELECT id, "roleId" FROM users WHERE "roleId" IS NOT NULL`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );
      
      console.log(`Found ${usersWithRoles.length} users with roleId to migrate`);
      
      // Insert into user_roles if not already exists
      for (const user of usersWithRoles) {
        // Check if this user-role combination already exists
        const existingUserRole = await queryInterface.sequelize.query(
          `SELECT id FROM user_roles WHERE "userId" = :userId AND "roleId" = :roleId`,
          {
            type: Sequelize.QueryTypes.SELECT,
            replacements: { userId: user.id, roleId: user.roleId },
            transaction
          }
        );
        
        if (existingUserRole.length === 0) {
          await queryInterface.sequelize.query(
            `INSERT INTO user_roles (id, "userId", "roleId", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), :userId, :roleId, NOW(), NOW())`,
            {
              replacements: { userId: user.id, roleId: user.roleId },
              transaction
            }
          );
        }
      }
      
      console.log('Completed migrating user roles to user_roles table');

      // ========================================
      // 2. Remove roleId column from users table
      // ========================================
      console.log('Step 2: Removing roleId column from users table...');
      
      // Check if roleId column exists
      const roleIdExists = await queryInterface.sequelize.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name = 'users' AND column_name = 'roleId'`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );
      
      if (roleIdExists.length > 0) {
        // Remove foreign key constraint first
        try {
          await queryInterface.removeConstraint('users', 'users_roleId_fkey', { transaction });
          console.log('Removed foreign key constraint users_roleId_fkey');
        } catch (err) {
          console.log('Foreign key constraint may not exist or has different name, continuing...');
        }
        
        // Remove the column
        await queryInterface.removeColumn('users', 'roleId', { transaction });
        console.log('Removed roleId column from users table');
      } else {
        console.log('roleId column does not exist in users table, skipping removal');
      }

      // ========================================
      // 3. Register Role as an EAV entity type
      // ========================================
      console.log('Step 3: Registering Role as an EAV entity type...');
      
      // Check if Role entity type already exists
      const existingRoleEntityType = await queryInterface.sequelize.query(
        `SELECT id FROM entity_types WHERE name = 'Role' AND "deletedAt" IS NULL`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );
      
      let roleEntityTypeId;
      
      if (existingRoleEntityType.length === 0) {
        const result = await queryInterface.sequelize.query(
          `INSERT INTO entity_types (id, name, "tableName", description, "isActive", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), 'Role', 'roles', 'User roles with dynamic permission attributes', true, NOW(), NOW())
           RETURNING id`,
          { type: Sequelize.QueryTypes.INSERT, transaction }
        );
        roleEntityTypeId = result[0][0].id;
        console.log(`Created Role entity type with ID: ${roleEntityTypeId}`);
      } else {
        roleEntityTypeId = existingRoleEntityType[0].id;
        console.log(`Role entity type already exists with ID: ${roleEntityTypeId}`);
      }

      // ========================================
      // 4. Add permission-related attribute definitions
      // ========================================
      console.log('Step 4: Adding permission attribute definitions for Role entity type...');
      
      const permissionAttributes = [
        {
          name: 'can_create_users',
          displayName: 'Can Create Users',
          description: 'Permission to create new user accounts',
          valueType: 'boolean',
          isRequired: false,
          defaultValue: 'false',
        },
        {
          name: 'can_manage_courses',
          displayName: 'Can Manage Courses',
          description: 'Permission to create, edit, and delete courses',
          valueType: 'boolean',
          isRequired: false,
          defaultValue: 'false',
        },
        {
          name: 'can_view_grades',
          displayName: 'Can View Grades',
          description: 'Permission to view student grades',
          valueType: 'boolean',
          isRequired: false,
          defaultValue: 'false',
        },
        {
          name: 'can_edit_grades',
          displayName: 'Can Edit Grades',
          description: 'Permission to modify student grades',
          valueType: 'boolean',
          isRequired: false,
          defaultValue: 'false',
        },
        {
          name: 'can_manage_enrollments',
          displayName: 'Can Manage Enrollments',
          description: 'Permission to approve or reject enrollment requests',
          valueType: 'boolean',
          isRequired: false,
          defaultValue: 'false',
        },
        {
          name: 'can_view_reports',
          displayName: 'Can View Reports',
          description: 'Permission to access administrative reports',
          valueType: 'boolean',
          isRequired: false,
          defaultValue: 'false',
        },
        {
          name: 'can_manage_facilities',
          displayName: 'Can Manage Facilities',
          description: 'Permission to manage facility bookings and maintenance',
          valueType: 'boolean',
          isRequired: false,
          defaultValue: 'false',
        },
        {
          name: 'can_manage_hr',
          displayName: 'Can Manage HR',
          description: 'Permission to manage HR functions like payroll and leave',
          valueType: 'boolean',
          isRequired: false,
          defaultValue: 'false',
        },
        {
          name: 'can_view_announcements',
          displayName: 'Can View Announcements',
          description: 'Permission to view system announcements',
          valueType: 'boolean',
          isRequired: false,
          defaultValue: 'true',
        },
        {
          name: 'can_create_announcements',
          displayName: 'Can Create Announcements',
          description: 'Permission to create system-wide announcements',
          valueType: 'boolean',
          isRequired: false,
          defaultValue: 'false',
        },
        {
          name: 'max_course_load',
          displayName: 'Maximum Course Load',
          description: 'Maximum number of courses this role can enroll in/teach',
          valueType: 'integer',
          isRequired: false,
          defaultValue: '5',
        },
        {
          name: 'dashboard_widgets',
          displayName: 'Dashboard Widgets',
          description: 'JSON array of widget IDs visible on dashboard',
          valueType: 'json',
          isRequired: false,
          defaultValue: '[]',
        },
        {
          name: 'feature_flags',
          displayName: 'Feature Flags',
          description: 'JSON object of feature toggles for this role',
          valueType: 'json',
          isRequired: false,
          defaultValue: '{}',
        },
        {
          name: 'access_level',
          displayName: 'Access Level',
          description: 'Numeric access level (1=basic, 10=admin)',
          valueType: 'integer',
          isRequired: false,
          defaultValue: '1',
        },
        {
          name: 'permission_scope',
          displayName: 'Permission Scope',
          description: 'Scope of permissions (department, faculty, university)',
          valueType: 'string',
          isRequired: false,
          defaultValue: 'department',
        },
      ];
      
      for (const attr of permissionAttributes) {
        // Check if attribute already exists for this entity type
        const existingAttr = await queryInterface.sequelize.query(
          `SELECT id FROM attribute_definitions 
           WHERE "entityTypeId" = :entityTypeId AND name = :name AND "deletedAt" IS NULL`,
          {
            type: Sequelize.QueryTypes.SELECT,
            replacements: { entityTypeId: roleEntityTypeId, name: attr.name },
            transaction
          }
        );
        
        if (existingAttr.length === 0) {
          await queryInterface.sequelize.query(
            `INSERT INTO attribute_definitions 
             (id, "entityTypeId", name, "displayName", description, "valueType", "isRequired", "defaultValue", "sortOrder", "isActive", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), :entityTypeId, :name, :displayName, :description, :valueType, :isRequired, :defaultValue, :sortOrder, true, NOW(), NOW())`,
            {
              replacements: {
                entityTypeId: roleEntityTypeId,
                name: attr.name,
                displayName: attr.displayName,
                description: attr.description,
                valueType: attr.valueType,
                isRequired: attr.isRequired,
                defaultValue: attr.defaultValue,
                sortOrder: permissionAttributes.indexOf(attr),
              },
              transaction
            }
          );
          console.log(`Created attribute definition: ${attr.name}`);
        } else {
          console.log(`Attribute definition already exists: ${attr.name}`);
        }
      }

      // ========================================
      // 5. Seed default permission values for existing roles
      // ========================================
      console.log('Step 5: Seeding default permission values for existing roles...');
      
      const rolePermissionDefaults = {
        'admin': {
          can_create_users: true,
          can_manage_courses: true,
          can_view_grades: true,
          can_edit_grades: true,
          can_manage_enrollments: true,
          can_view_reports: true,
          can_manage_facilities: true,
          can_manage_hr: true,
          can_view_announcements: true,
          can_create_announcements: true,
          max_course_load: 10,
          access_level: 10,
          permission_scope: 'university',
        },
        'instructor': {
          can_create_users: false,
          can_manage_courses: true,
          can_view_grades: true,
          can_edit_grades: true,
          can_manage_enrollments: false,
          can_view_reports: true,
          can_manage_facilities: false,
          can_manage_hr: false,
          can_view_announcements: true,
          can_create_announcements: true,
          max_course_load: 6,
          access_level: 5,
          permission_scope: 'department',
        },
        'student': {
          can_create_users: false,
          can_manage_courses: false,
          can_view_grades: true,
          can_edit_grades: false,
          can_manage_enrollments: false,
          can_view_reports: false,
          can_manage_facilities: false,
          can_manage_hr: false,
          can_view_announcements: true,
          can_create_announcements: false,
          max_course_load: 6,
          access_level: 1,
          permission_scope: 'department',
        },
        'advisor': {
          can_create_users: false,
          can_manage_courses: false,
          can_view_grades: true,
          can_edit_grades: false,
          can_manage_enrollments: true,
          can_view_reports: true,
          can_manage_facilities: false,
          can_manage_hr: false,
          can_view_announcements: true,
          can_create_announcements: true,
          max_course_load: 0,
          access_level: 4,
          permission_scope: 'department',
        },
        'hr': {
          can_create_users: true,
          can_manage_courses: false,
          can_view_grades: false,
          can_edit_grades: false,
          can_manage_enrollments: false,
          can_view_reports: true,
          can_manage_facilities: false,
          can_manage_hr: true,
          can_view_announcements: true,
          can_create_announcements: true,
          max_course_load: 0,
          access_level: 6,
          permission_scope: 'university',
        },
        'ta': {
          can_create_users: false,
          can_manage_courses: false,
          can_view_grades: true,
          can_edit_grades: true,
          can_manage_enrollments: false,
          can_view_reports: false,
          can_manage_facilities: false,
          can_manage_hr: false,
          can_view_announcements: true,
          can_create_announcements: false,
          max_course_load: 3,
          access_level: 3,
          permission_scope: 'department',
        },
        'parent': {
          can_create_users: false,
          can_manage_courses: false,
          can_view_grades: true,
          can_edit_grades: false,
          can_manage_enrollments: false,
          can_view_reports: false,
          can_manage_facilities: false,
          can_manage_hr: false,
          can_view_announcements: true,
          can_create_announcements: false,
          max_course_load: 0,
          access_level: 2,
          permission_scope: 'department',
        },
      };
      
      // Get all existing roles
      const existingRoles = await queryInterface.sequelize.query(
        `SELECT id, name FROM roles`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );
      
      // Get attribute definitions for Role entity type
      const attrDefs = await queryInterface.sequelize.query(
        `SELECT id, name, "valueType" FROM attribute_definitions 
         WHERE "entityTypeId" = :entityTypeId AND "deletedAt" IS NULL`,
        {
          type: Sequelize.QueryTypes.SELECT,
          replacements: { entityTypeId: roleEntityTypeId },
          transaction
        }
      );
      
      const attrDefMap = {};
      for (const def of attrDefs) {
        attrDefMap[def.name] = def;
      }
      
      for (const role of existingRoles) {
        const permissions = rolePermissionDefaults[role.name];
        if (!permissions) {
          console.log(`No default permissions defined for role: ${role.name}, skipping`);
          continue;
        }
        
        for (const [attrName, value] of Object.entries(permissions)) {
          const attrDef = attrDefMap[attrName];
          if (!attrDef) continue;
          
          // Check if value already exists
          const existingValue = await queryInterface.sequelize.query(
            `SELECT id FROM attribute_values 
             WHERE "attributeId" = :attributeId AND "entityType" = 'Role' AND "entityId" = :entityId AND "deletedAt" IS NULL`,
            {
              type: Sequelize.QueryTypes.SELECT,
              replacements: { attributeId: attrDef.id, entityId: role.id },
              transaction
            }
          );
          
          if (existingValue.length === 0) {
            // Determine which value column to use based on type
            let valueColumn;
            let formattedValue;
            
            switch (attrDef.valueType) {
              case 'boolean':
                valueColumn = '"valueBoolean"';
                formattedValue = value;
                break;
              case 'integer':
                valueColumn = '"valueInteger"';
                formattedValue = value;
                break;
              case 'string':
                valueColumn = '"valueString"';
                formattedValue = `'${value}'`;
                break;
              case 'json':
                valueColumn = '"valueJson"';
                formattedValue = `'${JSON.stringify(value)}'::jsonb`;
                break;
              default:
                valueColumn = '"valueString"';
                formattedValue = `'${value}'`;
            }
            
            await queryInterface.sequelize.query(
              `INSERT INTO attribute_values 
               (id, "attributeId", "entityType", "entityId", "valueType", ${valueColumn}, "createdAt", "updatedAt")
               VALUES (gen_random_uuid(), :attributeId, 'Role', :entityId, :valueType, ${formattedValue}, NOW(), NOW())`,
              {
                replacements: {
                  attributeId: attrDef.id,
                  entityId: role.id,
                  valueType: attrDef.valueType,
                },
                transaction
              }
            );
          }
        }
        console.log(`Seeded permission values for role: ${role.name}`);
      }

      // ========================================
      // 6. Add permissionEavEnabled flag to Role model
      // ========================================
      console.log('Step 6: Adding permissionEavEnabled column to roles table...');
      
      const permEavExists = await queryInterface.sequelize.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name = 'roles' AND column_name = 'permissionEavEnabled'`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );
      
      if (permEavExists.length === 0) {
        await queryInterface.addColumn('roles', 'permissionEavEnabled', {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          allowNull: false,
          comment: 'Flag indicating permission data stored in EAV tables',
        }, { transaction });
        
        // Set all existing roles to have EAV enabled
        await queryInterface.sequelize.query(
          `UPDATE roles SET "permissionEavEnabled" = true`,
          { transaction }
        );
        
        console.log('Added permissionEavEnabled column to roles table');
      } else {
        console.log('permissionEavEnabled column already exists');
      }

      await transaction.commit();
      console.log('\nMigration completed successfully!');
      console.log('Summary:');
      console.log('- Migrated user roleId relationships to user_roles table');
      console.log('- Removed roleId column from users table');
      console.log('- Registered Role as an EAV entity type');
      console.log('- Added permission attribute definitions');
      console.log('- Seeded default permission values for existing roles');
      
    } catch (error) {
      await transaction.rollback();
      console.error('Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // ========================================
      // 1. Re-add roleId column to users table
      // ========================================
      console.log('Step 1: Re-adding roleId column to users table...');
      
      const roleIdExists = await queryInterface.sequelize.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name = 'users' AND column_name = 'roleId'`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );
      
      if (roleIdExists.length === 0) {
        await queryInterface.addColumn('users', 'roleId', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'roles',
            key: 'id',
          },
        }, { transaction });
        console.log('Added roleId column back to users table');
      }
      
      // ========================================
      // 2. Migrate user_roles back to roleId (using first role as primary)
      // ========================================
      console.log('Step 2: Migrating user_roles back to roleId...');
      
      // Get the first (oldest) role for each user from user_roles
      const userRoles = await queryInterface.sequelize.query(
        `SELECT DISTINCT ON ("userId") "userId", "roleId" 
         FROM user_roles 
         ORDER BY "userId", "createdAt" ASC`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );
      
      for (const ur of userRoles) {
        await queryInterface.sequelize.query(
          `UPDATE users SET "roleId" = :roleId WHERE id = :userId`,
          {
            replacements: { roleId: ur.roleId, userId: ur.userId },
            transaction
          }
        );
      }
      
      console.log(`Migrated ${userRoles.length} users back to roleId`);

      // ========================================
      // 3. Remove permission attribute values for roles
      // ========================================
      console.log('Step 3: Removing permission attribute values for roles...');
      
      await queryInterface.sequelize.query(
        `DELETE FROM attribute_values WHERE "entityType" = 'Role'`,
        { transaction }
      );
      
      // ========================================
      // 4. Get Role entity type ID and remove attribute definitions
      // ========================================
      console.log('Step 4: Removing permission attribute definitions...');
      
      const roleEntityType = await queryInterface.sequelize.query(
        `SELECT id FROM entity_types WHERE name = 'Role' AND "deletedAt" IS NULL`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );
      
      if (roleEntityType.length > 0) {
        await queryInterface.sequelize.query(
          `DELETE FROM attribute_definitions WHERE "entityTypeId" = :entityTypeId`,
          {
            replacements: { entityTypeId: roleEntityType[0].id },
            transaction
          }
        );
        
        // ========================================
        // 5. Remove Role entity type
        // ========================================
        console.log('Step 5: Removing Role entity type...');
        
        await queryInterface.sequelize.query(
          `DELETE FROM entity_types WHERE id = :id`,
          {
            replacements: { id: roleEntityType[0].id },
            transaction
          }
        );
      }

      // ========================================
      // 6. Remove permissionEavEnabled column from roles
      // ========================================
      console.log('Step 6: Removing permissionEavEnabled column from roles table...');
      
      const permEavExists = await queryInterface.sequelize.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name = 'roles' AND column_name = 'permissionEavEnabled'`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );
      
      if (permEavExists.length > 0) {
        await queryInterface.removeColumn('roles', 'permissionEavEnabled', { transaction });
        console.log('Removed permissionEavEnabled column from roles table');
      }

      await transaction.commit();
      console.log('\nRollback completed successfully!');
      
    } catch (error) {
      await transaction.rollback();
      console.error('Rollback failed:', error);
      throw error;
    }
  }
};
