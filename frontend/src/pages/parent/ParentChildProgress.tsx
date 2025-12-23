import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import { PARENT_LINKS } from "@/config/navLinks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface CourseDetail {
    courseCode: string;
    courseName: string;
    grade: string;
    attendance: number;
    credits: number;
}

interface ProgressData {
    student: {
        id: string;
        name: string;
        email: string;
    };
    summary: {
        gpa: string;
        attendanceAverage: number;
    };
    details: CourseDetail[];
}

const ParentChildProgress = () => {
    const { childId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<ProgressData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchProgress = async () => {
            try {
                const response = await api.get(`/parent/children/${childId}/progress`);
                setData(response.data);
            } catch (err: any) {
                console.error("Failed to fetch progress", err);
                setError(err.response?.data?.message || "Failed to load progress data.");
            } finally {
                setLoading(false);
            }
        };

        if (childId) {
            fetchProgress();
        }
    }, [childId]);

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen bg-background">
                <Navbar links={PARENT_LINKS} />
                <div className="flex items-center justify-center flex-grow">Loading progress...</div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex flex-col min-h-screen bg-background">
                <Navbar links={PARENT_LINKS} />
                <div className="flex items-center justify-center flex-grow">
                    <div className="text-center">
                        <p className="text-red-500 mb-4">{error || "Student not found"}</p>
                        <Button onClick={() => navigate("/parent/dashboard")}>Back to Dashboard</Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Navbar links={PARENT_LINKS} />
            <main className="container mx-auto p-6 md:p-10 space-y-8">

                {/* Header Section */}
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/parent/dashboard")}>
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Academic Progress</h1>
                        <p className="text-muted-foreground">Monitoring for {data.student.name}</p>
                    </div>
                </div>

                {/* Summary Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-t-4 border-blue-500 shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Average GPA</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-blue-600">{data.summary.gpa}</div>
                            <p className="text-xs text-muted-foreground mt-1">Cumulative Grade Point Average</p>
                        </CardContent>
                    </Card>

                    <Card className="border-t-4 border-green-500 shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Attendance Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-green-600">{data.summary.attendanceAverage}%</div>
                            <p className="text-xs text-muted-foreground mt-1">Overall Participation</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Course Performance Details */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle>Course Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Course Code</th>
                                        <th className="px-6 py-3 font-medium">Course Name</th>
                                        <th className="px-6 py-3 font-medium">Credits</th>
                                        <th className="px-6 py-3 font-medium">Grade</th>
                                        <th className="px-6 py-3 font-medium">Attendance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {data.details.map((course) => (
                                        <tr key={course.courseCode} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-6 py-4 font-medium">{course.courseCode}</td>
                                            <td className="px-6 py-4">{course.courseName}</td>
                                            <td className="px-6 py-4">{course.credits}</td>
                                            <td className="px-6 py-4 font-bold text-blue-600">{course.grade}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-full bg-secondary rounded-full h-2.5 max-w-[100px]">
                                                        <div
                                                            className={`bg-green-600 h-2.5 rounded-full`}
                                                            style={{ width: `${course.attendance}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-xs font-medium">{course.attendance}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {data.details.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-4 text-center text-muted-foreground">No enrolled courses found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

            </main>
        </div>
    );
};

export default ParentChildProgress;
