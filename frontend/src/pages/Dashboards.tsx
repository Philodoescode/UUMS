import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

// Shared Layout for Dashboards
const DashboardLayout = ({ title, roleColor }: { title: string; roleColor: string }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-secondary/20 p-4">
      <div className={`card bg-card shadow-xl rounded-lg p-8 w-full max-w-md border-t-4 ${roleColor}`}>
        <h1 className="text-4xl font-bold mb-4">{title}</h1>
        <div className="space-y-4">
            <p className="text-xl">Welcome back, <span className="font-semibold">{user?.fullName}</span></p>
            <div className="p-4 bg-muted rounded-md text-left text-sm">
                <p><strong>Role:</strong> {user?.role}</p>
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>User ID:</strong> {user?._id}</p>
            </div>
            <Button variant="destructive" onClick={handleLogout} className="w-full">
            Secure Logout
            </Button>
        </div>
      </div>
    </div>
  );
};

export const AdminDashboard = () => <DashboardLayout title="Hello, Admin!" roleColor="border-red-500" />;
export const AdvisorDashboard = () => <DashboardLayout title="Hello, Advisor!" roleColor="border-blue-500" />;
export const StudentDashboard = () => <DashboardLayout title="Hello, Student!" roleColor="border-green-500" />;