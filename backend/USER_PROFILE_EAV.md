# User Profile EAV Migration Documentation

## Overview

This document describes the Entity-Attribute-Value (EAV) pattern implementation for extensible user profiles in the UUMS system. The EAV pattern allows storing dynamic attributes for different user types (Student, Instructor, Parent, Staff) without requiring schema changes.

## Architecture

### EAV Tables

The implementation uses the existing EAV infrastructure:

```
┌─────────────────┐     ┌──────────────────────┐     ┌───────────────────┐
│   entity_types  │────▶│ attribute_definitions│────▶│  attribute_values │
└─────────────────┘     └──────────────────────┘     └───────────────────┘
        │                         │                           │
        │                         │                           │
        ▼                         ▼                           ▼
   name: 'User'          name: 'student_major'      entityId: <user_id>
   tableName: 'users'    displayName: 'Major'       entityType: 'User'
                         valueType: 'string'         value: 'Computer Science'
```

### Attribute Categories

Attributes are organized by category using naming prefixes:

| Category    | Prefix        | Example                    |
|-------------|---------------|----------------------------|
| Common      | `common_`     | `common_preferred_name`    |
| Student     | `student_`    | `student_major`            |
| Instructor  | `instructor_` | `instructor_academic_rank` |
| Parent      | `parent_`     | `parent_relationship_type` |
| Staff       | `staff_`      | `staff_employee_id`        |

## Files Created/Modified

### New Files

| File | Purpose |
|------|---------|
| [utils/userProfileEavService.js](utils/userProfileEavService.js) | Main EAV service for user profiles |
| [scripts/setup-user-profile-eav.js](scripts/setup-user-profile-eav.js) | Setup script for entity type and attributes |
| [migrations/20250701000001-add-profile-eav-enabled-to-users.js](migrations/20250701000001-add-profile-eav-enabled-to-users.js) | Sequelize CLI migration |
| [tests/user-profile-eav.test.js](tests/user-profile-eav.test.js) | Integration tests |

### Modified Files

| File | Changes |
|------|---------|
| [models/userModel.js](models/userModel.js) | Added `profileEavEnabled` field |
| [controllers/userController.js](controllers/userController.js) | Added profile CRUD endpoints |
| [routes/userRoutes.js](routes/userRoutes.js) | Added profile routes |

## Setup Instructions

### Step 1: Run Sequelize Migration

```bash
# Navigate to backend directory
cd backend

# Run the migration to add profileEavEnabled column
npx sequelize-cli db:migrate
```

### Step 2: Run EAV Setup Script

```bash
# Dry run first to preview changes
node scripts/setup-user-profile-eav.js --dry-run --verbose

# Run actual setup
node scripts/setup-user-profile-eav.js
```

### Step 3: Run Tests

```bash
# Run integration tests
npm test -- --grep "User Profile EAV"
```

## API Endpoints

### Get Available Attribute Definitions

```http
GET /api/users/profile/attributes?category=student
```

Returns all available profile attributes, optionally filtered by category.

**Response:**
```json
{
  "category": "student",
  "attributes": [
    {
      "name": "student_major",
      "displayName": "Major",
      "valueType": "string",
      "isRequired": false
    }
  ],
  "count": 15
}
```

### Get User Profile

```http
GET /api/users/:id/profile?category=student
```

Returns all profile attributes for a user, optionally filtered by category.

**Response:**
```json
{
  "userId": "uuid",
  "profileEavEnabled": true,
  "category": "all",
  "attributes": {
    "commonPreferredName": "Johnny",
    "studentMajor": "Computer Science",
    "studentGpa": "3.85"
  }
}
```

### Update Profile (Bulk)

```http
PUT /api/users/:id/profile
Content-Type: application/json

{
  "student_major": "Computer Science",
  "student_gpa": "3.85",
  "common_pronouns": "he/him"
}
```

**Response:**
```json
{
  "message": "Profile updated successfully",
  "userId": "uuid",
  "processedCount": 3,
  "results": [...]
}
```

### Set Single Attribute

```http
PUT /api/users/:id/profile/student_major
Content-Type: application/json

{
  "value": "Computer Science"
}
```

### Delete Attribute

```http
DELETE /api/users/:id/profile/student_major
```

### Initialize Profile for Role

```http
POST /api/users/:id/profile/initialize
Content-Type: application/json

{
  "role": "student"
}
```

Sets up default attributes for a specific role.

### Enable/Disable EAV

```http
PUT /api/users/:id/profile/eav-status
Content-Type: application/json

{
  "enabled": true
}
```

## Attribute Definitions

### Common Attributes (All Users)

| Attribute | Display Name | Type | Description |
|-----------|-------------|------|-------------|
| `common_preferred_name` | Preferred Name | string | Name user prefers to be called |
| `common_pronouns` | Pronouns | string | e.g., he/him, she/her, they/them |
| `common_phone_number` | Phone Number | string | Primary contact number |
| `common_secondary_email` | Secondary Email | string | Alternative email |
| `common_address_street` | Street Address | string | Street address |
| `common_address_city` | City | string | City name |
| `common_address_state` | State/Province | string | State or province |
| `common_address_postal_code` | Postal Code | string | ZIP/postal code |
| `common_address_country` | Country | string | Country |
| `common_date_of_birth` | Date of Birth | date | Birth date |
| `common_nationality` | Nationality | string | Nationality |
| `common_profile_picture_url` | Profile Picture URL | string | Profile image URL |
| `common_bio` | Biography | text | Short bio |
| `common_linkedin_profile` | LinkedIn Profile | string | LinkedIn URL |

### Student Attributes

| Attribute | Display Name | Type | Description |
|-----------|-------------|------|-------------|
| `student_id` | Student ID | string | Official student ID number |
| `student_major` | Major | string | Primary field of study |
| `student_minor` | Minor | string | Secondary field of study |
| `student_gpa` | GPA | decimal | Current GPA (0-4.0) |
| `student_expected_graduation_year` | Expected Graduation Year | integer | Year of expected graduation |
| `student_enrollment_date` | Enrollment Date | date | Initial enrollment date |
| `student_classification` | Classification | string | Freshman/Sophomore/Junior/Senior/Graduate/PhD |
| `student_enrollment_status` | Enrollment Status | string | Full-time/Part-time/Leave of Absence/Withdrawn |
| `student_emergency_contact_name` | Emergency Contact Name | string | Name of emergency contact |
| `student_emergency_contact_phone` | Emergency Contact Phone | string | Phone of emergency contact |
| `student_emergency_contact_relationship` | Emergency Contact Relationship | string | Relationship to contact |
| `student_housing_status` | Housing Status | string | On-campus/Off-campus/Commuter |
| `student_meal_plan` | Meal Plan | string | Current meal plan |
| `student_financial_aid_status` | Financial Aid Status | string | Financial aid eligibility |
| `student_academic_standing` | Academic Standing | string | Good Standing/Probation/Warning/Dean's List |

### Instructor Attributes

| Attribute | Display Name | Type | Description |
|-----------|-------------|------|-------------|
| `instructor_research_interests` | Research Interests | json | Array of research areas |
| `instructor_academic_rank` | Academic Rank | string | Adjunct/Lecturer/Assistant/Associate/Professor/Distinguished/Emeritus |
| `instructor_tenure_status` | Tenure Status | string | Non-tenure Track/Tenure Track/Tenured |
| `instructor_phone_extension` | Phone Extension | string | Office phone extension |
| `instructor_fax` | Fax Number | string | Office fax number |
| `instructor_personal_website` | Personal Website | string | Academic website URL |
| `instructor_office_hours_details` | Office Hours Details | json | Detailed office hours schedule |
| `instructor_publications` | Publications | json | List of publications |
| `instructor_education` | Education | json | Educational background |
| `instructor_courses_taught` | Courses Taught | json | Typical courses taught |
| `instructor_cv_url` | CV URL | string | URL to CV document |
| `instructor_google_scholar_id` | Google Scholar ID | string | Google Scholar profile ID |
| `instructor_orcid` | ORCID | string | ORCID identifier |
| `instructor_expertise_keywords` | Expertise Keywords | json | Keywords for expertise areas |

### Parent Attributes

| Attribute | Display Name | Type | Description |
|-----------|-------------|------|-------------|
| `parent_relationship_type` | Relationship Type | string | Mother/Father/Guardian/etc. |
| `parent_primary_contact` | Primary Contact | boolean | Is primary contact |
| `parent_occupation` | Occupation | string | Occupation/profession |
| `parent_employer` | Employer | string | Current employer |
| `parent_home_phone` | Home Phone | string | Home phone number |
| `parent_work_phone` | Work Phone | string | Work phone number |
| `parent_mobile_phone` | Mobile Phone | string | Mobile phone number |
| `parent_preferred_contact_method` | Preferred Contact Method | string | Email/Phone/Text/Mail |
| `parent_best_contact_time` | Best Contact Time | string | Best time to reach |
| `parent_emergency_authorized` | Emergency Authorized | boolean | Authorized for emergencies |
| `parent_pickup_authorized` | Pickup Authorized | boolean | Authorized to pick up student |
| `parent_financial_responsible` | Financially Responsible | boolean | Financially responsible party |
| `parent_student_ids` | Student IDs | json | Associated student IDs |

### Staff Attributes

| Attribute | Display Name | Type | Description |
|-----------|-------------|------|-------------|
| `staff_employee_id` | Employee ID | string | Official employee ID |
| `staff_position_title` | Position Title | string | Official job title |
| `staff_department` | Department | string | Department/unit name |
| `staff_hire_date` | Hire Date | date | Date of hire |
| `staff_employment_type` | Employment Type | string | Full-time/Part-time/Contract/Temporary/Intern |
| `staff_manager_id` | Manager ID | string | User ID of manager |
| `staff_office_number` | Office Number | string | Office room number |
| `staff_office_building` | Office Building | string | Building name |
| `staff_phone_extension` | Phone Extension | string | Office phone extension |
| `staff_work_schedule` | Work Schedule | json | Typical work schedule |
| `staff_skills` | Skills | json | Professional skills |
| `staff_certifications` | Certifications | json | Professional certifications |
| `staff_emergency_contact_name` | Emergency Contact Name | string | Emergency contact name |
| `staff_emergency_contact_phone` | Emergency Contact Phone | string | Emergency contact phone |
| `staff_employment_status` | Employment Status | string | Active/On Leave/Suspended/Terminated |

## Usage Examples

### Creating a Student Profile

```javascript
const UserProfileEavService = require('./utils/userProfileEavService');

// Initialize profile for student role
await UserProfileEavService.initializeProfileForRole(userId, 'student');

// Set student-specific attributes
await UserProfileEavService.bulkSetUserProfile(userId, {
  student_id: 'STU-2024-0001',
  student_major: 'Computer Science',
  student_minor: 'Mathematics',
  student_gpa: '3.85',
  student_classification: 'Junior',
  common_preferred_name: 'Alex',
  common_pronouns: 'they/them',
});
```

### Getting Profile by Category

```javascript
// Get only student attributes
const studentProfile = await UserProfileEavService.getUserProfileByCategory(
  userId,
  'student'
);

// Get full profile
const fullProfile = await UserProfileEavService.getUserProfile(userId);
```

### Handling JSON Attributes

```javascript
// Setting JSON attribute
const researchInterests = ['Machine Learning', 'NLP', 'Computer Vision'];
await UserProfileEavService.setUserProfileAttribute(
  userId,
  'instructor_research_interests',
  JSON.stringify(researchInterests)
);

// Reading JSON attribute
const profile = await UserProfileEavService.getUserProfile(userId);
const interests = JSON.parse(profile.data.instructorResearchInterests);
```

## Migration from Legacy Fields

If you have existing profile data in other tables (e.g., a separate `students` or `instructors` table), you can create a migration script:

```javascript
// Example migration script
const migrateStudentData = async () => {
  const students = await sequelize.query('SELECT * FROM students');
  
  for (const student of students) {
    await UserProfileEavService.bulkSetUserProfile(student.userId, {
      student_id: student.studentNumber,
      student_major: student.major,
      student_gpa: student.gpa?.toString(),
      // ... map other fields
    });
    
    await UserProfileEavService.enableProfileEav(student.userId);
  }
};
```

## Rollback

To rollback the EAV setup:

```bash
# Rollback attribute definitions (soft delete)
node scripts/setup-user-profile-eav.js --rollback

# Rollback Sequelize migration
npx sequelize-cli db:migrate:undo
```

## Best Practices

1. **Use Categories**: Always prefix attributes with their category (common_, student_, etc.)
2. **JSON for Complex Data**: Use JSON type for arrays and nested objects
3. **Validate on Application Layer**: Add validation in controllers before saving
4. **Enable Flag**: Set `profileEavEnabled = true` when user has EAV data
5. **Transaction Safety**: Use transactions for bulk operations
6. **Soft Delete**: Always soft delete instead of hard delete

## Troubleshooting

### Common Issues

1. **Attribute not found**: Run the setup script to create attribute definitions
2. **Entity type missing**: Ensure setup script completed successfully
3. **Migration failed**: Check database connectivity and Sequelize CLI configuration

### Debug Commands

```bash
# Check entity type
psql -c "SELECT * FROM entity_types WHERE name = 'User'"

# Check attribute definitions
psql -c "SELECT name, \"valueType\" FROM attribute_definitions WHERE \"entityTypeId\" = '<entity_type_id>'"

# Check attribute values for a user
psql -c "SELECT * FROM attribute_values WHERE \"entityId\" = '<user_id>' AND \"entityType\" = 'User'"
```
