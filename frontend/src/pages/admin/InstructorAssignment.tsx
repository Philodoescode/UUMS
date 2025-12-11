import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { ADMIN_LINKS } from "@/config/navLinks";
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
    UsersIcon,
    RefreshCwIcon,
    AlertTriangleIcon,
    UserPlusIcon,
    Trash2Icon,
    Loader2Icon,
    CheckCircleIcon,
} from "lucide-react";
import api from "@/lib/api";
import { AxiosError } from "axios";

interface Course {
    id: string;
    courseCode: string;
    name: string;
}

interface Instructor {
    id: string;
    title: string;
    user: {
        id: string;
        fullName: string;
        email: string;
    };
    department?: {
        name: string;
    };
    CourseInstructor?: {
        isPrimary: boolean;
    };
}

const InstructorAssignment = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [instructors, setInstructors] = useState<Instructor[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string>("");
    const [courseInstructors, setCourseInstructors] = useState<Instructor[]>([]);
    const [isLoadingCourses, setIsLoadingCourses] = useState(true);
    const [isLoadingInstructors, setIsLoadingInstructors] = useState(true);
    const [isLoadingCourseInstructors, setIsLoadingCourseInstructors] = useState(false);
    const [selectedInstructorId, setSelectedInstructorId] = useState<string>("");
    const [isAssigning, setIsAssigning] = useState(false);
    const [isRemoving, setIsRemoving] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchCourses = useCallback(async () => {
        setIsLoadingCourses(true);
        try {
            const response = await api.get("/courses");
            setCourses(response.data);
        } catch (err) {
            console.error("Failed to load courses:", err);
        } finally {
            setIsLoadingCourses(false);
        }
    }, []);

    const fetchInstructors = useCallback(async () => {
        setIsLoadingInstructors(true);
        try {
            const response = await api.get("/instructors");
            setInstructors(response.data);
        } catch (err) {
            console.error("Failed to load instructors:", err);
        } finally {
            setIsLoadingInstructors(false);
        }
    }, []);

    const fetchCourseInstructors = useCallback(async (courseId: string) => {
        setIsLoadingCourseInstructors(true);
        try {
            const response = await api.get(`/courses/${courseId}/instructors`);
            setCourseInstructors(response.data);
        } catch (err) {
            console.error("Failed to load course instructors:", err);
            setCourseInstructors([]);
        } finally {
            setIsLoadingCourseInstructors(false);
        }
    }, []);

    useEffect(() => {
        fetchCourses();
        fetchInstructors();
    }, [fetchCourses, fetchInstructors]);

    useEffect(() => {
        if (selectedCourseId) {
            fetchCourseInstructors(selectedCourseId);
        } else {
            setCourseInstructors([]);
        }
    }, [selectedCourseId, fetchCourseInstructors]);

    const handleAssignInstructor = async () => {
        if (!selectedCourseId || !selectedInstructorId) return;

        setIsAssigning(true);
        setMessage(null);

        try {
            await api.post(`/courses/${selectedCourseId}/instructors`, {
                instructorId: selectedInstructorId,
                isPrimary: courseInstructors.length === 0, // First instructor is primary
            });
            setMessage({ type: 'success', text: 'Instructor assigned successfully!' });
            setSelectedInstructorId("");
            fetchCourseInstructors(selectedCourseId);
        } catch (err) {
            let errorMessage = 'Failed to assign instructor';
            if (err instanceof AxiosError && err.response?.data?.message) {
                errorMessage = err.response.data.message;
            }
            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setIsAssigning(false);
        }
    };

    const handleRemoveInstructor = async (instructorId: string) => {
        if (!selectedCourseId) return;

        setIsRemoving(instructorId);
        setMessage(null);

        try {
            await api.delete(`/courses/${selectedCourseId}/instructors/${instructorId}`);
            setMessage({ type: 'success', text: 'Instructor removed from course' });
            fetchCourseInstructors(selectedCourseId);
        } catch (err) {
            let errorMessage = 'Failed to remove instructor';
            if (err instanceof AxiosError && err.response?.data?.message) {
                errorMessage = err.response.data.message;
            }
            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setIsRemoving(null);
        }
    };

    // Filter out already assigned instructors from the dropdown
    const availableInstructors = instructors.filter(
        i => !courseInstructors.some(ci => ci.id === i.id)
    );

    const selectedCourse = courses.find(c => c.id === selectedCourseId);

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar links={ADMIN_LINKS} />
            <main className="flex-grow bg-background">
                <div className="container mx-auto px-4 py-8 max-w-4xl">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <UserPlusIcon className="size-8 text-primary" />
                            <h1 className="text-3xl font-bold">Instructor Assignment</h1>
                        </div>
                        <p className="text-muted-foreground">
                            Assign instructors/advisors to courses so they can manage grades
                        </p>
                    </div>

                    {/* Course Selection */}
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="text-lg">Select Course</CardTitle>
                            <CardDescription>Choose a course to manage instructor assignments</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="w-full sm:w-96">
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

                    {/* Main Content */}
                    {!selectedCourseId ? (
                        <Card className="py-12">
                            <CardContent className="text-center">
                                <BookOpenIcon className="size-12 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-lg font-medium mb-1">Select a Course</h3>
                                <p className="text-muted-foreground">
                                    Choose a course from the dropdown above to manage its instructors
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            {/* Selected Course Info */}
                            <div className="mb-4">
                                <h2 className="text-xl font-semibold">{selectedCourse?.name}</h2>
                                <p className="text-sm text-muted-foreground">{selectedCourse?.courseCode}</p>
                            </div>

                            {/* Message */}
                            {message && (
                                <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${message.type === 'success'
                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                    }`}>
                                    {message.type === 'success' ? (
                                        <CheckCircleIcon className="size-4" />
                                    ) : (
                                        <AlertTriangleIcon className="size-4" />
                                    )}
                                    <p className="text-sm">{message.text}</p>
                                </div>
                            )}

                            {/* Add Instructor */}
                            <Card className="mb-6">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <UserPlusIcon className="size-5" />
                                        Add Instructor
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="w-full sm:w-80">
                                            <Select
                                                value={selectedInstructorId}
                                                onValueChange={setSelectedInstructorId}
                                                disabled={isLoadingInstructors || availableInstructors.length === 0}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={
                                                        isLoadingInstructors
                                                            ? "Loading instructors..."
                                                            : instructors.length === 0
                                                                ? "No instructors found in system"
                                                                : availableInstructors.length === 0
                                                                    ? "All instructors assigned"
                                                                    : "Select an instructor..."
                                                    } />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableInstructors.map((instructor) => (
                                                        <SelectItem key={instructor.id} value={instructor.id}>
                                                            {instructor.user.fullName} ({instructor.title})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                        </div>
                                        <Button
                                            onClick={handleAssignInstructor}
                                            disabled={isAssigning || !selectedInstructorId}
                                            className="gap-2"
                                        >
                                            {isAssigning ? (
                                                <>
                                                    <Loader2Icon className="size-4 animate-spin" />
                                                    Assigning...
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlusIcon className="size-4" />
                                                    Assign
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Current Instructors */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <UsersIcon className="size-5" />
                                        Assigned Instructors ({courseInstructors.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {isLoadingCourseInstructors ? (
                                        <div className="flex items-center justify-center py-8">
                                            <RefreshCwIcon className="size-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : courseInstructors.length === 0 ? (
                                        <p className="text-muted-foreground text-center py-8">
                                            No instructors assigned to this course yet.
                                        </p>
                                    ) : (
                                        <div className="space-y-3">
                                            {courseInstructors.map((instructor) => (
                                                <div
                                                    key={instructor.id}
                                                    className="flex items-center justify-between p-3 border rounded-lg"
                                                >
                                                    <div>
                                                        <p className="font-medium">{instructor.user.fullName}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {instructor.title} • {instructor.user.email}
                                                        </p>
                                                        {instructor.department && (
                                                            <p className="text-xs text-muted-foreground">
                                                                {instructor.department.name}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {instructor.CourseInstructor?.isPrimary && (
                                                            <Badge>Primary</Badge>
                                                        )}
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleRemoveInstructor(instructor.id)}
                                                            disabled={isRemoving === instructor.id}
                                                            className="gap-1"
                                                        >
                                                            {isRemoving === instructor.id ? (
                                                                <Loader2Icon className="size-3 animate-spin" />
                                                            ) : (
                                                                <Trash2Icon className="size-3" />
                                                            )}
                                                            Remove
                                                        </Button>
                                                    </div>
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

export default InstructorAssignment;
