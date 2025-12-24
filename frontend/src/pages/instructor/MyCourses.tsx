import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { INSTRUCTOR_LINKS } from "@/config/navLinks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { BookOpenIcon, RefreshCwIcon, UsersIcon, ClipboardListIcon } from "lucide-react";

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

const MyCourses = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const response = await api.get("/instructor-portal/my-courses");
                setCourses(response.data);
            } catch (error) {
                console.error("Failed to fetch courses", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, []);

    const handleCourseClick = (courseId: string) => {
        navigate(`/instructor/course/${courseId}`);
    };

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar links={INSTRUCTOR_LINKS} />
            <main className="flex-grow bg-background p-8">
                <div className="container mx-auto max-w-6xl space-y-8">
                    {/* Header Section */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold">My Courses</h1>
                            <p className="text-muted-foreground">
                                View and manage all courses assigned to you
                            </p>
                        </div>
                        <div className="text-right text-sm">
                            <p className="font-medium">{user?.fullName}</p>
                            <p className="text-muted-foreground">{user?.email}</p>
                        </div>
                    </div>

                    {/* Courses Grid */}
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <RefreshCwIcon className="size-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : courses.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <BookOpenIcon className="size-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">No Courses Assigned</p>
                            <p className="text-sm">You are not assigned to any courses yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {courses.map((course) => (
                                <Card
                                    key={course.id}
                                    className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all duration-200 group"
                                    onClick={() => handleCourseClick(course.id)}
                                >
                                    <CardHeader className="bg-gradient-to-br from-primary/10 to-primary/5 pb-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-xl group-hover:text-primary transition-colors">
                                                    {course.courseCode}
                                                </CardTitle>
                                                <CardDescription className="text-sm mt-1 line-clamp-2">
                                                    {course.name}
                                                </CardDescription>
                                            </div>
                                            <Badge variant="secondary" className="shrink-0">
                                                {course.semester} {course.year}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            {course.credits && (
                                                <div className="flex items-center gap-1">
                                                    <ClipboardListIcon className="size-4" />
                                                    <span>{course.credits} Credits</span>
                                                </div>
                                            )}
                                            {course.department && (
                                                <div className="flex items-center gap-1">
                                                    <UsersIcon className="size-4" />
                                                    <span className="truncate">{course.department.name}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-4 pt-4 border-t">
                                            <span className="text-sm text-primary font-medium group-hover:underline">
                                                Open Course Dashboard →
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

export default MyCourses;
