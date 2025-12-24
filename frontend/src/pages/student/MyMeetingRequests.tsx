import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { STUDENT_LINKS } from "@/config/navLinks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { Calendar, Clock, X, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface MeetingRequest {
  id: string;
  studentId: string;
  professorId: string;
  requestedDate: string;
  requestedTime: string;
  reason: string;
  status: "Pending" | "Approved" | "Declined";
  professorNotes?: string;
  approvedDate?: string;
  approvedTime?: string;
  createdAt: string;
  professor: {
    id: string;
    fullName: string;
    email: string;
    profileImage?: string;
  };
}

const MyMeetingRequests = () => {
  const [meetingRequests, setMeetingRequests] = useState<MeetingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchMeetingRequests();
  }, []);

  const fetchMeetingRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get("/meeting-requests/my-requests");
      setMeetingRequests(response.data);
    } catch (error) {
      console.error("Failed to fetch meeting requests:", error);
      toast({
        title: "Error",
        description: "Failed to load meeting requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm("Are you sure you want to cancel this meeting request?")) {
      return;
    }

    try {
      await api.delete(`/meeting-requests/${requestId}`);
      toast({
        title: "Request Cancelled",
        description: "Your meeting request has been cancelled successfully.",
      });
      fetchMeetingRequests();
    } catch (error: any) {
      console.error("Failed to cancel meeting request:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to cancel meeting request",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Pending":
        return "default";
      case "Approved":
        return "default";
      case "Declined":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDateTime = (date: string, time: string) => {
    try {
      const dateTime = new Date(`${date}T${time}`);
      return {
        date: format(dateTime, "PPP"),
        time: format(dateTime, "p"),
      };
    } catch {
      return { date, time };
    }
  };

  const filteredRequests = meetingRequests.filter((request) => {
    if (activeTab === "all") return true;
    return request.status.toLowerCase() === activeTab;
  });

  const renderRequestCard = (request: MeetingRequest) => {
    const formatted = formatDateTime(request.requestedDate, request.requestedTime);
    const isPending = request.status === "Pending";
    const isApproved = request.status === "Approved";

    return (
      <Card key={request.id} className="overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={request.professor.profileImage} alt={request.professor.fullName} />
                <AvatarFallback>{getInitials(request.professor.fullName)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base">{request.professor.fullName}</CardTitle>
                <p className="text-sm text-muted-foreground">{request.professor.email}</p>
              </div>
            </div>
            <Badge variant={getStatusBadgeVariant(request.status)} className={
              request.status === "Approved" ? "bg-green-500 hover:bg-green-600" :
              request.status === "Pending" ? "bg-blue-500 hover:bg-blue-600" : ""
            }>
              {request.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center text-sm">
              <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{formatted.date}</span>
            </div>
            <div className="flex items-center text-sm">
              <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{formatted.time}</span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">Reason:</p>
            <p className="text-sm text-muted-foreground">{request.reason}</p>
          </div>

          {isApproved && (request.approvedDate || request.approvedTime) && (
            <div className="p-3 bg-green-50 dark:bg-green-950 rounded-md border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">Confirmed Details:</p>
              <div className="grid grid-cols-2 gap-2">
                {request.approvedDate && (
                  <div className="flex items-center text-sm text-green-700 dark:text-green-300">
                    <Calendar className="mr-2 h-3.5 w-3.5" />
                    <span>{formatDateTime(request.approvedDate, request.approvedTime || "00:00").date}</span>
                  </div>
                )}
                {request.approvedTime && (
                  <div className="flex items-center text-sm text-green-700 dark:text-green-300">
                    <Clock className="mr-2 h-3.5 w-3.5" />
                    <span>{formatDateTime(request.approvedDate || request.requestedDate, request.approvedTime).time}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {request.professorNotes && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium mb-1">Professor's Notes:</p>
              <p className="text-sm text-muted-foreground">{request.professorNotes}</p>
            </div>
          )}

          {isPending && (
            <Button
              variant="destructive"
              size="sm"
              className="w-full mt-2"
              onClick={() => handleCancelRequest(request.id)}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel Request
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar links={STUDENT_LINKS} />
      <main className="flex-grow p-8">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">My Meeting Requests</h1>
            <p className="text-muted-foreground mt-2">
              View and manage your meeting requests with professors.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="declined">Declined</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border border-dashed">
                  <Calendar className="mx-auto h-12 w-12 opacity-50 mb-4" />
                  <h3 className="text-lg font-medium">No meeting requests found</h3>
                  <p className="mt-1">
                    {activeTab === "all"
                      ? "You haven't made any meeting requests yet."
                      : `You don't have any ${activeTab} meeting requests.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRequests.map(renderRequestCard)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default MyMeetingRequests;
