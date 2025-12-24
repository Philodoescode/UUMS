import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { LoginForm } from "@/components/login-form"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/context/AuthContext"
import ProtectedRoute from "@/components/ProtectedRoute"
import AdminDashboard from "@/pages/admin/Dashboard"
import CurriculumManagement from "@/pages/admin/CurriculumManagement"
import InstructorAssignment from "@/pages/admin/InstructorAssignment"
import StudentManagement from "@/pages/admin/StudentManagement"
import FacilityManagement from "@/pages/admin/FacilityManagement"
import StaffManagement from "@/pages/admin/StaffManagement"
import FacilityCalendar from "@/pages/admin/FacilityCalendar"
import AdmissionManagement from "@/pages/admin/AdmissionManagement"
import Announcements from "@/pages/admin/Announcements"
import InstructorDashboard from "@/pages/instructor/Dashboard"
import GradeManagement from "@/pages/instructor/GradeManagement"
import InstructorMessages from "@/pages/instructor/Messages"
import AdvisorDashboard from "@/pages/advisor/Dashboard"
import StudentDashboard from "@/pages/student/Dashboard"
import CourseCatalog from "@/pages/student/CourseCatalog"
import Academics from "@/pages/student/Academics"
import CourseDetails from "@/pages/student/CourseDetails"
import AssessmentTake from "./pages/student/AssessmentTake";
import AssessmentResult from "./pages/student/AssessmentResult";
import FacultyDirectory from "./pages/student/FacultyDirectory";
import Messages from "./pages/student/Messages";
import AdmissionApplication from "@/pages/AdmissionApplication";
import StudentAssignmentSubmit from "./components/StudentAssignmentSubmit";
import TADashboard from "@/pages/ta/Dashboard";
import TAProfile from "@/pages/ta/Profile";
import InstructorProfile from "@/pages/instructor/Profile";
import MaintenanceReporting from "@/pages/instructor/MaintenanceReporting";
import MaintenanceRequests from "@/pages/admin/MaintenanceRequests";
import AssetManagement from "@/pages/admin/AssetManagement";
import AssetDetails from "@/pages/admin/AssetDetails";
import HREmployees from "@/pages/admin/HREmployees";
import HRDashboard from "@/pages/hr/HRDashboard";
import ParentDashboard from "@/pages/parent/ParentDashboard";
import ParentChildProgress from "@/pages/parent/ParentChildProgress";
import './App.css'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/" element={
            <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
              <div className="w-full max-w-sm">
                <LoginForm />
              </div>
            </div>
          } />

          <Route path="/apply" element={<AdmissionApplication />} />

          {/* Protected Routes */}

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            {/* Redirect /admin to /admin/dashboard */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/announcements" element={<Announcements />} />
            <Route path="/admin/maintenance" element={<MaintenanceRequests />} />
            <Route path="/admin/facilities" element={<FacilityManagement />} />
            <Route path="/admin/curriculum" element={<CurriculumManagement />} />
            <Route path="/admin/instructors" element={<InstructorAssignment />} />
            <Route path="/admin/students" element={<StudentManagement />} />
            <Route path="/admin/staff" element={<StaffManagement />} />
            <Route path="/admin/admissions" element={<AdmissionManagement />} />
            <Route path="/admin/assets" element={<AssetManagement />} />
            <Route path="/admin/assets/:id" element={<AssetDetails />} />
            <Route path="/admin/calendar" element={<FacilityCalendar />} />
          </Route>

          {/* Instructor Routes */}
          <Route element={<ProtectedRoute allowedRoles={['instructor']} />}>
            {/* Redirect /instructor to /instructor/dashboard */}
            <Route path="/instructor" element={<Navigate to="/instructor/dashboard" replace />} />
            <Route path="/instructor/dashboard" element={<InstructorDashboard />} />
            <Route path="/instructor/profile" element={<InstructorProfile />} />
            <Route path="/instructor/announcements" element={<Announcements />} />
            <Route path="/instructor/maintenance" element={<MaintenanceReporting />} />
            <Route path="/instructor/grades" element={<GradeManagement />} />
            <Route path="/instructor/messages" element={<InstructorMessages />} />
          </Route>

          {/* TA Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ta']} />}>
            <Route path="/ta" element={<Navigate to="/ta/dashboard" replace />} />
            <Route path="/ta/dashboard" element={<TADashboard />} />
            <Route path="/ta/profile" element={<TAProfile />} />
          </Route>

          {/* HR Routes */}
          <Route element={<ProtectedRoute allowedRoles={['hr']} />}>
            <Route path="/hr" element={<Navigate to="/hr/dashboard" replace />} />
            <Route path="/hr/dashboard" element={<HRDashboard />} />
            <Route path="/hr/announcements" element={<Announcements />} />
            <Route path="/hr/employees" element={<HREmployees />} />
          </Route>

          {/* Advisor Routes */}
          <Route element={<ProtectedRoute allowedRoles={['advisor']} />}>
            <Route path="/advisor" element={<AdvisorDashboard />} />
          </Route>

          {/* Student Routes */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            {/* Redirect /student to /student/dashboard */}
            <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/catalog" element={<CourseCatalog />} />
            <Route path="/student/academics" element={<Academics />} />
            <Route path="/student/academics/:courseId" element={<CourseDetails />} />
            <Route path="/student/assessment/take/:assessmentId" element={<AssessmentTake />} />
            <Route path="/student/assignment/:assessmentId" element={<StudentAssignmentSubmit />} /> {/* Added route */}
            <Route path="/student/assessment/result/:submissionId" element={<AssessmentResult />} />

            {/* New Routes */}
            <Route path="/student/directory" element={<FacultyDirectory />} />
            <Route path="/student/messages" element={<Messages />} />

            {/* Add other student routes here */}
          </Route>

          {/* Parent Routes */}
          <Route element={<ProtectedRoute allowedRoles={['parent']} />}>
            <Route path="/parent" element={<Navigate to="/parent/dashboard" replace />} />
            <Route path="/parent/dashboard" element={<ParentDashboard />} />
            <Route path="/parent/child-progress/:childId" element={<ParentChildProgress />} />
          </Route>

          {/* HR Routes */}
          <Route element={<ProtectedRoute allowedRoles={['hr']} />}>
            <Route path="/hr" element={<Navigate to="/hr/dashboard" replace />} />
            <Route path="/hr/dashboard" element={<HRDashboard />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  )
}

export default App