export type NavLink = {
  href: string;
  label:string;
};

/**
 * Admin Navbar
 * Focused on high-level management of the university's core systems.
 * Links correspond to managing the backend of each module.
 */
export const ADMIN_LINKS: NavLink[] = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/facilities", label: "Facilities Management" },
  { href: "/admin/curriculum", label: "Curriculum Management" },
  { href: "/admin/users", label: "User Management" },
  { href: "/admin/communications", label: "Communications" },
  { href: "/admin/reports", label: "System Reports" },
];

/**
 * advisor/Advisor Navbar
 * This navbar is for a advisor member, likely a professor or advisor.
 * It's focused on tasks related to teaching, student management, and communication.
 * Note: A general advisor portal might have more HR-related links.
 */
export const ADVISOR_LINKS: NavLink[] = [
    { href: "/advisor/dashboard", label: "Dashboard" },
    { href: "/advisor/my-courses", label: "My Courses" },
    { href: "/advisor/my-students", label: "My Students" },
    { href: "/advisor/calendar", label: "Calendar & Events" },
    { href: "/advisor/communications", label: "Communications" },
];

/**
 * Student Navbar
 * Tailored specifically to the student's needs, providing access to
 * academic information, campus resources, and community features.
 */
export const STUDENT_LINKS: NavLink[] = [
  { href: "/student/dashboard", label: "Dashboard" },
  { href: "/student/academics", label: "Academics" },
  { href: "/student/registration", label: "Course Registration" },
  { href: "/student/community", label: "Community Hub" },
  { href: "/student/directory", label: "Faculty Directory" },
];