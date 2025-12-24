import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { INSTRUCTOR_LINKS } from "@/config/navLinks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { getMyProfile, updateMyProfile } from "@/lib/profileService";
import type { Award, InstructorProfile } from "@/lib/profileService";
import { RefreshCwIcon, PlusIcon, TrashIcon, SaveIcon, UserIcon, StarIcon, MessageCircleIcon } from "lucide-react";
import api from "@/lib/api";

const Profile = () => {
    useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<InstructorProfile | null>(null);

    const [officeLocation, setOfficeLocation] = useState("");
    const [officeHours, setOfficeHours] = useState("");
    const [awards, setAwards] = useState<Award[]>([]);
    const [feedbackStats, setFeedbackStats] = useState<any[]>([]);
    const [feedbackComments, setFeedbackComments] = useState<any[]>([]);

    useEffect(() => {
        fetchProfile();
        fetchFeedback();
    }, []);

    const fetchFeedback = async () => {
        try {
            const response = await api.get('/feedback/my-feedback');
            setFeedbackStats(response.data.stats);
            setFeedbackComments(response.data.comments);
        } catch (error) {
            console.error("Failed to fetch feedback", error);
        }
    };

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const data = await getMyProfile();
            setProfile(data);
            setOfficeLocation(data.officeLocation || "");
            setOfficeHours(data.officeHours || "");
            setAwards(data.awards || []);
        } catch (error: unknown) {
            console.error("Failed to fetch profile", error);
            toast.error("Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const updatedProfile = await updateMyProfile({
                officeLocation,
                officeHours,
                awards,
            });
            setProfile(updatedProfile);
            toast.success("Profile updated successfully!");
        } catch (error: unknown) {
            console.error("Failed to update profile", error);
            toast.error("Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const addAward = () => {
        setAwards([...awards, { title: "", year: new Date().getFullYear(), description: "" }]);
    };

    const updateAward = (index: number, field: keyof Award, value: string | number) => {
        const newAwards = [...awards];
        newAwards[index] = { ...newAwards[index], [field]: value };
        setAwards(newAwards);
    };

    const removeAward = (index: number) => {
        setAwards(awards.filter((_, i) => i !== index));
    };

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

    if (!profile) {
        return (
            <div className="flex flex-col min-h-screen">
                <Navbar links={INSTRUCTOR_LINKS} />
                <main className="flex-grow bg-background flex items-center justify-center">
                    <div className="text-center">
                        <UserIcon className="size-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">No instructor profile found.</p>
                        <p className="text-sm text-muted-foreground mt-2">Please contact an administrator.</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar links={INSTRUCTOR_LINKS} />
            <main className="flex-grow bg-background p-8">
                <div className="container mx-auto max-w-3xl space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold">My Profile</h1>
                        <p className="text-muted-foreground">Update your public profile information</p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Account Information</CardTitle>
                            <CardDescription>These details are managed by the administrator</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground text-sm">Full Name</Label>
                                    <p className="font-medium">{profile.user.fullName}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-sm">Email</Label>
                                    <p className="font-medium">{profile.user.email}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-sm">Title</Label>
                                    <p className="font-medium">{profile.title}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-sm">Department</Label>
                                    <p className="font-medium">{profile.department?.name || "N/A"}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Profile Details</CardTitle>
                            <CardDescription>Update your office information and hours</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="officeLocation">Office Number / Location</Label>
                                <Input
                                    id="officeLocation"
                                    placeholder="e.g., Building A, Room 305"
                                    value={officeLocation}
                                    onChange={(e) => setOfficeLocation(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="officeHours">Office Hours</Label>
                                <Input
                                    id="officeHours"
                                    placeholder="e.g., Monday & Wednesday 2:00 PM - 4:00 PM"
                                    value={officeHours}
                                    onChange={(e) => setOfficeHours(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">Awards & Achievements</CardTitle>
                                    <CardDescription>Highlight your accomplishments</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={addAward}>
                                    <PlusIcon className="size-4 mr-1" />
                                    Add Award
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {awards.length === 0 ? (
                                <p className="text-muted-foreground text-sm text-center py-4">
                                    No awards added yet. Click "Add Award" to get started.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {awards.map((award, index) => (
                                        <div key={index} className="border rounded-lg p-4 space-y-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    <div className="md:col-span-2">
                                                        <Label className="text-sm">Award Title *</Label>
                                                        <Input
                                                            placeholder="e.g., Best Researcher Award"
                                                            value={award.title}
                                                            onChange={(e) => updateAward(index, "title", e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-sm">Year</Label>
                                                        <Input
                                                            type="number"
                                                            placeholder="2024"
                                                            value={award.year || ""}
                                                            onChange={(e) => updateAward(index, "year", parseInt(e.target.value) || 0)}
                                                        />
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => removeAward(index)}
                                                >
                                                    <TrashIcon className="size-4" />
                                                </Button>
                                            </div>
                                            <div>
                                                <Label className="text-sm">Description (optional)</Label>
                                                <Input
                                                    placeholder="Brief description of the award"
                                                    value={award.description || ""}
                                                    onChange={(e) => updateAward(index, "description", e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <MessageCircleIcon className="size-5" />
                                Student Feedback
                            </CardTitle>
                            <CardDescription>Anonymous feedback from your enrolled students</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div className="bg-muted p-4 rounded-lg text-center">
                                    <div className="text-3xl font-bold text-primary">
                                        {feedbackStats.length > 0
                                            ? (feedbackStats.reduce((acc, curr) => acc + parseFloat(curr.averageRating) * parseInt(curr.totalReviews), 0) /
                                                feedbackStats.reduce((acc, curr) => acc + parseInt(curr.totalReviews), 0)).toFixed(1)
                                            : "N/A"
                                        }
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1">Overall Rating</div>
                                </div>
                                <div className="bg-muted p-4 rounded-lg text-center">
                                    <div className="text-3xl font-bold">
                                        {feedbackStats.reduce((acc, curr) => acc + parseInt(curr.totalReviews), 0)}
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1">Total Reviews</div>
                                </div>
                            </div>

                            <Separator className="my-4" />

                            <h3 className="font-semibold mb-4">Recent Comments</h3>
                            {feedbackComments.length === 0 ? (
                                <p className="text-muted-foreground text-sm">No comments received yet.</p>
                            ) : (
                                <div className="space-y-4">
                                    {feedbackComments.map((comment, idx) => (
                                        <div key={idx} className="border-b pb-4 last:border-0 last:pb-0">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center">
                                                    {[...Array(5)].map((_, i) => (
                                                        <StarIcon
                                                            key={i}
                                                            className={`size-3 ${i < comment.rating ? "text-yellow-500 fill-current" : "text-gray-300"}`}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {comment.semester} {comment.year}
                                                </span>
                                            </div>
                                            <p className="text-sm">{comment.comments}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Separator />

                    <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={saving} size="lg">
                            {saving ? (
                                <RefreshCwIcon className="size-4 mr-2 animate-spin" />
                            ) : (
                                <SaveIcon className="size-4 mr-2" />
                            )}
                            Save Changes
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Profile;
