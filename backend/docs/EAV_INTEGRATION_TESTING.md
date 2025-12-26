# EAV Integration Testing Guide

## Pre-Production Checklist for EAV Models

This document provides complete integration testing steps for all newly added EAV (Entity-Attribute-Value) models before merging to production.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Migration Setup](#migration-setup)
4. [EAV Setup Scripts](#eav-setup-scripts)
5. [Running Integration Tests](#running-integration-tests)
6. [Test Descriptions](#test-descriptions)
7. [Troubleshooting](#troubleshooting)
8. [Production Deployment Checklist](#production-deployment-checklist)

---

## Prerequisites

### Required Software
- Node.js v18+ 
- pnpm (package manager)
- PostgreSQL 14+
- Docker (optional, for containerized database)

### Environment Setup

1. **Install dependencies:**
   ```powershell
   cd backend
   pnpm install
   ```

2. **Configure environment variables:**
   Create or update `.env` file:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=uums_db
   DB_USER=uums_user
   DB_PASSWORD=uums_password
   NODE_ENV=development
   ```

3. **Start PostgreSQL database:**
   ```powershell
   # Using Docker
   docker-compose up -d postgres
   
   # Or ensure local PostgreSQL is running
   ```

---

## Quick Start

Run all tests with a single command:

```powershell
cd backend
pnpm run test:pre-prod
```

This command will:
1. Check migration status
2. Run EAV schema validation tests
3. Run CRUD operation tests

---

## Migration Setup

### Important: sequelize.sync() Removed

The `sequelize.sync({ alter: true })` has been replaced with Sequelize CLI migrations. This ensures:
- Predictable schema changes
- Version-controlled database structure
- Safe production deployments
- Rollback capability

### Apply Migrations

```powershell
# Check current migration status
pnpm run migrate:status

# Apply all pending migrations
pnpm run migrate:up

# View available migrations
ls migrations/
```

### Migration Files

| Migration | Description |
|-----------|-------------|
| `20250701000000-create-eav-tables.js` | Creates core EAV tables (entity_types, attribute_definitions, attribute_values) |
| `20250701000001-add-profile-eav-enabled-to-users.js` | Adds profileEavEnabled flag to users table |
| `20250701000002-add-eav-migration-flags.js` | Adds EAV migration flags to facilities, instructors, assessments |

### Rollback Migrations (if needed)

```powershell
# Undo last migration
pnpm run migrate:undo

# Undo all migrations (CAUTION: destroys all data)
pnpm run migrate:undo:all

# Reset database (undo all + apply all)
pnpm run db:reset
```

---

## EAV Setup Scripts

After migrations, run the EAV setup scripts to configure entity types and attribute definitions:

### 1. User Profile EAV Setup

```powershell
# Preview changes (dry run)
node scripts/setup-user-profile-eav.js --dry-run --verbose

# Apply changes
pnpm run eav:setup:user
```

This configures:
- User entity type
- Common profile attributes (preferred_name, phone_number, address, etc.)
- Role-specific attributes (student, instructor, parent, staff)

### 2. Assessment Metadata EAV Setup

```powershell
# Preview changes
node scripts/setup-assessment-metadata-eav.js --dry-run

# Apply changes
pnpm run eav:setup:assessment
```

This configures:
- Assessment entity type
- Metadata attributes (difficulty_level, grading_rubric, proctoring settings, etc.)

### 3. Facility Equipment EAV Migration

```powershell
# Preview changes
node scripts/migrate-facility-equipment-to-eav.js --dry-run

# Apply migration
pnpm run eav:migrate:facility
```

This migrates:
- Legacy equipmentList JSON column to EAV pattern
- Equipment attributes (name, quantity, condition, notes)

### 4. Instructor Awards EAV Migration

```powershell
# Preview changes  
node scripts/migrate-instructor-awards-to-eav.js --dry-run

# Apply migration
pnpm run eav:migrate:instructor
```

This migrates:
- Legacy awards JSON column to EAV pattern
- Award attributes (title, date, organization, description)

---

## Running Integration Tests

### Test Commands

| Command | Description |
|---------|-------------|
| `pnpm test` | Run all EAV integration tests |
| `pnpm run test:eav` | Run EAV schema validation tests |
| `pnpm run test:eav:quick` | Run quick smoke tests |
| `pnpm run test:eav:verbose` | Run tests with verbose output |
| `pnpm run test:eav:crud` | Run CRUD operation tests |
| `pnpm run test:eav:all` | Run all EAV tests |
| `pnpm run test:pre-prod` | Full pre-production test suite |

### Individual Module Tests

```powershell
# Test User Profile EAV
pnpm run test:eav:user

# Test Assessment Metadata EAV  
pnpm run test:eav:assessment

# Test Facility Equipment EAV
pnpm run test:eav:facility
```

---

## Test Descriptions

### 1. EAV Schema Validation (`eav-integration.test.js`)

Tests the core EAV infrastructure:

- ✅ Database connection
- ✅ EAV tables exist (entity_types, attribute_definitions, attribute_values)
- ✅ Required columns present
- ✅ Entity types configured (User, Assessment, Facility, Instructor)
- ✅ Attribute definitions created
- ✅ Indexes exist for performance
- ✅ Foreign key constraints
- ✅ Data integrity (no orphaned records)
- ✅ EAV service availability
- ✅ Migration flag columns

### 2. CRUD Operations Test (`eav-crud.test.js`)

Tests actual database operations:

**User Profile EAV:**
- ✅ Create profile attribute
- ✅ Read profile
- ✅ Update attribute
- ✅ Bulk set attributes
- ✅ Delete attribute

**Assessment Metadata EAV:**
- ✅ Set metadata
- ✅ Get metadata
- ✅ Get available attributes

**Facility Equipment EAV:**
- ✅ Add equipment
- ✅ Get equipment list
- ✅ Update equipment
- ✅ Remove equipment

**Instructor Awards EAV:**
- ✅ Get awards

**Data Type Handling:**
- ✅ String values
- ✅ Boolean values
- ✅ Integer values
- ✅ JSON values

**Concurrent Operations:**
- ✅ Multiple simultaneous writes
- ✅ Read after concurrent writes

### 3. Module-Specific Tests

**User Profile (`user-profile-eav.test.js`):**
- Profile attribute CRUD
- Bulk operations
- Category filtering
- Multi-role support

**Assessment Metadata (`assessment-metadata-eav.test.js`):**
- Metadata CRUD
- Grading rubric storage
- Proctoring settings

**Facility Equipment (`facility-equipment-eav.test.js`):**
- Equipment CRUD
- Legacy data fallback
- Migration flag handling

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution:** Ensure PostgreSQL is running:
```powershell
docker-compose up -d postgres
# or
net start postgresql-x64-14
```

#### 2. Migration Failed - Table Already Exists
```
Error: relation "entity_types" already exists
```
**Solution:** The migration checks for existing tables. If running manually:
```powershell
pnpm run migrate:undo
pnpm run migrate:up
```

#### 3. Entity Type Not Found
```
User entity type not configured - skipping
```
**Solution:** Run the setup script:
```powershell
pnpm run eav:setup:user
```

#### 4. Foreign Key Violation
```
Error: insert or update on table "attribute_values" violates foreign key constraint
```
**Solution:** Ensure attribute definitions exist:
```powershell
pnpm run eav:setup:assessment
```

#### 5. Test Timeout
```
Error: Timeout of 30000ms exceeded
```
**Solution:** Check database performance or increase timeout:
```powershell
node tests/integration/eav-integration.test.js --timeout 60000
```

---

## Production Deployment Checklist

### Pre-Deployment Steps

- [ ] **1. Backup production database**
  ```powershell
  pg_dump -U uums_user uums_db > backup_$(date +%Y%m%d).sql
  ```

- [ ] **2. Review pending migrations**
  ```powershell
  pnpm run migrate:status
  ```

- [ ] **3. Test migrations on staging**
  ```powershell
  # On staging server
  pnpm run migrate:up
  ```

- [ ] **4. Run integration tests on staging**
  ```powershell
  pnpm run test:pre-prod
  ```

- [ ] **5. Verify all tests pass**
  - EAV schema validation: ✓
  - CRUD operations: ✓
  - Data integrity: ✓

### Deployment Steps

- [ ] **6. Set production environment**
  ```powershell
  $env:NODE_ENV="production"
  ```

- [ ] **7. Apply migrations**
  ```powershell
  pnpm run migrate:up
  ```

- [ ] **8. Run EAV setup scripts**
  ```powershell
  pnpm run eav:setup:user
  pnpm run eav:setup:assessment
  # Only if migrating existing data:
  pnpm run eav:migrate:facility
  pnpm run eav:migrate:instructor
  ```

- [ ] **9. Verify deployment**
  ```powershell
  pnpm run test:eav:quick
  ```

- [ ] **10. Start application**
  ```powershell
  pnpm start
  ```

### Post-Deployment Verification

- [ ] **11. Check application logs**
  ```powershell
  # Verify no EAV-related errors
  ```

- [ ] **12. Test critical user flows**
  - User profile updates
  - Assessment creation with metadata
  - Facility equipment management

- [ ] **13. Monitor performance**
  - Check database query times
  - Verify index usage

---

## EAV Models Summary

| Entity | EAV Table | Service File | Setup Script |
|--------|-----------|--------------|--------------|
| User | attribute_values | userProfileEavService.js | setup-user-profile-eav.js |
| Assessment | attribute_values | assessmentMetadataEavService.js | setup-assessment-metadata-eav.js |
| Facility | attribute_values | facilityEquipmentEavService.js | migrate-facility-equipment-to-eav.js |
| Instructor | attribute_values | instructorAwardsEavService.js | migrate-instructor-awards-to-eav.js |

---

## Support

For issues with EAV implementation:
1. Check the troubleshooting section above
2. Review test output for specific failures
3. Check [USER_PROFILE_EAV.md](USER_PROFILE_EAV.md) for detailed documentation
4. Check [migrations/README.md](migrations/README.md) for migration details
