import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { STUDENT_LINKS } from "@/config/navLinks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    BookOpenIcon,
    CalendarIcon,
    RefreshCwIcon,
    AlertTriangleIcon,
    GraduationCapIcon,
    ChevronRightIcon,
    ClockIcon,
    UsersIcon,
} from "lucide-react";
import { IconSchool } from "@tabler/icons-react";
import api from "@/lib/api";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";

interface Instructor {
    id: string;
    title: string;
    officeLocation: string | null;
    officeHours: string | null;
    user: {
        id: string;
        fullName: string;
        email: string;
    };
    department: {
        id: string;
        name: string;
    };
}

interface Course {
    id: string;
    courseCode: string;
    name: string;
    description: string;
    credits: number;
    semester: string;
    year: number;
    courseType: string;
    department?: {
        id: string;
        name: string;
        code: string;
    };
    instructors?: Instructor[];
}

interface Enrollment {
    id: string;
    status: string;
    grade: string | null;
    enrolledAt: string;
    course: Course;
}

const Academics = () => {
    const navigate = useNavigate();
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const fetchEnrollments = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.get("/enrollments/my-courses");
            setEnrollments(response.data);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to load enrollments";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEnrollments();
    }, [fetchEnrollments]);

    const filteredEnrollments = enrollments.filter((enrollment) => {
        if (statusFilter === "all") return true;
        return enrollment.status === statusFilter;
    });

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case "enrolled":
                return "default";
            case "completed":
                return "secondary";
            case "waitlisted":
                return "outline";
            case "pending":
                return "secondary"; // or a custom variant if available
            default:
                return "outline";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "enrolled":
                return "Currently Enrolled";
            case "completed":
                return "Completed";
            case "waitlisted":
                return "Waitlisted";
            case "pending":
                return "Pending Approval";
            default:
                return status;
        }
    };

    const handleCourseClick = (courseId: string) => {
        navigate(`/student/academics/${courseId}`);
    };

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar links={STUDENT_LINKS} />
            <main className="flex-grow bg-background">
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <GraduationCapIcon className="size-8 text-primary" />
                            <h1 className="text-3xl font-bold">My Academics</h1>
                        </div>
                        <p className="text-muted-foreground">
                            View your enrolled courses and academic progress
                        </p>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="w-full sm:w-64">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Courses</SelectItem>
                                    <SelectItem value="enrolled">Currently Enrolled</SelectItem>
                                    <SelectItem value="pending">Pending Approval</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="waitlisted">Waitlisted</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button variant="outline" onClick={fetchEnrollments} disabled={isLoading} className="gap-2">
                            <RefreshCwIcon className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                    </div>

                    {/* Content */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <RefreshCwIcon className="size-8 animate-spin mx-auto text-muted-foreground" />
                                <p className="text-muted-foreground mt-2">Loading your courses...</p>
                            </div>
                        </div>
                    ) : error ? (
                        <Empty className="py-12">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <AlertTriangleIcon className="size-8 text-destructive" />
                                </EmptyMedia>
                                <EmptyTitle>Error loading courses</EmptyTitle>
                                <EmptyDescription>{error}</EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button onClick={fetchEnrollments} variant="outline">
                                    Try Again
                                </Button>
                            </EmptyContent>
                        </Empty>
                    ) : filteredEnrollments.length === 0 ? (
                        <Empty className="py-12">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <IconSchool className="size-8 text-muted-foreground" />
                                </EmptyMedia>
                                <EmptyTitle>No courses found</EmptyTitle>
                                <EmptyDescription>
                                    {statusFilter === "all"
                                        ? "You haven't enrolled in any courses yet. Browse the course catalog to register."
                                        : `No courses with status "${getStatusLabel(statusFilter)}" found.`}
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                {statusFilter === "all" ? (
                                    <Button onClick={() => navigate("/student/catalog")}>
                                        Browse Catalog
                                    </Button>
                                ) : (
                                    <Button onClick={() => setStatusFilter("all")} variant="outline">
                                        Clear Filter
                                    </Button>
                                )}
                            </EmptyContent>
                        </Empty>
                    ) : (
                        <>
                            <p className="text-sm text-muted-foreground mb-4">
                                Showing {filteredEnrollments.length} course{filteredEnrollments.length !== 1 ? "s" : ""}
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredEnrollments.map((enrollment) => (
                                    <Card
                                        key={enrollment.id}
                                        className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/50 group"
                                        onClick={() => handleCourseClick(enrollment.course.id)}
                                    >
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge variant="default">{enrollment.course.courseCode}</Badge>
                                                    <Badge variant={getStatusBadgeVariant(enrollment.status)}>
                                                        {getStatusLabel(enrollment.status)}
                                                    </Badge>
                                                </div>
                                                <ChevronRightIcon className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                            </div>
                                            <CardTitle className="text-lg leading-tight mt-2">
                                                {enrollment.course.name}
                                            </CardTitle>
                                            <CardDescription className="line-clamp-2">
                                                {enrollment.course.description || "No description available"}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-2 gap-3 text-sm">
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <BookOpenIcon className="size-4" />
                                                        <span>{enrollment.course.credits} Credits</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <CalendarIcon className="size-4" />
                                                        <span>{enrollment.course.semester} {enrollment.course.year}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                                                        <ClockIcon className="size-4" />
                                                        <span>Enrolled: {new Date(enrollment.enrolledAt).toLocaleDateString()}</span>
                                                    </div>
                                                    {enrollment.grade && (
                                                        <div className="col-span-2">
                                                            <Badge variant="secondary" className="text-sm">
                                                                Grade: {enrollment.grade}
                                                            </Badge>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Staff Information */}
                                                {enrollment.course.instructors && enrollment.course.instructors.length > 0 && (
                                                    <div className="pt-3 border-t">
                                                        <div className="flex items-start gap-2 text-sm">
                                                            <UsersIcon className="size-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {enrollment.course.instructors.map((instructor, idx) => (
                                                                    <span key={instructor.id}>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                navigate(`/student/profile/${instructor.id}`);
                                                                            }}
                                                                            className="text-primary hover:underline font-medium"
                                                                        >
                                                                            {instructor.user.fullName}
                                                                        </button>
                                                                        {idx < enrollment.course.instructors!.length - 1 && <span className="text-muted-foreground">, </span>}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Academics;
