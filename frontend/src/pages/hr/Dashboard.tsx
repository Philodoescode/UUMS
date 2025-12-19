import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

const HRDashboard = () => {
    const { user } = useAuth();
    // Assuming we might have a navLinks config for HR, or just use Admin links for now or Stub.
    // For now, minimal Navbar or reuse Admin? Admin links might not be appropriate.
    // I'll define local links.
    const HR_LINKS = [
        { label: "Dashboard", href: "/hr/dashboard" },
        { label: "Compensation", href: "#" },
        { label: "Benefits", href: "#" },
    ];

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar links={HR_LINKS} />
            <main className="flex-grow bg-background p-8">
                <div className="container mx-auto max-w-6xl">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold">HR Administrator Dashboard</h1>
                        <p className="text-muted-foreground mt-2">Welcome back, {user?.fullName}</p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                        <Card className="flex flex-col h-full text-center">
                            <CardHeader>
                                <CardTitle>Compensation Management</CardTitle>
                                <CardDescription>Manage salary, allowances, and deductions.</CardDescription>
                            </CardHeader>
                            <CardContent className="mt-auto">
                                <Button className="w-1/2 mx-auto">Manage Compensation</Button>
                            </CardContent>
                        </Card>

                        <Card className="flex flex-col h-full text-center">
                            <CardHeader>
                                <CardTitle>Benefits & Insurance</CardTitle>
                                <CardDescription>Oversee staff benefits and insurance records.</CardDescription>
                            </CardHeader>
                            <CardContent className="mt-auto">
                                <Button className="w-1/2 mx-auto">View Benefits</Button>
                            </CardContent>
                        </Card>

                        <Card className="flex flex-col h-full text-center">
                            <CardHeader>
                                <CardTitle>Leave Requests</CardTitle>
                                <CardDescription>Review and respond to Instructor/TA leave requests.</CardDescription>
                            </CardHeader>
                            <CardContent className="mt-auto">
                                <Button className="w-1/2 mx-auto">Manage Requests</Button>
                            </CardContent>
                        </Card>

                        <Card className="flex flex-col h-full text-center">
                            <CardHeader>
                                <CardTitle>Staff Directory</CardTitle>
                                <CardDescription>View all Instructors and Teaching Assistants.</CardDescription>
                            </CardHeader>
                            <CardContent className="mt-auto">
                                <Button variant="outline" className="w-1/2 mx-auto">View Staff</Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default HRDashboard;
