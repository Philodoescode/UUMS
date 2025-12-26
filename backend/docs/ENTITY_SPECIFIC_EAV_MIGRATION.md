# Entity-Specific EAV Tables Migration Guide

## Overview

This document describes the structural refactor from a generic polymorphic `attribute_values` table to entity-specific tables (`user_attribute_values` and `role_attribute_values`) with proper foreign keys.

## What Changed

### New Database Tables

1. **`user_attribute_values`**
   - Composite Primary Key: `(userId, attributeId)`
   - Foreign Key to `users(id)` with CASCADE delete
   - Foreign Key to `attribute_definitions(id)` with CASCADE delete

2. **`role_attribute_values`**
   - Composite Primary Key: `(roleId, attributeId)`
   - Foreign Key to `roles(id)` with CASCADE delete
   - Foreign Key to `attribute_definitions(id)` with CASCADE delete

### New Sequelize Models

- `backend/models/userAttributeValueModel.js` - UserAttributeValue model
- `backend/models/roleAttributeValueModel.js` - RoleAttributeValue model

### Updated Services

Both services now support a feature flag to switch between tables:

- `backend/utils/userProfileEavService.js`
  - Added `shouldUseEntitySpecificTable()` function
  - Added `getEavTableInfo()` for debugging
  - Added `clearCache()` function
  - All CRUD operations now check feature flag

- `backend/utils/roleEavService.js`
  - Added `shouldUseEntitySpecificTable()` function
  - Added `getEavTableInfo()` for debugging
  - Added `deleteRolePermission()` function
  - All CRUD operations now check feature flag

### Feature Flag

The `entity_types` table has a new column:
- `useEntitySpecificTable` (BOOLEAN, default: false)

When `true` for a specific entity type, the EAV services will use the entity-specific table instead of the generic `attribute_values` table.

## Migration Steps

### 1. Run Database Migrations

```bash
cd backend
pnpm migrate:up
```

This will:
- Create `user_attribute_values` and `role_attribute_values` tables
- Add `useEntitySpecificTable` column to `entity_types`
- Set the flag to `true` for User and Role entity types
- Migrate existing data from `attribute_values` to the new tables

### 2. Verify Migration

After running migrations, verify:

```sql
-- Check new tables exist
SELECT COUNT(*) FROM user_attribute_values;
SELECT COUNT(*) FROM role_attribute_values;

-- Check feature flags are set
SELECT name, "useEntitySpecificTable" FROM entity_types WHERE name IN ('User', 'Role');
```

### 3. Monitor Parallel Operation

During the transition period, both systems run in parallel:
- The old `attribute_values` data is preserved (not deleted)
- The services automatically use the correct table based on the feature flag
- This allows for easy rollback if issues are discovered

### 4. Rollback (if needed)

To disable entity-specific tables:

```sql
UPDATE entity_types 
SET "useEntitySpecificTable" = false 
WHERE name IN ('User', 'Role');
```

Or run migration rollback:

```bash
pnpm migrate:undo
```

## Benefits of Entity-Specific Tables

| Feature | Generic Table | Entity-Specific Table |
|---------|---------------|----------------------|
| Foreign Key Constraints | ❌ Polymorphic | ✅ Proper FK |
| CASCADE Delete | ❌ Application-level hooks | ✅ Database-level |
| Query Performance | Slower (polymorphic lookup) | Faster (direct join) |
| Referential Integrity | ❌ Application-enforced | ✅ Database-enforced |
| Primary Key | UUID | Composite (entityId + attributeId) |
| Soft Delete | ✅ deletedAt column | ❌ Hard delete (FK cascades) |

## Decision: Keep Generic Table

We chose **Option B: Keep as fallback** for the generic `attribute_values` table because:

1. **Future Flexibility**: New entity types can use the generic table initially
2. **Rollback Safety**: Easy to switch back during transition period
3. **Legacy Support**: Existing scripts/reports may reference the old table
4. **Gradual Migration**: Entity types can be migrated one at a time

## Code Examples

### Checking Which Table Is Used

```javascript
const UserProfileEavService = require('./utils/userProfileEavService');
const RoleEavService = require('./utils/roleEavService');

// Get table info
const userTableInfo = await UserProfileEavService.getEavTableInfo();
console.log(userTableInfo);
// { entityType: 'User', useEntitySpecificTable: true, tableName: 'user_attribute_values' }

const roleTableInfo = await RoleEavService.getEavTableInfo();
console.log(roleTableInfo);
// { entityType: 'Role', useEntitySpecificTable: true, tableName: 'role_attribute_values' }
```

### Clearing Cache After Flag Change

```javascript
// After changing useEntitySpecificTable in database
UserProfileEavService.clearCache();
RoleEavService.clearCache();
```

## Files Modified

### Migrations
- `migrations/20250701000005-create-entity-specific-attribute-value-tables.js` (new)
- `migrations/20250701000006-migrate-data-to-entity-specific-tables.js` (new)

### Models
- `models/userAttributeValueModel.js` (new)
- `models/roleAttributeValueModel.js` (new)
- `models/entityTypeModel.js` (updated - added useEntitySpecificTable)
- `models/index.js` (updated - added new models and associations)

### Services
- `utils/userProfileEavService.js` (updated - dual-table support)
- `utils/roleEavService.js` (updated - dual-table support)

### Tests
- `tests/integration/multi-role-eav.test.js` (updated - new entity-specific table tests)

## Cleanup (Future)

Once the entity-specific tables are proven stable in production:

1. Create a cleanup migration to soft-delete old records:
   ```sql
   UPDATE attribute_values 
   SET "deletedAt" = NOW()
   WHERE "entityType" IN ('User', 'Role')
     AND "deletedAt" IS NULL;
   ```

2. Consider archiving or removing the soft-deleted records after a retention period.

3. For future entity types, evaluate whether they need dedicated tables or can use the generic table.
