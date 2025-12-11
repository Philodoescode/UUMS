import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { STUDENT_LINKS } from "@/config/navLinks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    BookOpenIcon,
    CalendarIcon,
    RefreshCwIcon,
    AlertTriangleIcon,
    GraduationCapIcon,
    ArrowLeftIcon,
    BuildingIcon,
    UsersIcon,
    LinkIcon,
    FileTextIcon,
    DownloadIcon,
    ListIcon,
    StarIcon,
    MessageSquareIcon,
    Loader2Icon,
} from "lucide-react";
import api from "@/lib/api";

interface Course {
    id: string;
    courseCode: string;
    name: string;
    description: string;
    credits: number;
    semester: string;
    year: number;
    courseType: string;
    capacity: number;
    courseOutline: string | null;
    syllabusUrl: string | null;
    department?: {
        id: string;
        name: string;
        code: string;
    };
    prerequisites?: Course[];
}

interface GradeInfo {
    grade: string | null;
    feedback: string | null;
    status: string;
}

const CourseDetails = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const [course, setCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [gradeInfo, setGradeInfo] = useState<GradeInfo | null>(null);
    const [isLoadingGrade, setIsLoadingGrade] = useState(false);
    const [showGrade, setShowGrade] = useState(false);

    const fetchCourse = useCallback(async () => {
        if (!courseId) return;

        setIsLoading(true);
        setError(null);
        try {
            const response = await api.get(`/courses/${courseId}`);
            setCourse(response.data);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to load course details";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [courseId]);

    const fetchGrade = useCallback(async () => {
        if (!courseId) return;

        setIsLoadingGrade(true);
        try {
            const response = await api.get(`/enrollments/my-grade/${courseId}`);
            setGradeInfo({
                grade: response.data.grade,
                feedback: response.data.feedback,
                status: response.data.status,
            });
            setShowGrade(true);
        } catch (err: unknown) {
            console.error("Failed to load grade:", err);
            setGradeInfo(null);
            setShowGrade(true);
        } finally {
            setIsLoadingGrade(false);
        }
    }, [courseId]);

    useEffect(() => {
        fetchCourse();
    }, [fetchCourse]);

    const handleBack = () => {
        navigate("/student/academics");
    };

    const handleDownloadSyllabus = () => {
        if (course?.syllabusUrl) {
            window.open(course.syllabusUrl, "_blank");
        }
    };

    const handleViewGrades = () => {
        if (!showGrade) {
            fetchGrade();
        } else {
            setShowGrade(false);
        }
    };

    const getGradeColor = (grade: string | null) => {
        if (!grade) return "bg-gray-100 text-gray-600";
        const gradeUpper = grade.toUpperCase();
        if (gradeUpper.startsWith('A')) return "bg-green-100 text-green-700 border-green-300";
        if (gradeUpper.startsWith('B')) return "bg-blue-100 text-blue-700 border-blue-300";
        if (gradeUpper.startsWith('C')) return "bg-yellow-100 text-yellow-700 border-yellow-300";
        if (gradeUpper.startsWith('D')) return "bg-orange-100 text-orange-700 border-orange-300";
        return "bg-red-100 text-red-700 border-red-300";
    };

    if (isLoading) {
        return (
            <div className="flex flex-col min-h-screen">
                <Navbar links={STUDENT_LINKS} />
                <main className="flex-grow bg-background">
                    <div className="container mx-auto px-4 py-8 max-w-4xl">
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <RefreshCwIcon className="size-8 animate-spin mx-auto text-muted-foreground" />
                                <p className="text-muted-foreground mt-2">Loading course details...</p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (error || !course) {
        return (
            <div className="flex flex-col min-h-screen">
                <Navbar links={STUDENT_LINKS} />
                <main className="flex-grow bg-background">
                    <div className="container mx-auto px-4 py-8 max-w-4xl">
                        <Button variant="ghost" onClick={handleBack} className="mb-6 gap-2">
                            <ArrowLeftIcon className="size-4" />
                            Back to Academics
                        </Button>
                        <Card className="border-destructive/50">
                            <CardHeader>
                                <div className="flex items-center gap-2 text-destructive">
                                    <AlertTriangleIcon className="size-5" />
                                    <CardTitle>Error Loading Course</CardTitle>
                                </div>
                                <CardDescription>{error || "Course not found"}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button onClick={fetchCourse} variant="outline">
                                    Try Again
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar links={STUDENT_LINKS} />
            <main className="flex-grow bg-background">
                <div className="container mx-auto px-4 py-8 max-w-4xl">
                    {/* Back Button */}
                    <Button variant="ghost" onClick={handleBack} className="mb-6 gap-2">
                        <ArrowLeftIcon className="size-4" />
                        Back to Academics
                    </Button>

                    {/* Course Header Card */}
                    <Card className="mb-6">
                        <CardHeader>
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                <Badge variant="default" className="text-sm">
                                    {course.courseCode}
                                </Badge>
                                <Badge
                                    variant="outline"
                                    className={
                                        course.courseType === "Core"
                                            ? "border-blue-500 text-blue-600 bg-blue-50"
                                            : "border-green-500 text-green-600 bg-green-50"
                                    }
                                >
                                    {course.courseType}
                                </Badge>
                            </div>
                            <CardTitle className="text-2xl">{course.name}</CardTitle>
                            {course.department && (
                                <CardDescription className="flex items-center gap-2 mt-1">
                                    <BuildingIcon className="size-4" />
                                    {course.department.name}
                                </CardDescription>
                            )}
                        </CardHeader>
                        <CardContent>
                            {/* Course Info Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="flex items-center gap-2">
                                    <BookOpenIcon className="size-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Credits</p>
                                        <p className="font-semibold">{course.credits}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CalendarIcon className="size-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Semester</p>
                                        <p className="font-semibold">{course.semester} {course.year}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <UsersIcon className="size-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Capacity</p>
                                        <p className="font-semibold">{course.capacity} seats</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <GraduationCapIcon className="size-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Type</p>
                                        <p className="font-semibold">{course.courseType}</p>
                                    </div>
                                </div>
                            </div>

                            <Separator className="my-6" />

                            {/* View Grades Section */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="flex items-center gap-2 font-semibold text-lg">
                                        <StarIcon className="size-5" />
                                        My Grade
                                    </h3>
                                    <Button
                                        onClick={handleViewGrades}
                                        variant={showGrade ? "secondary" : "default"}
                                        disabled={isLoadingGrade}
                                        className="gap-2"
                                    >
                                        {isLoadingGrade ? (
                                            <>
                                                <Loader2Icon className="size-4 animate-spin" />
                                                Loading...
                                            </>
                                        ) : showGrade ? (
                                            "Hide Grade"
                                        ) : (
                                            <>
                                                <StarIcon className="size-4" />
                                                View Grades
                                            </>
                                        )}
                                    </Button>
                                </div>

                                {showGrade && (
                                    <div className="mt-4 space-y-4">
                                        {gradeInfo ? (
                                            <>
                                                {/* Grade Display */}
                                                <div className="flex items-center gap-4">
                                                    <div className={`px-6 py-4 rounded-lg border-2 ${getGradeColor(gradeInfo.grade)}`}>
                                                        <p className="text-xs uppercase tracking-wide opacity-75">Grade</p>
                                                        <p className="text-3xl font-bold">
                                                            {gradeInfo.grade || "N/A"}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Status</p>
                                                        <Badge variant={gradeInfo.status === 'completed' ? 'default' : 'secondary'}>
                                                            {gradeInfo.status}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                {/* Feedback Section */}
                                                {gradeInfo.feedback && (
                                                    <div className="bg-muted/50 rounded-lg p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <MessageSquareIcon className="size-4 text-muted-foreground" />
                                                            <p className="font-medium text-sm">Instructor Feedback</p>
                                                        </div>
                                                        <p className="text-muted-foreground leading-relaxed">
                                                            {gradeInfo.feedback}
                                                        </p>
                                                    </div>
                                                )}

                                                {!gradeInfo.grade && !gradeInfo.feedback && (
                                                    <p className="text-muted-foreground">
                                                        No grade has been assigned yet for this course.
                                                    </p>
                                                )}
                                            </>
                                        ) : (
                                            <p className="text-muted-foreground">
                                                Unable to load grade information. You may not be enrolled in this course.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <Separator className="my-6" />

                            {/* Description */}
                            <div className="mb-6">
                                <h3 className="flex items-center gap-2 font-semibold text-lg mb-3">
                                    <FileTextIcon className="size-5" />
                                    Course Description
                                </h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    {course.description || "No description available for this course."}
                                </p>
                            </div>

                            <Separator className="my-6" />

                            {/* Prerequisites */}
                            <div className="mb-6">
                                <h3 className="flex items-center gap-2 font-semibold text-lg mb-3">
                                    <LinkIcon className="size-5" />
                                    Prerequisites
                                </h3>
                                {course.prerequisites && course.prerequisites.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {course.prerequisites.map((prereq) => (
                                            <Badge
                                                key={prereq.id}
                                                variant="secondary"
                                                className="py-1.5 px-3"
                                            >
                                                <GraduationCapIcon className="size-3 mr-1.5" />
                                                {prereq.courseCode}: {prereq.name}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground">
                                        No prerequisites required for this course.
                                    </p>
                                )}
                            </div>

                            <Separator className="my-6" />

                            {/* Course Outline */}
                            <div className="mb-6">
                                <h3 className="flex items-center gap-2 font-semibold text-lg mb-3">
                                    <ListIcon className="size-5" />
                                    Course Outline
                                </h3>
                                {course.courseOutline ? (
                                    <div className="bg-muted/50 rounded-lg p-4">
                                        <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans">
                                            {course.courseOutline}
                                        </pre>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground">
                                        No course outline available yet.
                                    </p>
                                )}
                            </div>

                            <Separator className="my-6" />

                            {/* Syllabus Download */}
                            <div>
                                <h3 className="flex items-center gap-2 font-semibold text-lg mb-3">
                                    <DownloadIcon className="size-5" />
                                    Syllabus
                                </h3>
                                {course.syllabusUrl ? (
                                    <Button onClick={handleDownloadSyllabus} className="gap-2">
                                        <DownloadIcon className="size-4" />
                                        Download Syllabus
                                    </Button>
                                ) : (
                                    <p className="text-muted-foreground">
                                        No syllabus file available for download.
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
};

export default CourseDetails;

