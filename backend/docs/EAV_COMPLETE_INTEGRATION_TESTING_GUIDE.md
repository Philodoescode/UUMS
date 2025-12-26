# Complete EAV Integration Testing Guide

## Overview

This document provides step-by-step integration testing instructions for all newly added EAV (Entity-Attribute-Value) models in the UUMS backend. Execute these tests before merging to production.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Setup](#2-environment-setup)
3. [Database Preparation](#3-database-preparation)
4. [Migration Testing](#4-migration-testing)
5. [EAV Setup Script Execution](#5-eav-setup-script-execution)
6. [Integration Test Execution](#6-integration-test-execution)
7. [Individual Module Testing](#7-individual-module-testing)
8. [CRUD Operation Validation](#8-crud-operation-validation)
9. [Data Integrity Verification](#9-data-integrity-verification)
10. [Performance Testing](#10-performance-testing)
11. [Rollback Testing](#11-rollback-testing)
12. [Complete Test Summary](#12-complete-test-summary)

---

## 1. Prerequisites

### 1.1 Required Software

- Node.js v18 or higher
- pnpm package manager
- PostgreSQL 14 or higher
- Docker (optional, for containerized database)

### 1.2 Verify Installation

Open PowerShell and run:

```powershell
node --version
pnpm --version
docker --version
```

Expected output should show versions for all tools.

---

## 2. Environment Setup

### 2.1 Navigate to Backend Directory

```powershell
cd "e:\Coding projects\UUMS\backend"
```

### 2.2 Install Dependencies

```powershell
pnpm install
```

### 2.3 Verify Environment File

Ensure `.env` file exists with required database configuration:

```powershell
if (Test-Path .env) { Get-Content .env | Select-String "DB_" } else { Write-Host ".env file not found" }
```

Required environment variables:
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `NODE_ENV` - Environment (development/test/production)

---

## 3. Database Preparation

### 3.1 Start PostgreSQL Database

Using Docker:

```powershell
cd "e:\Coding projects\UUMS"
docker-compose up -d postgres
```

Or verify local PostgreSQL is running:

```powershell
Get-Service -Name "postgresql*"
```

### 3.2 Verify Database Connection

```powershell
cd "e:\Coding projects\UUMS\backend"
node -e "const {sequelize} = require('./config/db'); sequelize.authenticate().then(() => console.log('Database connected')).catch(err => console.error('Connection failed:', err.message)).finally(() => sequelize.close())"
```

Expected output: `Database connected`

---

## 4. Migration Testing

### 4.1 Check Current Migration Status

```powershell
pnpm run migrate:status
```

This displays all migrations and their execution status.

### 4.2 EAV-Related Migrations

The following migrations must be applied for EAV functionality:

| Migration File | Description |
|----------------|-------------|
| `20250701000000-create-eav-tables.js` | Creates core EAV tables: entity_types, attribute_definitions, attribute_values |
| `20250701000001-add-profile-eav-enabled-to-users.js` | Adds profileEavEnabled flag to users table |
| `20250701000002-add-eav-migration-flags.js` | Adds EAV migration flags to facilities, instructors, assessments |

### 4.3 Apply Pending Migrations

```powershell
pnpm run migrate:up
```

Expected output: List of executed migrations with "up" status.

### 4.4 Verify Migration Success

```powershell
pnpm run migrate:status
```

All migrations should show as executed.

### 4.5 Verify EAV Tables Created

```powershell
node -e "
const {sequelize} = require('./config/db');
async function check() {
  const tables = ['entity_types', 'attribute_definitions', 'attribute_values'];
  for (const table of tables) {
    const [result] = await sequelize.query(
      \`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '\${table}')\`
    );
    console.log(\`\${table}: \${result[0].exists ? 'EXISTS' : 'MISSING'}\`);
  }
  await sequelize.close();
}
check();
"
```

Expected output:
```
entity_types: EXISTS
attribute_definitions: EXISTS
attribute_values: EXISTS
```

---

## 5. EAV Setup Script Execution

Execute setup scripts in the following order:

### 5.1 User Profile EAV Setup

#### Preview Changes (Dry Run)

```powershell
node scripts/setup-user-profile-eav.js --dry-run --verbose
```

Review the output to see what entity types and attributes will be created.

#### Apply User Profile EAV Setup

```powershell
pnpm run eav:setup:user
```

#### Verify User Profile Setup

```powershell
node -e "
const {sequelize} = require('./config/db');
async function verify() {
  const [et] = await sequelize.query(
    \"SELECT COUNT(*) as count FROM entity_types WHERE name = 'User' AND \\\"deletedAt\\\" IS NULL\"
  );
  console.log('User entity type:', et[0].count > 0 ? 'CONFIGURED' : 'MISSING');
  
  const [attrs] = await sequelize.query(
    \"SELECT COUNT(*) as count FROM attribute_definitions ad JOIN entity_types et ON ad.\\\"entityTypeId\\\" = et.id WHERE et.name = 'User'\"
  );
  console.log('User attributes defined:', attrs[0].count);
  await sequelize.close();
}
verify();
"
```

### 5.2 Assessment Metadata EAV Setup

#### Preview Changes

```powershell
node scripts/setup-assessment-metadata-eav.js --dry-run
```

#### Apply Assessment Metadata Setup

```powershell
pnpm run eav:setup:assessment
```

#### Verify Assessment Setup

```powershell
node -e "
const {sequelize} = require('./config/db');
async function verify() {
  const [et] = await sequelize.query(
    \"SELECT COUNT(*) as count FROM entity_types WHERE name = 'Assessment' AND \\\"deletedAt\\\" IS NULL\"
  );
  console.log('Assessment entity type:', et[0].count > 0 ? 'CONFIGURED' : 'MISSING');
  
  const [attrs] = await sequelize.query(
    \"SELECT COUNT(*) as count FROM attribute_definitions ad JOIN entity_types et ON ad.\\\"entityTypeId\\\" = et.id WHERE et.name = 'Assessment'\"
  );
  console.log('Assessment attributes defined:', attrs[0].count);
  await sequelize.close();
}
verify();
"
```

### 5.3 Facility Equipment EAV Migration

#### Preview Changes

```powershell
node scripts/migrate-facility-equipment-to-eav.js --dry-run
```

#### Apply Facility Equipment Migration

```powershell
pnpm run eav:migrate:facility
```

#### Verify Facility Setup

```powershell
node -e "
const {sequelize} = require('./config/db');
async function verify() {
  const [et] = await sequelize.query(
    \"SELECT COUNT(*) as count FROM entity_types WHERE name = 'Facility' AND \\\"deletedAt\\\" IS NULL\"
  );
  console.log('Facility entity type:', et[0].count > 0 ? 'CONFIGURED' : 'MISSING');
  
  const [attrs] = await sequelize.query(
    \"SELECT COUNT(*) as count FROM attribute_definitions ad JOIN entity_types et ON ad.\\\"entityTypeId\\\" = et.id WHERE et.name = 'Facility'\"
  );
  console.log('Facility attributes defined:', attrs[0].count);
  await sequelize.close();
}
verify();
"
```

### 5.4 Instructor Awards EAV Migration

#### Preview Changes

```powershell
node scripts/migrate-instructor-awards-to-eav.js --dry-run
```

#### Apply Instructor Awards Migration

```powershell
pnpm run eav:migrate:instructor
```

#### Verify Instructor Setup

```powershell
node -e "
const {sequelize} = require('./config/db');
async function verify() {
  const [et] = await sequelize.query(
    \"SELECT COUNT(*) as count FROM entity_types WHERE name = 'Instructor' AND \\\"deletedAt\\\" IS NULL\"
  );
  console.log('Instructor entity type:', et[0].count > 0 ? 'CONFIGURED' : 'MISSING');
  
  const [attrs] = await sequelize.query(
    \"SELECT COUNT(*) as count FROM attribute_definitions ad JOIN entity_types et ON ad.\\\"entityTypeId\\\" = et.id WHERE et.name = 'Instructor'\"
  );
  console.log('Instructor attributes defined:', attrs[0].count);
  await sequelize.close();
}
verify();
"
```

---

## 6. Integration Test Execution

### 6.1 Run Complete EAV Integration Tests

```powershell
pnpm run test:eav
```

This runs the main EAV integration test suite that validates:
- Database connection
- EAV table existence
- Column structure
- Entity type configuration
- Attribute definitions
- Index presence
- Foreign key constraints
- Data integrity
- Service availability
- Migration flag columns

### 6.2 Run Quick Smoke Tests

For faster validation:

```powershell
pnpm run test:eav:quick
```

### 6.3 Run Verbose Tests

For detailed output:

```powershell
pnpm run test:eav:verbose
```

### 6.4 Run All EAV Tests

```powershell
pnpm run test:eav:all
```

This executes both schema validation and CRUD operation tests.

### 6.5 Run Pre-Production Test Suite

Complete test suite including migration status check:

```powershell
pnpm run test:pre-prod
```

---

## 7. Individual Module Testing

### 7.1 User Profile EAV Tests

```powershell
pnpm run test:eav:user
```

Tests covered:
- Profile attribute CRUD operations
- Bulk attribute operations
- Category filtering (common, student, instructor, parent, staff)
- Multi-role attribute support
- Value type handling (string, boolean, integer, JSON)

### 7.2 Assessment Metadata EAV Tests

```powershell
pnpm run test:eav:assessment
```

Tests covered:
- Assessment metadata CRUD
- Available attribute queries
- Grading rubric storage (JSON)
- Proctoring settings
- Difficulty level settings
- Estimated duration handling

### 7.3 Facility Equipment EAV Tests

```powershell
pnpm run test:eav:facility
```

Tests covered:
- Equipment CRUD operations
- Legacy data fallback mechanism
- Migration flag handling
- Equipment group management
- Condition and quantity tracking

---

## 8. CRUD Operation Validation

### 8.1 Run CRUD Tests

```powershell
pnpm run test:eav:crud
```

### 8.2 Manual CRUD Verification

#### Test User Profile CRUD

```powershell
node -e "
const service = require('./utils/userProfileEavService');
const {sequelize} = require('./config/db');

async function test() {
  // This requires an existing user ID - replace with actual ID
  const testUserId = 'YOUR_TEST_USER_ID';
  
  try {
    // Test set attribute
    const setResult = await service.setUserProfileAttribute(testUserId, 'common_preferred_name', 'TestName');
    console.log('Set attribute:', setResult.success ? 'PASS' : 'FAIL');
    
    // Test get profile
    const profile = await service.getUserProfile(testUserId);
    console.log('Get profile:', profile.success ? 'PASS' : 'FAIL');
    
    // Test delete attribute
    const delResult = await service.deleteUserProfileAttribute(testUserId, 'common_preferred_name');
    console.log('Delete attribute:', delResult.success ? 'PASS' : 'FAIL');
  } catch (error) {
    console.error('Test error:', error.message);
  }
  
  await sequelize.close();
}
test();
"
```

#### Test Assessment Metadata CRUD

```powershell
node -e "
const service = require('./utils/assessmentMetadataEavService');
const {sequelize} = require('./config/db');

async function test() {
  // This requires an existing assessment ID - replace with actual ID
  const testAssessmentId = 'YOUR_TEST_ASSESSMENT_ID';
  
  try {
    // Test get available attributes
    const attrs = await service.getAvailableMetadataAttributes();
    console.log('Get available attributes:', Array.isArray(attrs) ? 'PASS' : 'FAIL');
    console.log('  Attributes count:', attrs.length);
  } catch (error) {
    console.error('Test error:', error.message);
  }
  
  await sequelize.close();
}
test();
"
```

#### Test Facility Equipment CRUD

```powershell
node -e "
const service = require('./utils/facilityEquipmentEavService');
const {sequelize} = require('./config/db');

async function test() {
  // This requires an existing facility ID - replace with actual ID
  const testFacilityId = 'YOUR_TEST_FACILITY_ID';
  
  try {
    // Test get equipment
    const equipment = await service.getFacilityEquipment(testFacilityId);
    console.log('Get facility equipment:', Array.isArray(equipment) ? 'PASS' : 'FAIL');
    console.log('  Equipment count:', equipment.length);
  } catch (error) {
    console.error('Test error:', error.message);
  }
  
  await sequelize.close();
}
test();
"
```

---

## 9. Data Integrity Verification

### 9.1 Check for Orphaned Records

```powershell
node -e "
const {sequelize} = require('./config/db');

async function check() {
  // Check orphaned attribute values
  const [orphanedValues] = await sequelize.query(
    'SELECT COUNT(*) as count FROM attribute_values av LEFT JOIN attribute_definitions ad ON av.\"attributeId\" = ad.id WHERE ad.id IS NULL'
  );
  console.log('Orphaned attribute_values:', orphanedValues[0].count);
  
  // Check orphaned attribute definitions
  const [orphanedDefs] = await sequelize.query(
    'SELECT COUNT(*) as count FROM attribute_definitions ad LEFT JOIN entity_types et ON ad.\"entityTypeId\" = et.id WHERE et.id IS NULL'
  );
  console.log('Orphaned attribute_definitions:', orphanedDefs[0].count);
  
  // Check value type consistency
  try {
    const [inconsistent] = await sequelize.query(
      'SELECT COUNT(*) as count FROM attribute_values av JOIN attribute_definitions ad ON av.\"attributeId\" = ad.id WHERE av.\"valueType\"::text != ad.\"valueType\"::text'
    );
    console.log('Inconsistent value types:', inconsistent[0].count);
  } catch (e) {
    console.log('Value type check: Skipped (no data or enum mismatch)');
  }
  
  await sequelize.close();
}
check();
"
```

All counts should be `0` for a healthy database.

### 9.2 Verify Foreign Key Constraints

```powershell
node -e "
const {sequelize} = require('./config/db');

async function check() {
  const [fks] = await sequelize.query(\"
    SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('attribute_definitions', 'attribute_values')
  \");
  
  console.log('Foreign Key Constraints:');
  fks.forEach(fk => {
    console.log('  ' + fk.table_name + '.' + fk.column_name + ' -> ' + fk.foreign_table);
  });
  
  await sequelize.close();
}
check();
"
```

Expected constraints:
- `attribute_definitions.entityTypeId -> entity_types`
- `attribute_values.attributeId -> attribute_definitions`

### 9.3 Verify Migration Flags

```powershell
node -e "
const {sequelize} = require('./config/db');

async function check() {
  const columns = [
    {table: 'users', column: 'profileEavEnabled'},
    {table: 'facilities', column: 'equipmentEavMigrated'},
    {table: 'instructors', column: 'awardsEavMigrated'},
    {table: 'assessments', column: 'metadataEavEnabled'}
  ];
  
  for (const {table, column} of columns) {
    const [result] = await sequelize.query(
      \"SELECT COUNT(*) as count FROM information_schema.columns WHERE table_name = '\" + table + \"' AND column_name = '\" + column + \"'\"
    );
    console.log(table + '.' + column + ':', result[0].count > 0 ? 'EXISTS' : 'MISSING');
  }
  
  await sequelize.close();
}
check();
"
```

---

## 10. Performance Testing

### 10.1 Verify Index Usage

```powershell
node -e "
const {sequelize} = require('./config/db');

async function check() {
  // Get indexes on EAV tables
  const [indexes] = await sequelize.query(\"
    SELECT tablename, indexname 
    FROM pg_indexes 
    WHERE tablename IN ('entity_types', 'attribute_definitions', 'attribute_values')
    ORDER BY tablename, indexname
  \");
  
  console.log('EAV Table Indexes:');
  indexes.forEach(idx => {
    console.log('  ' + idx.tablename + ': ' + idx.indexname);
  });
  
  await sequelize.close();
}
check();
"
```

### 10.2 Query Plan Analysis

```powershell
node -e "
const {sequelize} = require('./config/db');

async function analyze() {
  // Analyze entity lookup query
  const [plan] = await sequelize.query(
    \"EXPLAIN (FORMAT TEXT) SELECT * FROM attribute_values WHERE \\\"entityType\\\" = 'User' AND \\\"entityId\\\" = '00000000-0000-0000-0000-000000000000'\"
  );
  
  console.log('Entity Lookup Query Plan:');
  plan.forEach(row => console.log('  ' + row['QUERY PLAN']));
  
  await sequelize.close();
}
analyze();
"
```

Look for "Index Scan" or "Index Only Scan" in the output for optimal performance.

---

## 11. Rollback Testing

### 11.1 Test Migration Rollback (Development Only)

WARNING: Only perform rollback testing in development environment.

```powershell
# Undo last migration
pnpm run migrate:undo

# Check status
pnpm run migrate:status

# Re-apply migration
pnpm run migrate:up
```

### 11.2 Full Reset (Development Only)

WARNING: This destroys all data.

```powershell
# Complete database reset
pnpm run db:reset

# Re-run all setup scripts
pnpm run eav:setup:user
pnpm run eav:setup:assessment
pnpm run eav:migrate:facility
pnpm run eav:migrate:instructor
```

---

## 12. Complete Test Summary

### 12.1 Execute Full Test Suite

Run all tests in sequence:

```powershell
cd "e:\Coding projects\UUMS\backend"

Write-Host "=== Starting Complete EAV Integration Tests ===" -ForegroundColor Cyan

# Step 1: Migration status
Write-Host "`n[1/6] Checking migration status..." -ForegroundColor Yellow
pnpm run migrate:status

# Step 2: EAV schema tests
Write-Host "`n[2/6] Running EAV schema validation tests..." -ForegroundColor Yellow
pnpm run test:eav

# Step 3: CRUD operation tests
Write-Host "`n[3/6] Running CRUD operation tests..." -ForegroundColor Yellow
pnpm run test:eav:crud

# Step 4: User profile tests
Write-Host "`n[4/6] Running User Profile EAV tests..." -ForegroundColor Yellow
pnpm run test:eav:user

# Step 5: Assessment metadata tests
Write-Host "`n[5/6] Running Assessment Metadata EAV tests..." -ForegroundColor Yellow
pnpm run test:eav:assessment

# Step 6: Facility equipment tests
Write-Host "`n[6/6] Running Facility Equipment EAV tests..." -ForegroundColor Yellow
pnpm run test:eav:facility

Write-Host "`n=== Complete EAV Integration Tests Finished ===" -ForegroundColor Cyan
```

### 12.2 Quick Test Command

For rapid validation:

```powershell
pnpm run test:pre-prod
```

### 12.3 Expected Test Results

| Test Suite | Expected Tests | Pass Criteria |
|------------|----------------|---------------|
| EAV Schema Validation | 25+ tests | All pass or skip with valid reason |
| CRUD Operations | 15+ tests | All pass |
| User Profile EAV | 10+ tests | All pass |
| Assessment Metadata | 10+ tests | All pass |
| Facility Equipment | 8+ tests | All pass |

### 12.4 Interpretation of Results

- **PASS (green)**: Test completed successfully
- **FAIL (red)**: Test failed - requires investigation
- **SKIP (yellow)**: Test skipped - usually due to missing setup (run relevant setup script)

---

## EAV Models Reference

| Entity Type | Service File | Setup Script | Test File |
|-------------|--------------|--------------|-----------|
| User | `userProfileEavService.js` | `setup-user-profile-eav.js` | `user-profile-eav.test.js` |
| Assessment | `assessmentMetadataEavService.js` | `setup-assessment-metadata-eav.js` | `assessment-metadata-eav.test.js` |
| Facility | `facilityEquipmentEavService.js` | `migrate-facility-equipment-to-eav.js` | `facility-equipment-eav.test.js` |
| Instructor | `instructorAwardsEavService.js` | `migrate-instructor-awards-to-eav.js` | `eav-crud.test.js` |

---

## Troubleshooting

### Database Connection Issues

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

Solution:
```powershell
# Check if PostgreSQL is running
docker ps | Select-String postgres

# Or start PostgreSQL container
docker-compose up -d postgres
```

### Missing Entity Type

```
Error: User entity type not configured - skipping
```

Solution:
```powershell
pnpm run eav:setup:user
```

### Migration Already Applied

```
Error: relation "entity_types" already exists
```

Solution:
```powershell
pnpm run migrate:status
# Check if migration is already applied
```

### Foreign Key Violation

```
Error: insert or update on table "attribute_values" violates foreign key constraint
```

Solution:
```powershell
# Ensure attribute definitions exist first
pnpm run eav:setup:assessment
```

---

## Production Deployment Checklist

Before deploying to production:

- [ ] All migrations applied successfully
- [ ] EAV setup scripts executed
- [ ] `pnpm run test:eav` passes
- [ ] `pnpm run test:eav:crud` passes
- [ ] No orphaned records found
- [ ] Foreign key constraints verified
- [ ] Indexes present on EAV tables
- [ ] Database backup created
- [ ] Rollback plan documented

---

Document Version: 1.0
Last Updated: December 26, 2025
