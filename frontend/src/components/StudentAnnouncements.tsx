import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MegaphoneIcon, Loader2Icon } from "lucide-react";
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

interface StudentAnnouncementsProps {
    courseId: string;
}

export const StudentAnnouncements = ({ courseId }: StudentAnnouncementsProps) => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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

    if (isLoading) {
        return (
            <div className="flex justify-center py-4 bg-muted/20 rounded-lg">
                <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (announcements.length === 0) {
        return null; // Don't show section if empty? Or show "No announcements"
    }

    return (
        <Card className="mb-6 border-l-4 border-l-orange-500 bg-orange-50/10">
            <CardHeader className="py-4">
                <div className="flex items-center gap-2">
                    <MegaphoneIcon className="size-5 text-orange-600" />
                    <CardTitle className="text-lg">Announcements</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {announcements.map((announcement) => (
                    <div key={announcement.id} className="bg-background rounded-lg border p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold">{announcement.title}</h4>
                            <span className="text-xs text-muted-foreground">
                                {new Date(announcement.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{announcement.content}</p>
                        <p className="text-xs text-muted-foreground mt-2 italic">
                            - {announcement.instructor.user.fullName}
                        </p>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
};
