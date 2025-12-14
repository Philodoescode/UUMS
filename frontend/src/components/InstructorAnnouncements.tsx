import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MegaphoneIcon, PlusIcon, SendIcon, Loader2Icon } from "lucide-react";
import api from "@/lib/api";

interface Announcement {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    instructor: {
        user: {
            fullName: string;
        }
    };
}

interface InstructorAnnouncementsProps {
    courseId: string;
}

export const InstructorAnnouncements = ({ courseId }: InstructorAnnouncementsProps) => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newContent, setNewContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchAnnouncements();
    }, [courseId]);

    const fetchAnnouncements = async () => {
        setIsLoading(true);
        try {
            const response = await api.get(`/announcements/course/${courseId}`);
            setAnnouncements(response.data);
        } catch (error) {
            console.error("Failed to fetch announcements:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateAnnouncement = async () => {
        if (!newTitle.trim() || !newContent.trim()) return;

        setIsSubmitting(true);
        try {
            await api.post('/announcements', {
                courseId,
                title: newTitle,
                content: newContent
            });
            setNewTitle("");
            setNewContent("");
            setIsCreating(false);
            fetchAnnouncements();
        } catch (error) {
            console.error("Failed to create announcement:", error);
            // Optionally add toast error here
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MegaphoneIcon className="size-5" />
                    Announcements
                </h3>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsCreating(!isCreating)}
                    className="gap-1"
                >
                    {isCreating ? 'Cancel' : (
                        <>
                            <PlusIcon className="size-4" />
                            New Announcement
                        </>
                    )}
                </Button>
            </div>

            {isCreating && (
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">New Announcement</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Input
                            placeholder="Title (e.g., Midterm Access Code)"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                        />
                        <Textarea
                            placeholder="Write your message here..."
                            className="min-h-[100px]"
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                        />
                        <div className="flex justify-end">
                            <Button
                                size="sm"
                                onClick={handleCreateAnnouncement}
                                disabled={isSubmitting || !newTitle || !newContent}
                            >
                                {isSubmitting ? (
                                    <Loader2Icon className="size-4 animate-spin mr-2" />
                                ) : (
                                    <SendIcon className="size-4 mr-2" />
                                )}
                                Post Announcement
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="space-y-3">
                {isLoading ? (
                    <div className="flex justify-center py-4">
                        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                    </div>
                ) : announcements.length === 0 ? (
                    <p className="text-muted-foreground text-sm italic">No announcements posted yet.</p>
                ) : (
                    announcements.map((announcement) => (
                        <Card key={announcement.id} className="bg-muted/30">
                            <CardHeader className="py-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-base font-medium">{announcement.title}</CardTitle>
                                        <CardDescription className="text-xs mt-1">
                                            Posted by {announcement.instructor.user.fullName} • {new Date(announcement.createdAt).toLocaleDateString()}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="py-3 pt-0">
                                <p className="text-sm whitespaces-pre-wrap">{announcement.content}</p>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};
