import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { TA_LINKS } from "@/config/navLinks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    ArrowLeftIcon,
    BookOpenIcon,
    ClipboardListIcon,
    Loader2Icon,
    UserIcon,
    CalendarIcon,
} from "lucide-react";
import api from "@/lib/api";

interface Course {
    id: string;
    courseCode: string;
    name: string;
    semester: string;
    year: number;
    credits?: number;
    department?: {
        name: string;
    };
}

interface Instructor {
    user: {
        fullName: string;
        email: string;
    };
}

interface TAAssignment {
    id: string;
    duties: string;
    course: Course;
    instructor: Instructor;
    createdAt: string;
}

const TACourseDashboard = () => {
    const { assignmentId } = useParams<{ assignmentId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [assignment, setAssignment] = useState<TAAssignment | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchAssignment();
    }, [assignmentId]);

    const fetchAssignment = async () => {
        setIsLoading(true);
        try {
            const response = await api.get("/ta-assignments/my-courses");
            const found = response.data.find((a: TAAssignment) => a.id === assignmentId);
            setAssignment(found || null);
        } catch (error) {
            console.error("Failed to fetch assignment:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col min-h-screen">
                <Navbar links={TA_LINKS} />
                <main className="flex-grow bg-background flex items-center justify-center">
                    <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
                </main>
            </div>
        );
    }

    if (!assignment) {
        return (
            <div className="flex flex-col min-h-screen">
                <Navbar links={TA_LINKS} />
                <main className="flex-grow bg-background p-8">
                    <div className="container mx-auto max-w-6xl">
                        <div className="text-center py-12 text-muted-foreground">
                            <BookOpenIcon className="size-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">Assignment Not Found</p>
                            <p className="text-sm mb-4">This course assignment could not be found.</p>
                            <Button variant="outline" onClick={() => navigate("/ta/my-courses")}>
                                <ArrowLeftIcon className="mr-2 size-4" />
                                Back to My Courses
                            </Button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar links={TA_LINKS} />
            <main className="flex-grow bg-background p-8">
                <div className="container mx-auto max-w-4xl space-y-6">
                    {/* Back Button & Header */}
                    <div className="flex items-start justify-between">
                        <div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="mb-2 -ml-2"
                                onClick={() => navigate("/ta/my-courses")}
                            >
                                <ArrowLeftIcon className="mr-2 size-4" />
                                Back to My Courses
                            </Button>
                            <h1 className="text-3xl font-bold">{assignment.course.courseCode}</h1>
                            <p className="text-lg text-muted-foreground">{assignment.course.name}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                                    {assignment.course.semester} {assignment.course.year}
                                </span>
                                {assignment.course.credits && (
                                    <span>{assignment.course.credits} Credits</span>
                                )}
                                {assignment.course.department && (
                                    <span>{assignment.course.department.name}</span>
                                )}
                            </div>
                        </div>
                        <div className="text-right text-sm">
                            <p className="font-medium">{user?.fullName}</p>
                            <p className="text-muted-foreground">{user?.email}</p>
                        </div>
                    </div>

                    {/* Instructor Info */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <UserIcon className="size-4" />
                                Course Instructor
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="font-medium">{assignment.instructor.user.fullName}</p>
                            <p className="text-sm text-muted-foreground">{assignment.instructor.user.email}</p>
                        </CardContent>
                    </Card>

                    {/* Your Duties - Main Focus */}
                    <Card className="border-primary/30">
                        <CardHeader className="bg-primary/5">
                            <CardTitle className="flex items-center gap-2">
                                <ClipboardListIcon className="size-5 text-primary" />
                                Your Assigned Duties
                            </CardTitle>
                            <CardDescription>
                                Responsibilities assigned to you by the instructor
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {assignment.duties ? (
                                <div className="bg-muted/50 p-4 rounded-lg border whitespace-pre-wrap text-sm leading-relaxed">
                                    {assignment.duties}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <ClipboardListIcon className="size-10 mx-auto mb-2 opacity-50" />
                                    <p>No specific duties assigned yet.</p>
                                    <p className="text-sm">Contact your instructor for details.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Assignment Info */}
                    <Card className="bg-muted/30">
                        <CardContent className="py-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CalendarIcon className="size-4" />
                                <span>
                                    Assigned on {new Date(assignment.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
};

export default TACourseDashboard;
