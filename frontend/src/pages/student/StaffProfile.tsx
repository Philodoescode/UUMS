import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { STUDENT_LINKS } from "@/config/navLinks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    UserIcon,
    MailIcon,
    MapPinIcon,
    ClockIcon,
    BookOpenIcon,
    AwardIcon,
    ArrowLeftIcon,
    RefreshCwIcon,
    AlertTriangleIcon,
    BuildingIcon,
} from "lucide-react";
import { getInstructorProfile, type InstructorProfilePublic } from "@/lib/profileService";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";

const StaffProfile = () => {
    const { instructorId } = useParams<{ instructorId: string }>();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<InstructorProfilePublic | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = async () => {
        if (!instructorId) return;

        setIsLoading(true);
        setError(null);
        try {
            const data = await getInstructorProfile(instructorId);
            setProfile(data);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to load profile";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [instructorId]);

    const isInstructor = profile?.user?.role?.name === 'instructor';
    const roleLabel = isInstructor ? 'Instructor' : 'Teaching Assistant';

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar links={STUDENT_LINKS} />
            <main className="flex-grow bg-background">
                <div className="container mx-auto px-4 py-8 max-w-5xl">
                    {/* Back Button */}
                    <Button
                        variant="ghost"
                        onClick={() => navigate(-1)}
                        className="mb-6 gap-2"
                    >
                        <ArrowLeftIcon className="size-4" />
                        Back
                    </Button>

                    {/* Loading State */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <RefreshCwIcon className="size-8 animate-spin mx-auto text-muted-foreground" />
                                <p className="text-muted-foreground mt-2">Loading profile...</p>
                            </div>
                        </div>
                    ) : error ? (
                        /* Error State */
                        <Empty className="py-12">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <AlertTriangleIcon className="size-8 text-destructive" />
                                </EmptyMedia>
                                <EmptyTitle>Error loading profile</EmptyTitle>
                                <EmptyDescription>{error}</EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button onClick={fetchProfile} variant="outline">
                                    Try Again
                                </Button>
                            </EmptyContent>
                        </Empty>
                    ) : !profile ? (
                        /* Not Found State */
                        <Empty className="py-12">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <UserIcon className="size-8 text-muted-foreground" />
                                </EmptyMedia>
                                <EmptyTitle>Profile not found</EmptyTitle>
                                <EmptyDescription>
                                    The requested staff profile could not be found.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button onClick={() => navigate(-1)} variant="outline">
                                    Go Back
                                </Button>
                            </EmptyContent>
                        </Empty>
                    ) : (
                        /* Profile Content */
                        <div className="space-y-6">
                            {/* Header Card */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
                                                <UserIcon className="size-8 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-2xl">{profile.user.fullName}</CardTitle>
                                                <CardDescription className="text-base mt-1">
                                                    {profile.title}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Badge variant="default">{roleLabel}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Email */}
                                        <div className="flex items-center gap-3 text-sm">
                                            <MailIcon className="size-4 text-muted-foreground flex-shrink-0" />
                                            <a
                                                href={`mailto:${profile.user.email}`}
                                                className="text-primary hover:underline"
                                            >
                                                {profile.user.email}
                                            </a>
                                        </div>

                                        {/* Department */}
                                        <div className="flex items-center gap-3 text-sm">
                                            <BuildingIcon className="size-4 text-muted-foreground flex-shrink-0" />
                                            <span>
                                                {profile.department.name} ({profile.department.code})
                                            </span>
                                        </div>

                                        {/* Office Location */}
                                        {profile.officeLocation && (
                                            <div className="flex items-center gap-3 text-sm">
                                                <MapPinIcon className="size-4 text-muted-foreground flex-shrink-0" />
                                                <span>{profile.officeLocation}</span>
                                            </div>
                                        )}

                                        {/* Office Hours */}
                                        {profile.officeHours && (
                                            <div className="flex items-center gap-3 text-sm">
                                                <ClockIcon className="size-4 text-muted-foreground flex-shrink-0" />
                                                <span>{profile.officeHours}</span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Courses Card */}
                            {profile.courses && profile.courses.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-2">
                                            <BookOpenIcon className="size-5 text-primary" />
                                            <CardTitle>
                                                {isInstructor ? 'Courses Taught' : 'Assigned Courses'}
                                            </CardTitle>
                                        </div>
                                        <CardDescription>
                                            {isInstructor
                                                ? 'Currently teaching the following courses'
                                                : 'Currently assigned to the following courses'}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {profile.courses.map((course) => (
                                                <div
                                                    key={course.id}
                                                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                                >
                                                    <div>
                                                        <div className="font-medium">{course.name}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {course.courseCode}
                                                        </div>
                                                    </div>
                                                    <Badge variant="outline">
                                                        {course.semester} {course.year}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Awards Card (Instructors Only) */}
                            {isInstructor && profile.awards && profile.awards.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-2">
                                            <AwardIcon className="size-5 text-primary" />
                                            <CardTitle>Awards & Recognition</CardTitle>
                                        </div>
                                        <CardDescription>
                                            Professional achievements and honors
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {profile.awards.map((award, index) => (
                                                <div
                                                    key={index}
                                                    className="p-4 rounded-lg border bg-card"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h4 className="font-semibold">{award.title}</h4>
                                                        {award.year && (
                                                            <Badge variant="secondary">{award.year}</Badge>
                                                        )}
                                                    </div>
                                                    {award.description && (
                                                        <p className="text-sm text-muted-foreground mt-2">
                                                            {award.description}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default StaffProfile;
