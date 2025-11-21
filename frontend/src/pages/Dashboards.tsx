import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar"; // Import the universal Navbar
import { ADMIN_LINKS, ADVISOR_LINKS, STUDENT_LINKS } from "@/config/navLinks";

// Shared Welcome Card component for Dashboards
const WelcomeCard = ({ title, roleColor }: { title: string; roleColor: string }) => {
  const { user } = useAuth();

  return (
    <div className={`card bg-card shadow-xl rounded-lg p-8 w-full max-w-md border-t-4 ${roleColor}`}>
      <h1 className="text-4xl font-bold mb-4">{title}</h1>
      <div className="space-y-4">
          <p className="text-xl">Welcome back, <span className="font-semibold">{user?.fullName}</span></p>
          <div className="p-4 bg-muted rounded-md text-left text-sm">
              <p><strong>Role:</strong> {user?.role}</p>
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>User ID:</strong> {user?._id}</p>
          </div>
          <p className="text-muted-foreground text-xs pt-4">This is the main content area for the dashboard. The navbar above is now universal and role-specific.</p>
      </div>
    </div>
  );
};

// Main page content wrapper
const PageContent = ({ children }: { children: React.ReactNode }) => (
    <main className="flex-grow flex items-center justify-center bg-background p-4">
        {children}
    </main>
);

export const AdminDashboard = () => (
  <div className="flex flex-col min-h-screen">
    <Navbar links={ADMIN_LINKS} />
    <PageContent>
      <WelcomeCard title="Admin Dashboard" roleColor="border-red-500" />
    </PageContent>
  </div>
);

export const AdvisorDashboard = () => (
  <div className="flex flex-col min-h-screen">
    <Navbar links={ADVISOR_LINKS} />
    <PageContent>
      <WelcomeCard title="Advisor Dashboard" roleColor="border-blue-500" />
    </PageContent>
  </div>
);

export const StudentDashboard = () => (
  <div className="flex flex-col min-h-screen">
    <Navbar links={STUDENT_LINKS} />
    <PageContent>
      <WelcomeCard title="Student Dashboard" roleColor="border-green-500" />
    </PageContent>
  </div>
);