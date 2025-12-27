import { useState, useEffect } from "react";
import { CreateAnnouncementForm } from "@/components/CreateAnnouncementForm";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { ADMIN_LINKS, INSTRUCTOR_LINKS, HR_LINKS } from "@/config/navLinks";
import api from "@/lib/api";
import { format } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  body: string;
  type: "general" | "event" | "deadline";
  date: string;
  publishedAt: string;
  creator: {
    fullName: string;
    email: string;
    roles: {
      name: string;
    }[];
  };
}

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getNavLinks = () => {
    switch (user?.role) {
      case "admin":
        return ADMIN_LINKS;
      case "instructor":
        return INSTRUCTOR_LINKS;
      case "hr":
        return HR_LINKS;
      default:
        return [];
    }
  };

  const fetchAnnouncements = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get("/university-announcements");
      setAnnouncements(response.data);
    } catch (err: any) {
      console.error("Error fetching announcements:", err);
      setError("Failed to load announcements");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "event":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "deadline":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "general":
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "event":
        return "Event";
      case "deadline":
        return "Deadline";
      case "general":
      default:
        return "General";
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar links={getNavLinks()} />
      <div className="container mx-auto p-6 max-w-7xl flex-grow">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">University Announcements</h1>
            <p className="text-muted-foreground mt-2">
              Create and view university-wide announcements
            </p>
          </div>

          {/* Create Form */}
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Create New Announcement</h2>
            <CreateAnnouncementForm onSuccess={fetchAnnouncements} />
          </div>

          {/* Announcements List */}
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Announcements History</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAnnouncements}
                disabled={isLoading}
              >
                {isLoading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>

            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded mb-4">
                {error}
              </div>
            )}

            {isLoading && announcements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading announcements...
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No announcements yet. Create one above!
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">
                            {announcement.title}
                          </h3>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${getTypeColor(
                              announcement.type
                            )}`}
                          >
                            {getTypeLabel(announcement.type)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {announcement.body}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        📅 {format(new Date(announcement.date), "MMM dd, yyyy")}
                      </span>
                      <span>
                        👤 {announcement.creator.fullName} ({announcement.creator.roles?.map(r => r.name).join(', ') || 'No Role'})
                      </span>
                      <span>
                        🕐 Published {format(new Date(announcement.publishedAt), "MMM dd, yyyy 'at' hh:mm a")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
