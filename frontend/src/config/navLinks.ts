export type NavLink = {
  href: string;
  label: string;
};

/**
 * Admin Navbar
 * Focused on high-level management of the university's core systems.
 * Links correspond to managing the backend of each module.
 */
export const ADMIN_LINKS: NavLink[] = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/facilities", label: "Facilities Management" },
  { href: "/admin/maintenance", label: "Maintenance Requests" },
  { href: "/admin/calendar", label: "Facility Calendar" },
  { href: "/admin/curriculum", label: "Curriculum Management" },
  { href: "/admin/instructors", label: "Instructor Assignment" },
  { href: "/admin/students", label: "Student Management" },
  { href: "/admin/staff", label: "Staff Management" },
  { href: "/admin/admissions", label: "Admission Management" },
  { href: "/admin/assets", label: "Asset Management" },
  { href: "/admin/users", label: "User Management" },
  { href: "/admin/communications", label: "Communications" },
  { href: "/admin/reports", label: "System Reports" },
];

/**
 * Instructor Navbar
 * This navbar is for an instructor member, likely a professor.
 * It's focused on tasks related to teaching, student management, and communication.
 */
export const INSTRUCTOR_LINKS: NavLink[] = [
  { href: "/instructor/dashboard", label: "Dashboard" },
  { href: "/instructor/announcements", label: "Announcements" },
  { href: "/instructor/grades", label: "Grade Management" },
  { href: "/instructor/my-courses", label: "My Courses" },
  { href: "/instructor/my-students", label: "My Students" },
  { href: "/instructor/calendar", label: "Calendar & Events" },
  { href: "/instructor/messages", label: "Messages" },
  { href: "/instructor/maintenance", label: "Maintenance" },
];

/**
 * Student Navbar
 * Tailored specifically to the student's needs, providing access to
 * academic information, campus resources, and community features.
 */
export const STUDENT_LINKS: NavLink[] = [
  { href: "/student/dashboard", label: "Dashboard" },
  { href: "/student/catalog", label: "Browse Catalog" },
  { href: "/student/academics", label: "Academics" },
  { href: "/student/registration", label: "Course Registration" },
  { href: "/student/community", label: "Community Hub" },
  { href: "/student/questions", label: "Questions" },
  { href: "/student/directory", label: "Faculty Directory" },
  { href: "/student/messages", label: "Messages" },
];

/**
 * HR Navbar
 * Focused on HR functions like compensation management and leave requests.
 */
export const HR_LINKS: NavLink[] = [
  { href: "/hr/dashboard", label: "Dashboard" },
  { href: "/hr/announcements", label: "Announcements" },
  { href: "/hr/employees", label: "Employees" },
  { href: "/hr/benefits", label: "Benefits & Insurance" },
];

/**
 * Parent Navbar
 * Focused on monitoring child progress.
 */
export const PARENT_LINKS: NavLink[] = [
  { href: "/parent/dashboard", label: "Dashboard" },
];