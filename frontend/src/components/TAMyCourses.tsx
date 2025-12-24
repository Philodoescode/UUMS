import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    BookOpenIcon,
    ClipboardListIcon,
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

export const TAMyCourses = () => {
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

    if (isLoading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (assignments.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                    <BookOpenIcon className="size-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No Courses Assigned</p>
                    <p className="text-sm">
                        You have not been assigned to any courses yet.
                    </p>
                    <p className="text-sm">
                        Contact your instructor to be added as a Teaching Assistant.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <BookOpenIcon className="size-5" />
                    My Courses ({assignments.length})
                </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {assignments.map((assignment) => (
                    <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="bg-gradient-to-br from-primary/10 to-primary/5 pb-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg">
                                        {assignment.course.courseCode}
                                    </CardTitle>
                                    <CardDescription className="text-sm mt-0.5">
                                        {assignment.course.name}
                                    </CardDescription>
                                </div>
                                <Badge variant="secondary">
                                    {assignment.course.semester} {assignment.course.year}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            {/* Instructor Info */}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <UserIcon className="size-4" />
                                <span>
                                    Instructor: <strong>{assignment.instructor.user.fullName}</strong>
                                </span>
                            </div>

                            {/* Duties Section */}
                            {assignment.duties ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1 text-sm font-medium">
                                        <ClipboardListIcon className="size-4 text-primary" />
                                        Your Duties:
                                    </div>
                                    <div className="bg-muted/50 p-3 rounded-md border text-sm whitespace-pre-wrap">
                                        {assignment.duties}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground italic">
                                    No specific duties assigned yet.
                                </div>
                            )}

                            {/* Course Info */}
                            <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                                {assignment.course.credits && (
                                    <span>{assignment.course.credits} Credits</span>
                                )}
                                {assignment.course.department && (
                                    <span>{assignment.course.department.name}</span>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default TAMyCourses;
