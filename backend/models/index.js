const { sequelize } = require('../config/db');
const User = require('./userModel');
const Role = require('./roleModel');
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
const ElectiveRequest = require('./electiveRequestModel');
const Material = require('./materialModel');
const Facility = require('./facilityModel');
const Booking = require('./bookingModel');
const AdmissionApplication = require('./admissionApplicationModel');
const StudentDocument = require('./studentDocumentModel');

// ===== User & Role Associations =====
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });

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

module.exports = {
  sequelize,
  User,
  Role,
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
  ElectiveRequest,
  Material,
  Facility,
  Booking,
  AdmissionApplication,
  StudentDocument,
};
