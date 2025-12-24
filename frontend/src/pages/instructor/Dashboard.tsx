import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { INSTRUCTOR_LINKS } from "@/config/navLinks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpenIcon,
  ClipboardListIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  WrenchIcon,
} from "lucide-react";

const InstructorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const quickLinks = [
    {
      title: "My Courses",
      description: "View and manage all your assigned courses",
      icon: BookOpenIcon,
      href: "/instructor/my-courses",
      color: "bg-blue-500/10 text-blue-600",
    },
    {
      title: "Grade Management",
      description: "Manage student grades and view grade history",
      icon: ClipboardListIcon,
      href: "/instructor/grades",
      color: "bg-green-500/10 text-green-600",
    },
    {
      title: "Announcements",
      description: "Post and manage announcements",
      icon: MegaphoneIcon,
      href: "/instructor/announcements",
      color: "bg-purple-500/10 text-purple-600",
    },
    {
      title: "Messages",
      description: "View and send messages to students",
      icon: MessageSquareIcon,
      href: "/instructor/messages",
      color: "bg-orange-500/10 text-orange-600",
    },
    {
      title: "Maintenance Requests",
      description: "Report and track maintenance issues",
      icon: WrenchIcon,
      href: "/instructor/maintenance",
      color: "bg-red-500/10 text-red-600",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar links={INSTRUCTOR_LINKS} />
      <main className="flex-grow bg-background p-8">
        <div className="container mx-auto max-w-6xl space-y-8">
          {/* Welcome Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Welcome back, {user?.fullName?.split(' ')[0] || 'Instructor'}!</h1>
              <p className="text-muted-foreground">
                Instructor Dashboard - Manage your courses and connect with students
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium">{user?.fullName}</p>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          {/* Quick Actions Card */}
          <Card className="border-2 border-dashed border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpenIcon className="size-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Access your most used features quickly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quickLinks.map((link) => (
                  <Button
                    key={link.href}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-accent justify-start"
                    onClick={() => navigate(link.href)}
                  >
                    <div className={`p-2 rounded-lg ${link.color}`}>
                      <link.icon className="size-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{link.title}</p>
                      <p className="text-xs text-muted-foreground font-normal">
                        {link.description}
                      </p>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Getting Started Section */}
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                Start managing your courses by clicking on "My Courses" above or in the navigation menu.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-8">
                <Button size="lg" onClick={() => navigate("/instructor/my-courses")}>
                  <BookOpenIcon className="mr-2 size-5" />
                  Go to My Courses
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default InstructorDashboard;