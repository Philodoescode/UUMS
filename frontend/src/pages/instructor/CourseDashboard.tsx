import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { INSTRUCTOR_LINKS } from "@/config/navLinks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InstructorAssessmentList } from "@/components/InstructorAssessmentList";
import { InstructorAnnouncements } from "@/components/InstructorAnnouncements";
import { InstructorGradeAppeals } from "@/components/InstructorGradeAppeals";
import InstructorMaterialManagement from "@/components/InstructorMaterialManagement";
import { TAAssignmentManager } from "@/components/TAAssignmentManager";
import api from "@/lib/api";
import {
    ArrowLeftIcon,
    BookOpenIcon,
    RefreshCwIcon,
    ClipboardListIcon,
    FolderIcon,
    MegaphoneIcon,
    ScaleIcon,
    UsersIcon,
} from "lucide-react";

interface Course {
    id: string;
    courseCode: string;
    name: string;
    semester: string;
    year: number;
    credits?: number;
    description?: string;
    department?: {
        name: string;
    };
}

const CourseDashboard = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("assessments");

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                // Fetch courses and find the specific one
                const response = await api.get("/instructor-portal/my-courses");
                const foundCourse = response.data.find((c: Course) => c.id === courseId);
                if (foundCourse) {
                    setCourse(foundCourse);
                }
            } catch (error) {
                console.error("Failed to fetch course", error);
            } finally {
                setLoading(false);
            }
        };
        if (courseId) {
            fetchCourse();
        }
    }, [courseId]);

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen">
                <Navbar links={INSTRUCTOR_LINKS} />
                <main className="flex-grow bg-background flex items-center justify-center">
                    <RefreshCwIcon className="size-8 animate-spin text-muted-foreground" />
                </main>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="flex flex-col min-h-screen">
                <Navbar links={INSTRUCTOR_LINKS} />
                <main className="flex-grow bg-background p-8">
                    <div className="container mx-auto max-w-6xl">
                        <div className="text-center py-12 text-muted-foreground">
                            <BookOpenIcon className="size-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">Course Not Found</p>
                            <p className="text-sm mb-4">
                                The requested course could not be found or you don't have access to it.
                            </p>
                            <Button variant="outline" onClick={() => navigate("/instructor/my-courses")}>
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
            <Navbar links={INSTRUCTOR_LINKS} />
            <main className="flex-grow bg-background p-8">
                <div className="container mx-auto max-w-6xl space-y-6">
                    {/* Back Button & Header */}
                    <div className="flex items-start justify-between">
                        <div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="mb-2 -ml-2"
                                onClick={() => navigate("/instructor/my-courses")}
                            >
                                <ArrowLeftIcon className="mr-2 size-4" />
                                Back to My Courses
                            </Button>
                            <h1 className="text-3xl font-bold">{course.courseCode}</h1>
                            <p className="text-lg text-muted-foreground">{course.name}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                                    {course.semester} {course.year}
                                </span>
                                {course.credits && <span>{course.credits} Credits</span>}
                                {course.department && <span>{course.department.name}</span>}
                            </div>
                        </div>
                        <div className="text-right text-sm">
                            <p className="font-medium">{user?.fullName}</p>
                            <p className="text-muted-foreground">{user?.email}</p>
                        </div>
                    </div>

                    {/* Course Dashboard Tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-5">
                            <TabsTrigger value="assessments" className="flex items-center gap-2">
                                <ClipboardListIcon className="size-4" />
                                Assessments
                            </TabsTrigger>
                            <TabsTrigger value="materials" className="flex items-center gap-2">
                                <FolderIcon className="size-4" />
                                Materials
                            </TabsTrigger>
                            <TabsTrigger value="announcements" className="flex items-center gap-2">
                                <MegaphoneIcon className="size-4" />
                                Announcements
                            </TabsTrigger>
                            <TabsTrigger value="appeals" className="flex items-center gap-2">
                                <ScaleIcon className="size-4" />
                                Grade Appeals
                            </TabsTrigger>
                            <TabsTrigger value="staff" className="flex items-center gap-2">
                                <UsersIcon className="size-4" />
                                Manage Staff
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="assessments" className="mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <ClipboardListIcon className="size-5" />
                                        Assessments
                                    </CardTitle>
                                    <CardDescription>
                                        Create and manage assessments, quizzes, and exams for this course
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <InstructorAssessmentList courseId={courseId!} />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="materials" className="mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FolderIcon className="size-5" />
                                        Course Materials
                                    </CardTitle>
                                    <CardDescription>
                                        Upload and manage lecture notes, slides, and other course materials
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <InstructorMaterialManagement courseId={courseId!} />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="announcements" className="mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MegaphoneIcon className="size-5" />
                                        Announcements
                                    </CardTitle>
                                    <CardDescription>
                                        Post announcements and important updates for students
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <InstructorAnnouncements courseId={courseId!} />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="appeals" className="mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <ScaleIcon className="size-5" />
                                        Grade Appeals
                                    </CardTitle>
                                    <CardDescription>
                                        Review and respond to student grade appeal requests
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <InstructorGradeAppeals courseId={courseId!} />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="staff" className="mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <UsersIcon className="size-5" />
                                        Manage Staff
                                    </CardTitle>
                                    <CardDescription>
                                        Assign Teaching Assistants and define their duties
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <TAAssignmentManager courseId={courseId!} />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </main>
        </div>
    );
};

export default CourseDashboard;
