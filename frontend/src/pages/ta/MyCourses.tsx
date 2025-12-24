import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { TA_LINKS } from "@/config/navLinks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    BookOpenIcon,
    Loader2Icon,
    UserIcon,
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

const TAMyCourses = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [assignments, setAssignments] = useState<TAAssignment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchMyCourses();
    }, []);

    const fetchMyCourses = async () => {
        setIsLoading(true);
        try {
            const response = await api.get("/ta-assignments/my-courses");
            setAssignments(response.data);
        } catch (error) {
            console.error("Failed to fetch TA courses:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCourseClick = (assignmentId: string) => {
        navigate(`/ta/course/${assignmentId}`);
    };

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar links={TA_LINKS} />
            <main className="flex-grow bg-background p-8">
                <div className="container mx-auto max-w-6xl space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold">My Courses</h1>
                            <p className="text-muted-foreground">
                                Courses you are assigned to as a Teaching Assistant
                            </p>
                        </div>
                        <div className="text-right text-sm">
                            <p className="font-medium">{user?.fullName}</p>
                            <p className="text-muted-foreground">{user?.email}</p>
                        </div>
                    </div>

                    {/* Course List */}
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : assignments.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <BookOpenIcon className="size-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">No Courses Assigned</p>
                            <p className="text-sm">You have not been assigned to any courses yet.</p>
                            <p className="text-sm">Contact your instructor to be added as a TA.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {assignments.map((assignment) => (
                                <Card
                                    key={assignment.id}
                                    className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all duration-200 group"
                                    onClick={() => handleCourseClick(assignment.id)}
                                >
                                    <CardHeader className="bg-gradient-to-br from-primary/10 to-primary/5 pb-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                                                    {assignment.course.courseCode}
                                                </CardTitle>
                                                <CardDescription className="text-sm mt-0.5 line-clamp-2">
                                                    {assignment.course.name}
                                                </CardDescription>
                                            </div>
                                            <Badge variant="secondary">
                                                {assignment.course.semester} {assignment.course.year}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <UserIcon className="size-4" />
                                            <span>Instructor: {assignment.instructor.user.fullName}</span>
                                        </div>
                                        <div className="mt-3 pt-3 border-t">
                                            <span className="text-sm text-primary font-medium group-hover:underline">
                                                View Duties →
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default TAMyCourses;
