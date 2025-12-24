import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { TA_LINKS } from "@/config/navLinks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { BookOpenIcon, ClipboardListIcon, CalendarIcon, AwardIcon } from "lucide-react";

const TADashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const quickLinks = [
        {
            title: "My Courses",
            description: "View courses you are assigned to assist",
            icon: BookOpenIcon,
            href: "/ta/my-courses",
            color: "bg-blue-500/10 text-blue-600",
        },
        {
            title: "Grading Tasks",
            description: "View assigned grading duties",
            icon: ClipboardListIcon,
            href: "/ta/my-courses",
            color: "bg-green-500/10 text-green-600",
        },
        {
            title: "Schedule",
            description: "Check your office hours and duties",
            icon: CalendarIcon,
            href: "/ta/my-courses",
            color: "bg-purple-500/10 text-purple-600",
        },
        {
            title: "Performance",
            description: "View evaluations and professional development",
            icon: AwardIcon,
            href: "/ta/performance",
            color: "bg-orange-500/10 text-orange-600",
        },
    ];

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar links={TA_LINKS} />
            <main className="flex-grow bg-background p-8">
                <div className="container mx-auto max-w-6xl space-y-8">
                    {/* Welcome Section */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold">Welcome, {user?.fullName}</h1>
                            <p className="text-muted-foreground mt-1">Teaching Assistant Dashboard</p>
                        </div>
                        <div className="text-right text-sm">
                            <p className="font-medium">{user?.fullName}</p>
                            <p className="text-muted-foreground">{user?.email}</p>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <Card className="border-2 border-dashed border-primary/20 bg-primary/5">
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {quickLinks.map((link) => (
                                    <Button
                                        key={link.title}
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

                    {/* Getting Started */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Getting Started</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground mb-4">
                                View your assigned courses and duties by clicking "My Courses".
                            </p>
                            <Button size="lg" onClick={() => navigate("/ta/my-courses")}>
                                <BookOpenIcon className="mr-2 size-5" />
                                Go to My Courses
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
};

export default TADashboard;
