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
import FacilityCalendar from "@/pages/admin/FacilityCalendar"
import InstructorDashboard from "@/pages/instructor/Dashboard"
import GradeManagement from "@/pages/instructor/GradeManagement"
import AdvisorDashboard from "@/pages/advisor/Dashboard"
import StudentDashboard from "@/pages/student/Dashboard"
import CourseCatalog from "@/pages/student/CourseCatalog"
import Academics from "@/pages/student/Academics"
import CourseDetails from "@/pages/student/CourseDetails"
import AssessmentTake from "./pages/student/AssessmentTake";
import AssessmentResult from "./pages/student/AssessmentResult";
import AdmissionApplication from "@/pages/AdmissionApplication";
import StudentAssignmentSubmit from "./components/StudentAssignmentSubmit"; // Assuming components folder
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
            <Route path="/admin/facilities" element={<FacilityManagement />} />
            <Route path="/admin/curriculum" element={<CurriculumManagement />} />
            <Route path="/admin/instructors" element={<InstructorAssignment />} />
            <Route path="/admin/students" element={<StudentManagement />} />
            <Route path="/admin/calendar" element={<FacilityCalendar />} />
          </Route>

          {/* Instructor Routes */}
          <Route element={<ProtectedRoute allowedRoles={['instructor']} />}>
            {/* Redirect /instructor to /instructor/dashboard */}
            <Route path="/instructor" element={<Navigate to="/instructor/dashboard" replace />} />
            <Route path="/instructor/dashboard" element={<InstructorDashboard />} />
            <Route path="/instructor/grades" element={<GradeManagement />} />
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
            {/* Add other student routes here */}
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