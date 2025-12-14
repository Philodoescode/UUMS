import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { INSTRUCTOR_LINKS } from "@/config/navLinks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    BookOpenIcon,
    UsersIcon,
    RefreshCwIcon,
    AlertTriangleIcon,
    GraduationCapIcon,
    SaveIcon,
    Loader2Icon,
    CheckCircleIcon,
    ClipboardListIcon,
    HistoryIcon,
} from "lucide-react";
import api from "@/lib/api";
import { AxiosError } from "axios";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";

interface Course {
    id: string;
    courseCode: string;
    name: string;
    semester: string;
    year: number;
}

interface Student {
    id: string;
    fullName: string;
    email: string;
}

interface Enrollment {
    id: string;
    status: string;
    grade: string | null;
    feedback: string | null;
    student: Student;
    course: Course;
}

interface AuditLogEntry {
    id: string;
    previousGrade: string | null;
    newGrade: string;
    action: string;
    createdAt: string;
    student: Student;
    advisor: { id: string; fullName: string };
}

const GradeManagement = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string>("");
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
    const [isLoadingCourses, setIsLoadingCourses] = useState(true);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [isLoadingAudit, setIsLoadingAudit] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAuditLog, setShowAuditLog] = useState(false);

    // Grade editing state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [gradeInput, setGradeInput] = useState("");
    const [feedbackInput, setFeedbackInput] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchCourses = useCallback(async () => {
        setIsLoadingCourses(true);
        setError(null);
        try {
            const response = await api.get("/instructor-portal/my-courses");
            setCourses(response.data);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to load courses";
            setError(errorMessage);
        } finally {
            setIsLoadingCourses(false);
        }
    }, []);

    const fetchStudents = useCallback(async (courseId: string) => {
        setIsLoadingStudents(true);
        try {
            const response = await api.get(`/instructor-portal/courses/${courseId}/students`);
            setEnrollments(response.data);
        } catch (err: unknown) {
            console.error("Failed to load students:", err);
            setEnrollments([]);
        } finally {
            setIsLoadingStudents(false);
        }
    }, []);

    const fetchAuditLog = useCallback(async (courseId: string) => {
        setIsLoadingAudit(true);
        try {
            const response = await api.get(`/instructor-portal/courses/${courseId}/audit-log`);
            setAuditLog(response.data);
        } catch (err: unknown) {
            console.error("Failed to load audit log:", err);
            setAuditLog([]);
        } finally {
            setIsLoadingAudit(false);
        }
    }, []);

    useEffect(() => {
        fetchCourses();
    }, [fetchCourses]);

    useEffect(() => {
        if (selectedCourseId) {
            fetchStudents(selectedCourseId);
            fetchAuditLog(selectedCourseId);
        } else {
            setEnrollments([]);
            setAuditLog([]);
        }
    }, [selectedCourseId, fetchStudents, fetchAuditLog]);

    const handleEditGrade = (enrollment: Enrollment) => {
        setEditingId(enrollment.id);
        setGradeInput(enrollment.grade || "");
        setFeedbackInput(enrollment.feedback || "");
        setSaveMessage(null);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setGradeInput("");
        setFeedbackInput("");
        setSaveMessage(null);
    };

    const handleSaveGrade = async (enrollmentId: string) => {
        if (!gradeInput.trim()) {
            setSaveMessage({ type: 'error', text: 'Grade is required' });
            return;
        }

        setIsSaving(true);
        setSaveMessage(null);

        try {
            await api.put(`/instructor-portal/enrollments/${enrollmentId}/grade`, {
                grade: gradeInput.trim(),
                feedback: feedbackInput.trim() || null,
            });

            // Refresh data
            await fetchStudents(selectedCourseId);
            await fetchAuditLog(selectedCourseId);

            setSaveMessage({ type: 'success', text: 'Grade saved successfully!' });
            setEditingId(null);
            setGradeInput("");
            setFeedbackInput("");
        } catch (err: unknown) {
            let errorMessage = 'Failed to save grade';
            if (err instanceof AxiosError && err.response?.data?.message) {
                errorMessage = err.response.data.message;
            }
            setSaveMessage({ type: 'error', text: errorMessage });
        } finally {
            setIsSaving(false);
        }
    };

    const selectedCourse = courses.find(c => c.id === selectedCourseId);

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar links={INSTRUCTOR_LINKS} />
            <main className="flex-grow bg-background">
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <ClipboardListIcon className="size-8 text-primary" />
                            <h1 className="text-3xl font-bold">Grade Management</h1>
                        </div>
                        <p className="text-muted-foreground">
                            Assign and update grades for students in your courses
                        </p>
                    </div>

                    {/* Course Selection */}
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="text-lg">Select Course</CardTitle>
                            <CardDescription>Choose a course to view and manage student grades</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="w-full sm:w-80">
                                    <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a course..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {courses.map((course) => (
                                                <SelectItem key={course.id} value={course.id}>
                                                    {course.courseCode} - {course.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={fetchCourses}
                                    disabled={isLoadingCourses}
                                    className="gap-2"
                                >
                                    <RefreshCwIcon className={`size-4 ${isLoadingCourses ? "animate-spin" : ""}`} />
                                    Refresh
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Content */}
                    {isLoadingCourses ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <RefreshCwIcon className="size-8 animate-spin mx-auto text-muted-foreground" />
                                <p className="text-muted-foreground mt-2">Loading courses...</p>
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
                                <Button onClick={fetchCourses} variant="outline">
                                    Try Again
                                </Button>
                            </EmptyContent>
                        </Empty>
                    ) : courses.length === 0 ? (
                        <Empty className="py-12">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <BookOpenIcon className="size-8 text-muted-foreground" />
                                </EmptyMedia>
                                <EmptyTitle>No courses assigned</EmptyTitle>
                                <EmptyDescription>
                                    You are not assigned to any courses yet.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : !selectedCourseId ? (
                        <Empty className="py-12">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <GraduationCapIcon className="size-8 text-muted-foreground" />
                                </EmptyMedia>
                                <EmptyTitle>Select a course</EmptyTitle>
                                <EmptyDescription>
                                    Choose a course from the dropdown above to view and manage student grades.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        <>
                            {/* Course Info & Toggle */}
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-semibold">{selectedCourse?.name}</h2>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedCourse?.courseCode} • {selectedCourse?.semester} {selectedCourse?.year}
                                    </p>
                                </div>
                                <Button
                                    variant={showAuditLog ? "default" : "outline"}
                                    onClick={() => setShowAuditLog(!showAuditLog)}
                                    className="gap-2"
                                >
                                    <HistoryIcon className="size-4" />
                                    {showAuditLog ? "Hide" : "View"} Audit Log
                                </Button>
                            </div>

                            {/* Audit Log */}
                            {showAuditLog && (
                                <Card className="mb-6">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <HistoryIcon className="size-5" />
                                            Grade Change History
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {isLoadingAudit ? (
                                            <p className="text-muted-foreground">Loading...</p>
                                        ) : auditLog.length === 0 ? (
                                            <p className="text-muted-foreground">No grade changes recorded yet.</p>
                                        ) : (
                                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                                {auditLog.map((entry) => (
                                                    <div key={entry.id} className="flex items-center gap-3 text-sm p-2 bg-muted/50 rounded">
                                                        <Badge variant={entry.action === 'assigned' ? 'default' : 'secondary'}>
                                                            {entry.action}
                                                        </Badge>
                                                        <span className="font-medium">{entry.student.fullName}</span>
                                                        <span className="text-muted-foreground">
                                                            {entry.previousGrade ? `${entry.previousGrade} → ` : ''}{entry.newGrade}
                                                        </span>
                                                        <span className="text-muted-foreground ml-auto">
                                                            {new Date(entry.createdAt).toLocaleString()}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Students List */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <UsersIcon className="size-5" />
                                        Students ({enrollments.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {isLoadingStudents ? (
                                        <div className="flex items-center justify-center py-8">
                                            <RefreshCwIcon className="size-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : enrollments.length === 0 ? (
                                        <p className="text-muted-foreground text-center py-8">
                                            No students enrolled in this course.
                                        </p>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Save Message */}
                                            {saveMessage && (
                                                <div className={`flex items-center gap-2 p-3 rounded-lg ${saveMessage.type === 'success'
                                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                                    : 'bg-red-50 text-red-700 border border-red-200'
                                                    }`}>
                                                    {saveMessage.type === 'success' ? (
                                                        <CheckCircleIcon className="size-4" />
                                                    ) : (
                                                        <AlertTriangleIcon className="size-4" />
                                                    )}
                                                    <p className="text-sm">{saveMessage.text}</p>
                                                </div>
                                            )}

                                            {enrollments.map((enrollment) => (
                                                <div
                                                    key={enrollment.id}
                                                    className="border rounded-lg p-4"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1">
                                                            <p className="font-medium">{enrollment.student.fullName}</p>
                                                            <p className="text-sm text-muted-foreground">{enrollment.student.email}</p>
                                                            <Badge variant="outline" className="mt-1">
                                                                {enrollment.status}
                                                            </Badge>
                                                        </div>

                                                        {editingId === enrollment.id ? (
                                                            <div className="flex flex-col gap-2 w-64">
                                                                <input
                                                                    type="text"
                                                                    className="px-3 py-2 border rounded-md text-sm"
                                                                    placeholder="Grade (e.g., A, B+, C)"
                                                                    value={gradeInput}
                                                                    onChange={(e) => setGradeInput(e.target.value)}
                                                                    maxLength={5}
                                                                />
                                                                <textarea
                                                                    className="px-3 py-2 border rounded-md text-sm resize-none"
                                                                    placeholder="Feedback (optional)"
                                                                    value={feedbackInput}
                                                                    onChange={(e) => setFeedbackInput(e.target.value)}
                                                                    rows={2}
                                                                />
                                                                <div className="flex gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => handleSaveGrade(enrollment.id)}
                                                                        disabled={isSaving}
                                                                        className="gap-1"
                                                                    >
                                                                        {isSaving ? (
                                                                            <Loader2Icon className="size-3 animate-spin" />
                                                                        ) : (
                                                                            <SaveIcon className="size-3" />
                                                                        )}
                                                                        Save
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={handleCancelEdit}
                                                                        disabled={isSaving}
                                                                    >
                                                                        Cancel
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-right">
                                                                <div className="mb-2">
                                                                    {enrollment.grade ? (
                                                                        <Badge className="text-lg px-3 py-1">
                                                                            {enrollment.grade}
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge variant="outline">No grade</Badge>
                                                                    )}
                                                                </div>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleEditGrade(enrollment)}
                                                                >
                                                                    {enrollment.grade ? "Update Grade" : "Assign Grade"}
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {enrollment.feedback && editingId !== enrollment.id && (
                                                        <>
                                                            <Separator className="my-3" />
                                                            <p className="text-sm text-muted-foreground">
                                                                <strong>Feedback:</strong> {enrollment.feedback}
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default GradeManagement;
