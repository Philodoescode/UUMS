import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { INSTRUCTOR_LINKS } from "@/config/navLinks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { Calendar, Clock, Check, X, Loader2 } from "lucide-react";
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
  student: {
    id: string;
    fullName: string;
    email: string;
    profileImage?: string;
  };
}

interface ReviewDialogState {
  isOpen: boolean;
  request: MeetingRequest | null;
  action: "approve" | "decline" | null;
}

const MeetingRequestsReview = () => {
  const [meetingRequests, setMeetingRequests] = useState<MeetingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [reviewDialog, setReviewDialog] = useState<ReviewDialogState>({
    isOpen: false,
    request: null,
    action: null,
  });
  const [professorNotes, setProfessorNotes] = useState("");
  const [approvedDate, setApprovedDate] = useState("");
  const [approvedTime, setApprovedTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const openReviewDialog = (request: MeetingRequest, action: "approve" | "decline") => {
    setReviewDialog({ isOpen: true, request, action });
    setProfessorNotes("");
    // Pre-fill with requested date/time for approval
    if (action === "approve") {
      setApprovedDate(request.requestedDate);
      setApprovedTime(request.requestedTime.substring(0, 5)); // HH:MM format
    }
  };

  const closeReviewDialog = () => {
    setReviewDialog({ isOpen: false, request: null, action: null });
    setProfessorNotes("");
    setApprovedDate("");
    setApprovedTime("");
  };

  const handleSubmitReview = async () => {
    if (!reviewDialog.request) return;

    const { action, request } = reviewDialog;
    const status = action === "approve" ? "Approved" : "Declined";

    setIsSubmitting(true);

    try {
      await api.put(`/meeting-requests/${request.id}/status`, {
        status,
        professorNotes: professorNotes.trim() || undefined,
        approvedDate: action === "approve" ? approvedDate : undefined,
        approvedTime: action === "approve" ? `${approvedTime}:00` : undefined,
      });

      toast({
        title: `Meeting Request ${status}`,
        description: `You have ${status.toLowerCase()} the meeting request from ${request.student.fullName}.`,
      });

      closeReviewDialog();
      fetchMeetingRequests();
    } catch (error: any) {
      console.error("Failed to update meeting request:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update meeting request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
                <AvatarImage src={request.student.profileImage} alt={request.student.fullName} />
                <AvatarFallback>{getInitials(request.student.fullName)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base">{request.student.fullName}</CardTitle>
                <p className="text-sm text-muted-foreground">{request.student.email}</p>
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
              <p className="text-sm font-medium mb-1">Your Notes:</p>
              <p className="text-sm text-muted-foreground">{request.professorNotes}</p>
            </div>
          )}

          {isPending && (
            <div className="flex gap-2 mt-4">
              <Button
                variant="default"
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => openReviewDialog(request, "approve")}
              >
                <Check className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={() => openReviewDialog(request, "decline")}
              >
                <X className="mr-2 h-4 w-4" />
                Decline
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar links={INSTRUCTOR_LINKS} />
      <main className="flex-grow p-8">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Meeting Requests</h1>
            <p className="text-muted-foreground mt-2">
              Review and respond to meeting requests from students.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="declined">Declined</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
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
                      ? "You haven't received any meeting requests yet."
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

      {/* Review Dialog */}
      <Dialog open={reviewDialog.isOpen} onOpenChange={closeReviewDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {reviewDialog.action === "approve" ? "Approve" : "Decline"} Meeting Request
            </DialogTitle>
            <DialogDescription>
              {reviewDialog.action === "approve"
                ? "Confirm the meeting details and add any notes for the student."
                : "Provide a reason for declining this meeting request."}
            </DialogDescription>
          </DialogHeader>

          {reviewDialog.request && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">Student: {reviewDialog.request.student.fullName}</p>
                <p className="text-xs text-muted-foreground mt-1">Reason: {reviewDialog.request.reason}</p>
              </div>

              {reviewDialog.action === "approve" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="approvedDate">Confirmed Date</Label>
                    <Input
                      id="approvedDate"
                      type="date"
                      value={approvedDate}
                      onChange={(e) => setApprovedDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="approvedTime">Confirmed Time</Label>
                    <Input
                      id="approvedTime"
                      type="time"
                      value={approvedTime}
                      onChange={(e) => setApprovedTime(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">
                  {reviewDialog.action === "approve" ? "Notes (Optional)" : "Reason for Declining"}
                </Label>
                <Textarea
                  id="notes"
                  placeholder={
                    reviewDialog.action === "approve"
                      ? "Add any notes or instructions for the student..."
                      : "Please explain why you're declining this request..."
                  }
                  value={professorNotes}
                  onChange={(e) => setProfessorNotes(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {professorNotes.length}/500 characters
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeReviewDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={isSubmitting || (reviewDialog.action === "approve" && (!approvedDate || !approvedTime))}
              variant={reviewDialog.action === "approve" ? "default" : "destructive"}
              className={reviewDialog.action === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {isSubmitting ? "Processing..." : reviewDialog.action === "approve" ? "Approve Meeting" : "Decline Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MeetingRequestsReview;
