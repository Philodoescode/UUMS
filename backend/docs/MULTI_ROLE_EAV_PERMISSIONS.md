# Multi-Role Architecture and EAV Dynamic Permissions

## Overview

This document describes the implementation of the multi-role architecture and EAV (Entity-Attribute-Value) dynamic permissions system as specified in the project requirements.

### Key Requirements Addressed

1. **Multi-Role Pattern (Sprint Planning, Slide 5)**: "Implementing multi-role patterns for complex user permissions"
2. **EAV for Dynamic Permissions (Slide 35)**: "Entity-Attribute-Value model enables flexible user role attributes that can evolve without schema changes"
3. **EAV Pattern Implementation (Slide 47)**: "Entity-Attribute-Value model excels for dynamic attributes, offering flexibility while maintaining performance"

---

## Architecture Changes

### 1. User Model Changes

The `User` model no longer has a direct `roleId` foreign key. All role assignments are now managed through the `UserRole` join table.

**Before (Single-Role):**
```javascript
// User had a direct roleId column
{
  id: UUID,
  email: STRING,
  roleId: UUID,  // REMOVED
  ...
}
```

**After (Multi-Role):**
```javascript
// User no longer has roleId
{
  id: UUID,
  email: STRING,
  // Roles assigned via UserRole join table
  ...
}
```

### 2. UserRole Join Table

The `user_roles` table enables many-to-many relationships between users and roles.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| userId | UUID | Foreign key to users |
| roleId | UUID | Foreign key to roles |
| createdAt | TIMESTAMP | Creation timestamp |
| updatedAt | TIMESTAMP | Update timestamp |

### 3. Role Model Changes

The `Role` model now includes EAV support via the `permissionEavEnabled` flag.

```javascript
{
  id: UUID,
  name: STRING,
  permissionEavEnabled: BOOLEAN  // NEW - indicates permissions stored in EAV
}
```

### 4. EAV Entity Registration

`Role` is registered as an EAV entity type, allowing dynamic permission attributes to be stored and queried through the EAV system.

---

## Permission Attributes

The following permission attributes are defined for the Role entity type:

| Attribute Name | Type | Default | Description |
|----------------|------|---------|-------------|
| can_create_users | boolean | false | Permission to create user accounts |
| can_manage_courses | boolean | false | Permission to manage courses |
| can_view_grades | boolean | false | Permission to view grades |
| can_edit_grades | boolean | false | Permission to edit grades |
| can_manage_enrollments | boolean | false | Permission to manage enrollments |
| can_view_reports | boolean | false | Permission to view reports |
| can_manage_facilities | boolean | false | Permission to manage facilities |
| can_manage_hr | boolean | false | Permission to manage HR functions |
| can_view_announcements | boolean | true | Permission to view announcements |
| can_create_announcements | boolean | false | Permission to create announcements |
| max_course_load | integer | 5 | Maximum courses for this role |
| access_level | integer | 1 | Numeric access level (1-10) |
| permission_scope | string | department | Scope of permissions |
| dashboard_widgets | json | [] | Dashboard widget configuration |
| feature_flags | json | {} | Feature toggles |

---

## Usage Guide

### Assigning Roles to Users

```javascript
const { User, Role, UserRole } = require('./models');

// Find the user and role
const user = await User.findOne({ where: { email: 'user@example.com' } });
const role = await Role.findOne({ where: { name: 'instructor' } });

// Assign role (multi-role pattern)
await UserRole.create({
  userId: user.id,
  roleId: role.id
});

// Add another role
const advisorRole = await Role.findOne({ where: { name: 'advisor' } });
await UserRole.create({
  userId: user.id,
  roleId: advisorRole.id
});
```

### Querying Users with Roles

```javascript
// Get user with all roles
const userWithRoles = await User.findByPk(userId, {
  include: [{ model: Role, as: 'roles', through: { attributes: [] } }]
});

// userWithRoles.roles is an array of all assigned roles
console.log(userWithRoles.roles.map(r => r.name)); // ['instructor', 'advisor']
```

### Filtering Users by Role

```javascript
// Find all users with a specific role
const instructorRole = await Role.findOne({ where: { name: 'instructor' } });

const instructors = await User.findAll({
  include: [{
    model: Role,
    as: 'roles',
    through: { attributes: [] },
    where: { id: instructorRole.id }
  }]
});
```

### Removing a Role from User

```javascript
// Remove specific role
await UserRole.destroy({
  where: { userId: user.id, roleId: advisorRole.id }
});
```

---

## Permission Management

### Using RoleEavService

The `RoleEavService` provides methods for managing EAV-based permissions.

```javascript
const RoleEavService = require('./utils/roleEavService');

// Get all permissions for a role
const result = await RoleEavService.getRolePermissions(roleId);
// result.data = { can_create_users: true, can_manage_courses: false, ... }

// Get specific permission
const perm = await RoleEavService.getRolePermission(roleId, 'can_create_users');
// perm.data = { name: 'can_create_users', value: true }

// Set a permission
await RoleEavService.setRolePermission(roleId, 'can_create_users', true);

// Bulk set permissions
await RoleEavService.bulkSetRolePermissions(roleId, {
  can_create_users: true,
  can_manage_courses: true,
  max_course_load: 8
});

// Check if role has permission
const canCreate = await RoleEavService.hasPermission(roleId, 'can_create_users');
// returns boolean
```

### User Permission Checking

```javascript
// Check if user has permission (across all their roles)
const canCreate = await RoleEavService.userHasPermission(userId, 'can_create_users');

// Get aggregated permissions for user (OR for booleans, MAX for numbers)
const userPerms = await RoleEavService.getUserPermissions(userId);
// userPerms.data = aggregated permissions from all user's roles
```

### Permission Aggregation Logic

When a user has multiple roles, permissions are aggregated:

- **Boolean permissions**: OR logic (if ANY role has permission, user has permission)
- **Numeric permissions**: MAX logic (highest value from any role)
- **String permissions**: First non-empty value
- **JSON array permissions**: Merged with deduplication

---

## Authorization Middleware

### Role-Based Authorization

```javascript
const { authorize } = require('./middleware/authMiddleware');

// Allow access if user has ANY of these roles
router.get('/admin-panel', protect, authorize('admin'), handler);

// Allow multiple roles
router.get('/grades', protect, authorize('instructor', 'ta', 'advisor'), handler);
```

### Permission-Based Authorization (EAV)

```javascript
const { authorizePermission } = require('./middleware/authMiddleware');

// Check specific EAV permission
router.post('/users', protect, authorizePermission('can_create_users'), handler);

router.put('/grades/:id', protect, authorizePermission('can_edit_grades'), handler);
```

### Attaching Permissions to Request

```javascript
const { attachPermissions } = require('./middleware/authMiddleware');

// Attach user's aggregated permissions to req.user.permissions
router.use(protect, attachPermissions);

// In handler
app.get('/dashboard', (req, res) => {
  // req.user.permissions contains aggregated permissions
  const widgets = req.user.permissions.dashboard_widgets || [];
});
```

---

## Migration Guide

### Running the Migration

```bash
cd backend
pnpm migrate:up
```

The migration will:
1. Migrate existing `roleId` values from users to `user_roles` table
2. Remove the `roleId` column from `users` table
3. Register `Role` as an EAV entity type
4. Create permission attribute definitions
5. Seed default permission values for existing roles
6. Add `permissionEavEnabled` column to roles

### Rolling Back

```bash
pnpm migrate:undo
```

The rollback will:
1. Re-add `roleId` column to users
2. Migrate `user_roles` back to `roleId` (first role becomes primary)
3. Remove permission attribute values
4. Remove Role entity type registration
5. Remove `permissionEavEnabled` column

---

## Default Role Permissions

| Role | can_create_users | can_manage_courses | can_view_grades | can_edit_grades | access_level |
|------|------------------|--------------------|-----------------|-----------------|--------------| 
| admin | true | true | true | true | 10 |
| instructor | false | true | true | true | 5 |
| student | false | false | true | false | 1 |
| advisor | false | false | true | false | 4 |
| hr | true | false | false | false | 6 |
| ta | false | false | true | true | 3 |
| parent | false | false | true | false | 2 |

---

## API Response Changes

### Login Response

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "fullName": "User Name",
  "role": "instructor",
  "roles": ["instructor", "advisor"]
}
```

The `role` field contains the primary role (first assigned) for backward compatibility.
The `roles` field contains all assigned roles for multi-role support.

### User Query Response

```json
{
  "id": "uuid",
  "fullName": "User Name",
  "email": "user@example.com",
  "role": { "id": "uuid", "name": "instructor" },
  "roles": [
    { "id": "uuid", "name": "instructor" },
    { "id": "uuid", "name": "advisor" }
  ]
}
```

---

## Testing

Run the multi-role and EAV permission tests:

```bash
cd backend
pnpm test -- --grep "Multi-Role and EAV"
```

### Test Coverage

- Multi-Role Architecture
  - User creation without roleId
  - Multiple role assignment
  - Role removal
  - Role-based queries

- EAV Dynamic Permissions
  - Entity type registration
  - Permission attribute definitions
  - Permission get/set operations
  - Permission aggregation

- Migration Integrity
  - Table structure verification
  - Data migration verification

- Permission Resolution
  - Default values
  - Boolean OR logic
  - Numeric MAX logic

---

## Backward Compatibility

The implementation maintains backward compatibility:

1. **`req.user.role`**: Still available in middleware, points to first role
2. **`user.role` in responses**: Still included, contains first role
3. **`authorize()` middleware**: Works with both single and multiple roles
4. **Login response**: Includes both `role` (string) and `roles` (array)

---

## Performance Considerations

1. **Caching**: RoleEavService caches attribute definitions (5-minute TTL)
2. **Indexing**: `user_roles` table has indexes on userId and roleId
3. **Eager Loading**: Use `include` with `through: { attributes: [] }` to avoid loading join table data
4. **Batch Operations**: Use `bulkSetRolePermissions` for multiple permission updates

---

## Future Enhancements

1. **Permission Inheritance**: Roles could inherit permissions from parent roles
2. **Conditional Permissions**: Permissions based on entity relationships (e.g., "can edit grades for own courses")
3. **Permission Groups**: Group permissions for easier management
4. **Audit Logging**: Track permission changes over time
