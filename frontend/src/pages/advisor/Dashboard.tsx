import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircleIcon, XCircleIcon, ClockIcon } from "lucide-react";
import api from "@/lib/api";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Request {
    id: string;
    status: 'pending' | 'approved' | 'rejected';
    advisorComments: string;
    student: {
        id: string;
        fullName: string;
        email: string;
    };
    course: {
        id: string;
        courseCode: string;
        name: string;
        credits: number;
    };
    createdAt: string;
}

interface Enrollment {
    id: string;
    status: 'pending' | 'enrolled' | 'dropped';
    student: {
        id: string;
        fullName: string;
        email: string;
    };
    course: {
        id: string;
        courseCode: string;
        name: string;
    };
    enrolledAt: string;
}

const AdvisorDashboard = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState<Request[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(true);
    const [comments, setComments] = useState<Record<string, string>>({});

    const fetchData = async () => {
        try {
            const [reqRes, enrollRes] = await Promise.all([
                api.get('/elective-requests'),
                api.get('/enrollments?status=pending')
            ]);
            setRequests(reqRes.data);
            setEnrollments(enrollRes.data);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAction = async (id: string, status: 'approved' | 'rejected') => {
        try {
            await api.put(`/elective-requests/${id}`, {
                status,
                advisorComments: comments[id] || ""
            });
            // Reflect change locally or refetch
            setRequests(prev => prev.map(req =>
                req.id === id ? { ...req, status, advisorComments: comments[id] || "" } : req
            ));
        } catch (error) {
            alert("Failed to update request");
        }
    };

    const handleEnrollmentAction = async (id: string, action: 'approve' | 'reject') => {
        try {
            const status = action === 'approve' ? 'enrolled' : 'dropped';
            await api.put(`/enrollments/${id}/approval`, { status });
            // Remove from list since we only show pending
            setEnrollments(prev => prev.filter(e => e.id !== id));
        } catch (error) {
            alert("Failed to update enrollment");
        }
    };

    const pendingRequests = requests.filter(r => r.status === 'pending');
    const historyRequests = requests.filter(r => r.status !== 'pending');

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar links={[{ label: 'Dashboard', href: '/advisor' }]} />
            <main className="flex-grow bg-background p-8">
                <div className="container mx-auto max-w-6xl space-y-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold">Advisor Dashboard</h1>
                            <p className="text-muted-foreground">Manage student elective requests</p>
                        </div>
                        <div className="text-right text-sm">
                            <p className="font-medium">{user?.fullName}</p>
                            <p className="text-muted-foreground">{user?.email}</p>
                        </div>
                    </div>

                    {loading ? (
                        <div>Loading requests...</div>
                    ) : (
                        <Tabs defaultValue="electives" className="space-y-4">
                            <TabsList>
                                <TabsTrigger value="electives">Elective Requests</TabsTrigger>
                                <TabsTrigger value="enrollments">Course Enrollments</TabsTrigger>
                            </TabsList>

                            <TabsContent value="electives" className="space-y-8">
                                {/* Pending Section */}
                                <section>
                                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                        <ClockIcon className="size-5 text-yellow-500" />
                                        Pending Requests ({pendingRequests.length})
                                    </h2>
                                    {pendingRequests.length === 0 ? (
                                        <p className="text-muted-foreground italic">No pending requests.</p>
                                    ) : (
                                        <div className="grid gap-4">
                                            {pendingRequests.map(req => (
                                                <Card key={req.id}>
                                                    <CardHeader className="pb-2">
                                                        <div className="flex justify-between">
                                                            <div>
                                                                <CardTitle>{req.course.courseCode}: {req.course.name}</CardTitle>
                                                                <CardDescription>
                                                                    Requested by <span className="font-semibold text-foreground">{req.student.fullName}</span> ({req.student.email})
                                                                </CardDescription>
                                                            </div>
                                                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="pb-2">
                                                        <div className="text-xs text-muted-foreground mb-4">
                                                            Requested on: {new Date(req.createdAt).toLocaleDateString()}
                                                        </div>
                                                        <Textarea
                                                            placeholder="Add comments (optional)..."
                                                            className="mb-2"
                                                            value={comments[req.id] || ""}
                                                            onChange={(e) => setComments(prev => ({ ...prev, [req.id]: e.target.value }))}
                                                        />
                                                    </CardContent>
                                                    <CardFooter className="justify-end gap-2">
                                                        <Button variant="destructive" size="sm" onClick={() => handleAction(req.id, 'rejected')}>
                                                            <XCircleIcon className="mr-1 size-4" /> Reject
                                                        </Button>
                                                        <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleAction(req.id, 'approved')}>
                                                            <CheckCircleIcon className="mr-1 size-4" /> Approve
                                                        </Button>
                                                    </CardFooter>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </section>

                                {/* History Section */}
                                <section>
                                    <h2 className="text-xl font-semibold mb-4">History</h2>
                                    <div className="space-y-2">
                                        {historyRequests.map(req => (
                                            <div key={req.id} className="flex justify-between items-center p-4 border rounded-lg bg-muted/20">
                                                <div>
                                                    <div className="font-medium">{req.course.courseCode} - {req.student.fullName}</div>
                                                    <div className="text-sm text-muted-foreground">{req.advisorComments && `Comment: ${req.advisorComments}`}</div>
                                                </div>
                                                <Badge variant={req.status === 'approved' ? 'default' : 'destructive'}>
                                                    {req.status.toUpperCase()}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </TabsContent>

                            <TabsContent value="enrollments">
                                <section>
                                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                        <ClockIcon className="size-5 text-yellow-500" />
                                        Pending Course Enrollments ({enrollments.length})
                                    </h2>
                                    {enrollments.length === 0 ? (
                                        <p className="text-muted-foreground italic">No pending course enrollments.</p>
                                    ) : (
                                        <div className="grid gap-4">
                                            {enrollments.map(enrollment => (
                                                <Card key={enrollment.id}>
                                                    <CardHeader className="pb-2">
                                                        <div className="flex justify-between">
                                                            <div>
                                                                <CardTitle>{enrollment.course.courseCode}: {enrollment.course.name}</CardTitle>
                                                                <CardDescription>
                                                                    Student: <span className="font-semibold text-foreground">{enrollment.student.fullName}</span> ({enrollment.student.email})
                                                                </CardDescription>
                                                            </div>
                                                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending Approval</Badge>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="text-xs text-muted-foreground">
                                                            Enrolled on: {new Date(enrollment.enrolledAt).toLocaleDateString()}
                                                        </div>
                                                    </CardContent>
                                                    <CardFooter className="justify-end gap-2">
                                                        <Button variant="destructive" size="sm" onClick={() => handleEnrollmentAction(enrollment.id, 'reject')}>
                                                            <XCircleIcon className="mr-1 size-4" /> Reject
                                                        </Button>
                                                        <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleEnrollmentAction(enrollment.id, 'approve')}>
                                                            <CheckCircleIcon className="mr-1 size-4" /> Approve
                                                        </Button>
                                                    </CardFooter>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </TabsContent>
                        </Tabs>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdvisorDashboard;
