# Database Migration Implementation Plan

## Overview
Replace `sequelize.sync({ alter: true })` with Sequelize CLI migrations for better database version control and production safety.

## Current State
- Using `sequelize.sync({ alter: true })` in `server.js` line 98
- 42 model files in `backend/models/`
- PostgreSQL database
- No formal migration system in place

## Implementation Steps

### 1. Install Sequelize CLI
```bash
cd backend
pnpm install --save-dev sequelize-cli
```

### 2. Initialize Sequelize CLI
This will create:
- `config/config.json` - Database configuration
- `migrations/` - Migration files directory
- `seeders/` - Seeder files directory

### 3. Configure Sequelize CLI
- Create `.sequelizerc` to define custom paths
- Update `config/config.json` with database credentials from `.env`
- Keep existing `config/db.js` for application use

### 4. Generate Baseline Migration
Create an initial migration that captures the current schema by:
- Running a script to dump current database schema
- Creating a baseline migration file with all existing tables
- This becomes migration "zero state"

### 5. Update server.js
- Remove `sequelize.sync({ alter: true })`
- Add environment check for production
- Keep sync for development with explicit flag

### 6. Create Migration Scripts
Add npm scripts for:
- `migrate:up` - Run pending migrations
- `migrate:undo` - Rollback last migration
- `migrate:status` - Check migration status
- `migrate:create` - Create new migration

### 7. Documentation
- Document migration workflow
- Add migration creation guidelines
- Update deployment procedures

## Models to Migrate (42 total)
1. User
2. Role
3. UserRole
4. Department
5. Course
6. Instructor
7. CourseInstructor
8. Prerequisite
9. Enrollment
10. GradeAppeal
11. GradeAuditLog
12. Assessment
13. AssessmentSubmission
14. Announcement
15. UniversityAnnouncement
16. ElectiveRequest
17. Material
18. Facility
19. MaintenanceRequest
20. Booking
21. AdmissionApplication
22. StudentDocument
23. Asset
24. AssetAllocationLog
25. LicenseAssignment
26. Compensation
27. LeaveRequest
28. CompensationAuditLog
29. DirectMessage
30. ParentStudent
31. CourseTAAssignment
32. StaffBenefits
33. BenefitsAuditLog
34. MeetingRequest
35. Payslip
36. StudentFeedback
37. ProfessionalDevelopment
38. ResearchPublication
39. EntityType
40. AttributeDefinition
41. AttributeValue
42. (Any custom tables)

## Benefits
- Version control for database schema
- Safer production deployments
- Rollback capability
- Team collaboration on schema changes
- Clear audit trail of schema modifications

## Risks & Mitigation
- **Risk**: Baseline migration might miss some constraints
  - *Mitigation*: Test thoroughly in development first
- **Risk**: Production data could be affected
  - *Mitigation*: Disable auto-sync in production, backup before first migration
- **Risk**: Team confusion during transition
  - *Mitigation*: Clear documentation and training
