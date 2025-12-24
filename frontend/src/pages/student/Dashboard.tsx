import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { STUDENT_LINKS } from "@/config/navLinks";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentResources } from "./StudentResources";

// Shared Welcome Card component
const WelcomeCard = ({ title, roleColor }: { title: string; roleColor: string }) => {
  const { user } = useAuth();
  return (
    <div className={`card bg-card shadow-xl rounded-lg p-8 w-full border-t-4 ${roleColor}`}>
      <h1 className="text-4xl font-bold mb-4">{title}</h1>
      <div className="space-y-4">
        <p className="text-xl">Welcome back, <span className="font-semibold">{user?.fullName}</span></p>
        <div className="p-4 bg-muted rounded-md text-left text-sm max-w-md">
          <p><strong>Role:</strong> {user?.role}</p>
          <p><strong>Email:</strong> {user?.email}</p>
        </div>
      </div>
    </div>
  );
};

const StudentDashboard = () => (
  <div className="flex flex-col min-h-screen">
    <Navbar links={STUDENT_LINKS} />
    <main className="flex-grow container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Student Dashboard</h1>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="courses">My Courses</TabsTrigger>
          <TabsTrigger value="resources">My Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <WelcomeCard title="Overview" roleColor="border-green-500" />
        </TabsContent>

        <TabsContent value="courses">
          <div className="text-muted-foreground p-8 text-center bg-muted/20 rounded-lg">
            Courses content coming soon...
          </div>
        </TabsContent>

        <TabsContent value="resources">
          <StudentResources />
        </TabsContent>
      </Tabs>
    </main>
  </div>
);

export default StudentDashboard;