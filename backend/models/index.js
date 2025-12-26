const { sequelize } = require('../config/db');
const User = require('./userModel');
const Role = require('./roleModel');
const UserRole = require('./userRoleModel');
const Department = require('./departmentModel');
const Course = require('./courseModel');
const Instructor = require('./instructorModel');
const CourseInstructor = require('./courseInstructorModel');
const Prerequisite = require('./prerequisiteModel');
const Enrollment = require('./enrollmentModel');
const GradeAppeal = require('./gradeAppealModel');
const GradeAuditLog = require('./gradeAuditLogModel');
const Assessment = require('./assessmentModel');

const AssessmentSubmission = require('./assessmentSubmissionModel');
const Announcement = require('./announcementModel');
const UniversityAnnouncement = require('./universityAnnouncementModel');
const ElectiveRequest = require('./electiveRequestModel');
const Material = require('./materialModel');
const Facility = require('./facilityModel');
const MaintenanceRequest = require('./maintenanceRequestModel');
const Booking = require('./bookingModel');
const AdmissionApplication = require('./admissionApplicationModel');
const StudentDocument = require('./studentDocumentModel');
const Asset = require('./assetModel');
const AssetAllocationLog = require('./assetAllocationLogModel');
const LicenseAssignment = require('./licenseAssignmentModel');
const Compensation = require('./compensationModel');
const LeaveRequest = require('./leaveRequestModel');
const CompensationAuditLog = require('./compensationAuditLogModel');
const DirectMessage = require('./directMessageModel');
const ParentStudent = require('./parentStudentModel');
const CourseTAAssignment = require('./courseTAAssignmentModel');
const StaffBenefits = require('./staffBenefitsModel');
const BenefitsAuditLog = require('./benefitsAuditLogModel');
const MeetingRequest = require('./meetingRequestModel');
const Payslip = require('./payslipModel');
const StudentFeedback = require('./studentFeedbackModel');
const ProfessionalDevelopment = require('./professionalDevelopmentModel');
const ResearchPublication = require('./researchPublicationModel');

// ===== EAV (Entity-Attribute-Value) Models =====
const EntityType = require('./entityTypeModel');
const AttributeDefinition = require('./attributeDefinitionModel');
const AttributeValue = require('./attributeValueModel');

// ===== Parent & Student Associations =====
User.belongsToMany(User, {
  through: ParentStudent,
  as: 'children',
  foreignKey: 'parentId',
  otherKey: 'studentId'
});
User.belongsToMany(User, {
  through: ParentStudent,
  as: 'parents',
  foreignKey: 'studentId',
  otherKey: 'parentId'
});


// ===== User & Role Associations =====
// Multi-role architecture: Users can have multiple roles through UserRole join table
// NOTE: The direct User.belongsTo(Role) and Role.hasMany(User) via roleId have been removed
// All role assignments now go through the many-to-many relationship

// Many-to-many relationship for multiple roles (PRIMARY relationship)
User.belongsToMany(Role, {
  through: UserRole,
  foreignKey: 'userId',
  otherKey: 'roleId',
  as: 'roles'
});
Role.belongsToMany(User, {
  through: UserRole,
  foreignKey: 'roleId',
  otherKey: 'userId',
  as: 'users'
});

// Direct access to UserRole for querying
User.hasMany(UserRole, { foreignKey: 'userId', as: 'userRoles' });
UserRole.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Role.hasMany(UserRole, { foreignKey: 'roleId', as: 'roleUsers' });
UserRole.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

User.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });
User.hasMany(User, { foreignKey: 'createdById', as: 'createdUsers' });

// ===== Department Associations =====
Department.hasMany(Course, { foreignKey: 'departmentId', as: 'courses' });
Course.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

Department.hasMany(Instructor, { foreignKey: 'departmentId', as: 'instructors' });
Instructor.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// ===== Instructor & User Associations =====
User.hasOne(Instructor, { foreignKey: 'userId', as: 'instructorProfile' });
Instructor.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ===== Course & Instructor (Many-to-Many) =====
Course.belongsToMany(Instructor, {
  through: CourseInstructor,
  foreignKey: 'courseId',
  otherKey: 'instructorId',
  as: 'instructors'
});
Instructor.belongsToMany(Course, {
  through: CourseInstructor,
  foreignKey: 'instructorId',
  otherKey: 'courseId',
  as: 'courses'
});

// ===== Course Prerequisites (Self-referencing Many-to-Many) =====
Course.belongsToMany(Course, {
  through: Prerequisite,
  as: 'prerequisites',
  foreignKey: 'courseId',
  otherKey: 'prerequisiteId'
});
Course.belongsToMany(Course, {
  through: Prerequisite,
  as: 'dependentCourses',
  foreignKey: 'prerequisiteId',
  otherKey: 'courseId'
});

// ===== Enrollment Associations =====
User.hasMany(Enrollment, { foreignKey: 'userId', as: 'enrollments' });
Enrollment.belongsTo(User, { foreignKey: 'userId', as: 'student' });

Course.hasMany(Enrollment, { foreignKey: 'courseId', as: 'enrollments' });
Enrollment.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

// ===== Grade Appeal Associations =====
Enrollment.hasMany(GradeAppeal, { foreignKey: 'enrollmentId', as: 'appeals' });
GradeAppeal.belongsTo(Enrollment, { foreignKey: 'enrollmentId', as: 'enrollment' });

User.hasMany(GradeAppeal, { foreignKey: 'studentId', as: 'gradeAppeals' });
GradeAppeal.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

GradeAppeal.belongsTo(User, { foreignKey: 'resolvedById', as: 'resolvedBy' });

GradeAppeal.belongsTo(AssessmentSubmission, { foreignKey: 'submissionId', as: 'submission' });
AssessmentSubmission.hasMany(GradeAppeal, { foreignKey: 'submissionId', as: 'appeals' });

// ===== Grade Audit Log Associations =====
Enrollment.hasMany(GradeAuditLog, { foreignKey: 'enrollmentId', as: 'auditLogs' });
GradeAuditLog.belongsTo(Enrollment, { foreignKey: 'enrollmentId', as: 'enrollment' });

GradeAuditLog.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
GradeAuditLog.belongsTo(User, { foreignKey: 'advisorId', as: 'advisor' });
GradeAuditLog.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

// ===== Assessment Associations =====
Course.hasMany(Assessment, { foreignKey: 'courseId', as: 'assessments' });
Assessment.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

Assessment.hasMany(AssessmentSubmission, { foreignKey: 'assessmentId', as: 'submissions' });
AssessmentSubmission.belongsTo(Assessment, { foreignKey: 'assessmentId', as: 'assessment' });

User.hasMany(AssessmentSubmission, { foreignKey: 'studentId', as: 'assessmentSubmissions' });

AssessmentSubmission.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

// ===== Announcement Associations =====
Course.hasMany(Announcement, { foreignKey: 'courseId', as: 'announcements' });
Announcement.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

Instructor.hasMany(Announcement, { foreignKey: 'instructorId', as: 'announcements' });
Announcement.belongsTo(Instructor, { foreignKey: 'instructorId', as: 'instructor' });

// ===== University Announcement Associations =====
User.hasMany(UniversityAnnouncement, { foreignKey: 'createdById', as: 'universityAnnouncements' });
UniversityAnnouncement.belongsTo(User, { foreignKey: 'createdById', as: 'creator' });

// ===== Elective Request Associations =====
User.hasMany(ElectiveRequest, { foreignKey: 'studentId', as: 'electiveRequests' });
ElectiveRequest.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

Course.hasMany(ElectiveRequest, { foreignKey: 'courseId', as: 'electiveRequests' });
ElectiveRequest.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

User.hasMany(ElectiveRequest, { foreignKey: 'advisorId', as: 'reviewedRequests' });
ElectiveRequest.belongsTo(User, { foreignKey: 'advisorId', as: 'advisor' });

// ===== User & Advisor Association (Self-referencing) =====
User.belongsTo(User, { foreignKey: 'advisorId', as: 'advisor' });
User.hasMany(User, { foreignKey: 'advisorId', as: 'advisees' });

// ===== Material Associations =====
Course.hasMany(Material, { foreignKey: 'courseId', as: 'materials' });
Material.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

// ===== Maintenance Request Associations =====
Facility.hasMany(MaintenanceRequest, { foreignKey: 'facilityId', as: 'maintenanceRequests' });
MaintenanceRequest.belongsTo(Facility, { foreignKey: 'facilityId' });

User.hasMany(MaintenanceRequest, { foreignKey: 'reportedById', as: 'reportedMaintenanceRequests' });
MaintenanceRequest.belongsTo(User, { foreignKey: 'reportedById', as: 'reportedBy' });
// ===== Booking Associations =====
Facility.hasMany(Booking, { foreignKey: 'facilityId', as: 'bookings' });
Booking.belongsTo(Facility, { foreignKey: 'facilityId', as: 'facility' });

Course.hasMany(Booking, { foreignKey: 'courseId', as: 'bookings' });
Booking.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

User.hasMany(Booking, { foreignKey: 'bookedById', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'bookedById', as: 'bookedBy' });

// ===== Student Document Associations =====
User.hasMany(StudentDocument, { foreignKey: 'studentId', as: 'documents' });
StudentDocument.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

User.hasMany(StudentDocument, { foreignKey: 'uploadedById', as: 'uploadedDocuments' });
StudentDocument.belongsTo(User, { foreignKey: 'uploadedById', as: 'uploader' });

// ===== Asset Associations =====
Asset.belongsTo(User, { foreignKey: 'currentHolderId', as: 'currentHolder' });
User.hasMany(Asset, { foreignKey: 'currentHolderId', as: 'heldAssets' });
Asset.belongsTo(Department, { foreignKey: 'assignedToDepartmentId', as: 'assignedDepartment' });
Department.hasMany(Asset, { foreignKey: 'assignedToDepartmentId', as: 'departmentAssets' });

// ===== Asset Allocation Log Associations =====
Asset.hasMany(AssetAllocationLog, { foreignKey: 'assetId', as: 'allocationHistory' });
AssetAllocationLog.belongsTo(Asset, { foreignKey: 'assetId', as: 'asset' });

AssetAllocationLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
AssetAllocationLog.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
AssetAllocationLog.belongsTo(User, { foreignKey: 'performedById', as: 'performedBy' });

// ===== Compensation Associations =====
User.hasOne(Compensation, { foreignKey: 'userId', as: 'compensation' });
Compensation.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Compensation.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Compensation, { foreignKey: 'userId' });

// ===== Leave Request Associations =====
User.hasMany(LeaveRequest, { foreignKey: 'userId', as: 'leaveRequests' });
LeaveRequest.belongsTo(User, { foreignKey: 'userId', as: 'user' });

LeaveRequest.belongsTo(User, { foreignKey: 'reviewedById', as: 'reviewedBy' });

// ===== Compensation Audit Log Associations =====
Compensation.hasMany(CompensationAuditLog, { foreignKey: 'compensationId' });
CompensationAuditLog.belongsTo(Compensation, { foreignKey: 'compensationId' });

CompensationAuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
CompensationAuditLog.belongsTo(User, { foreignKey: 'changedById', as: 'changedBy' });

// ===== Direct Message Associations =====
User.hasMany(DirectMessage, { foreignKey: 'senderId', as: 'sentMessages' });
DirectMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

User.hasMany(DirectMessage, { foreignKey: 'recipientId', as: 'receivedMessages' });
DirectMessage.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });

// ===== Course TA Assignment Associations =====
Course.hasMany(CourseTAAssignment, { foreignKey: 'courseId', as: 'taAssignments' });
CourseTAAssignment.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

Instructor.hasMany(CourseTAAssignment, { foreignKey: 'instructorId', as: 'taAssignments' });
CourseTAAssignment.belongsTo(Instructor, { foreignKey: 'instructorId', as: 'instructor' });

User.hasMany(CourseTAAssignment, { foreignKey: 'taUserId', as: 'taAssignments' });
CourseTAAssignment.belongsTo(User, { foreignKey: 'taUserId', as: 'taUser' });
// ===== License Assignment Associations =====
Asset.hasMany(LicenseAssignment, { foreignKey: 'assetId', as: 'licenses' });
LicenseAssignment.belongsTo(Asset, { foreignKey: 'assetId', as: 'asset' });

User.hasMany(LicenseAssignment, { foreignKey: 'userId', as: 'assignedLicenses' });
LicenseAssignment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Department.hasMany(LicenseAssignment, { foreignKey: 'departmentId', as: 'departmentLicenses' });
LicenseAssignment.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// ===== Staff Benefits Associations =====
User.hasOne(StaffBenefits, { foreignKey: 'userId', as: 'benefits' });
StaffBenefits.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ===== Benefits Audit Log Associations =====
StaffBenefits.hasMany(BenefitsAuditLog, { foreignKey: 'benefitsId', as: 'auditLogs' });
BenefitsAuditLog.belongsTo(StaffBenefits, { foreignKey: 'benefitsId', as: 'benefits' });

BenefitsAuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
BenefitsAuditLog.belongsTo(User, { foreignKey: 'changedById', as: 'changedBy' });
// ===== Meeting Request Associations =====
User.hasMany(MeetingRequest, { foreignKey: 'studentId', as: 'requestedMeetings' });
MeetingRequest.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

User.hasMany(MeetingRequest, { foreignKey: 'professorId', as: 'receivedMeetingRequests' });
MeetingRequest.belongsTo(User, { foreignKey: 'professorId', as: 'professor' });

// ===== Payslip Associations =====
User.hasMany(Payslip, { foreignKey: 'userId', as: 'payslips' });
Payslip.belongsTo(User, { foreignKey: 'userId', as: 'user' });
// ===== Student Feedback Associations =====
Course.hasMany(StudentFeedback, { foreignKey: 'courseId', as: 'feedback' });
StudentFeedback.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

User.hasMany(StudentFeedback, { foreignKey: 'targetUserId', as: 'receivedFeedback' });
StudentFeedback.belongsTo(User, { foreignKey: 'targetUserId', as: 'targetUser' });

// ===== Professional Development Associations =====
User.hasMany(ProfessionalDevelopment, { foreignKey: 'userId', as: 'professionalDevelopment' });
ProfessionalDevelopment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ===== Research Publication Associations =====
User.hasMany(ResearchPublication, { foreignKey: 'userId', as: 'researchPublications' });
ResearchPublication.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ===== EAV (Entity-Attribute-Value) Associations =====
EntityType.hasMany(AttributeDefinition, { foreignKey: 'entityTypeId', as: 'attributes' });
AttributeDefinition.belongsTo(EntityType, { foreignKey: 'entityTypeId', as: 'entityType' });

AttributeDefinition.hasMany(AttributeValue, { foreignKey: 'attributeId', as: 'values' });
AttributeValue.belongsTo(AttributeDefinition, { foreignKey: 'attributeId', as: 'attribute' });

module.exports = {
  sequelize,
  User,
  Role,
  UserRole,
  Department,
  Course,
  Instructor,
  CourseInstructor,
  Prerequisite,
  Enrollment,
  GradeAppeal,
  GradeAuditLog,
  Assessment,
  AssessmentSubmission,
  Announcement,
  UniversityAnnouncement,
  ElectiveRequest,
  Material,
  Facility,
  MaintenanceRequest,
  Booking,
  AdmissionApplication,
  StudentDocument,
  Asset,
  AssetAllocationLog,
  LicenseAssignment,
  Compensation,
  LeaveRequest,
  CompensationAuditLog,
  DirectMessage,
  ParentStudent,
  CourseTAAssignment,
  StaffBenefits,
  BenefitsAuditLog,
  MeetingRequest,
  Payslip,
  StudentFeedback,
  ProfessionalDevelopment,
  ResearchPublication,
  EntityType,
  AttributeDefinition,
  AttributeValue,
};
