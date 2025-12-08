import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { LoginForm } from "@/components/login-form"
import { AuthProvider } from "@/context/AuthContext"
import ProtectedRoute from "@/components/ProtectedRoute"
import AdminDashboard from "@/pages/admin/Dashboard"
import CurriculumManagement from "@/pages/admin/CurriculumManagement"
import AdvisorDashboard from "@/pages/advisor/Dashboard"
import StudentDashboard from "@/pages/student/Dashboard"
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

          {/* Protected Routes */}
          
          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            {/* Redirect /admin to /admin/dashboard */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/curriculum" element={<CurriculumManagement />} />
            {/* Add other admin routes here, e.g., /admin/users */}
          </Route>

          {/* Advisor Routes */}
          <Route element={<ProtectedRoute allowedRoles={['advisor']} />}>
            {/* Redirect /advisor to /advisor/dashboard */}
            <Route path="/advisor" element={<Navigate to="/advisor/dashboard" replace />} />
            <Route path="/advisor/dashboard" element={<AdvisorDashboard />} />
            {/* Add other advisor routes here, e.g., /advisor/my-students */}
          </Route>

          {/* Student Routes */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
             {/* Redirect /student to /student/dashboard */}
            <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            {/* Add other student routes here, e.g., /student/academics */}
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App