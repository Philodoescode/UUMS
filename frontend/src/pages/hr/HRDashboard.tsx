import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { HR_LINKS } from "@/config/navLinks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Clock, Users } from "lucide-react";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useNavigate } from "react-router-dom";

const HRDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalEmployees: 0,
        pendingLeaveRequests: 0,
    });

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const [employeesRes, leaveRes] = await Promise.all([
                api.get('/hr/employees'),
                api.get('/hr/leave-requests?status=pending')
            ]);

            setStats({
                totalEmployees: employeesRes.data.count || 0,
                pendingLeaveRequests: leaveRes.data.count || 0,
            });
        } catch (error) {
            console.error("Failed to fetch stats", error);
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar links={HR_LINKS} />
            <main className="flex-grow bg-background p-8">
                <div className="container mx-auto max-w-7xl">
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold">HR Dashboard</h1>
                        <p className="text-xl mt-2">Welcome back, <span className="font-semibold">{user?.fullName}</span></p>
                        <p className="text-muted-foreground mt-1">Manage employee compensation and leave requests</p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
                        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/hr/employees')}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.totalEmployees}</div>
                                <p className="text-xs text-muted-foreground">Instructors & TAs</p>
                            </CardContent>
                        </Card>

                        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/hr/employees?tab=leave-requests')}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Pending Leave Requests</CardTitle>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.pendingLeaveRequests}</div>
                                <p className="text-xs text-muted-foreground">Awaiting review</p>
                            </CardContent>
                        </Card>

                        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/hr/employees')}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Compensation</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">Manage</div>
                                <p className="text-xs text-muted-foreground">Salary & benefits</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Actions</CardTitle>
                                <CardDescription>Common HR tasks</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <button
                                    onClick={() => navigate('/hr/employees')}
                                    className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors"
                                >
                                    <div className="font-medium">Manage Employee Compensation</div>
                                    <div className="text-sm text-muted-foreground">Update salaries, allowances, and deductions</div>
                                </button>
                                <button
                                    onClick={() => navigate('/hr/employees?tab=leave-requests')}
                                    className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors"
                                >
                                    <div className="font-medium">Review Leave Requests</div>
                                    <div className="text-sm text-muted-foreground">Approve or deny pending requests</div>
                                </button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Activity</CardTitle>
                                <CardDescription>Latest HR actions</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-muted-foreground">
                                    No recent activity to display
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default HRDashboard;
