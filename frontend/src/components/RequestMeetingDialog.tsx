import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface RequestMeetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  professorId: string;
  professorName: string;
}

export default function RequestMeetingDialog({
  isOpen,
  onClose,
  professorId,
  professorName,
}: RequestMeetingDialogProps) {
  const [requestedDate, setRequestedDate] = useState<Date | undefined>(undefined);
  const [requestedTime, setRequestedTime] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!requestedDate) {
      toast({
        title: "Invalid Date",
        description: "Please select a meeting date",
        variant: "destructive",
      });
      return;
    }

    if (!requestedTime) {
      toast({
        title: "Invalid Time",
        description: "Please select a meeting time",
        variant: "destructive",
      });
      return;
    }

    if (!reason.trim()) {
      toast({
        title: "Missing Reason",
        description: "Please provide a reason for the meeting",
        variant: "destructive",
      });
      return;
    }

    // Check if date/time is in the future
    const meetingDateTime = new Date(`${format(requestedDate, 'yyyy-MM-dd')}T${requestedTime}`);
    const now = new Date();
    
    if (meetingDateTime <= now) {
      toast({
        title: "Invalid Date/Time",
        description: "Meeting must be scheduled for a future date and time",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post("/meeting-requests", {
        professorId,
        requestedDate: format(requestedDate, 'yyyy-MM-dd'),
        requestedTime: `${requestedTime}:00`,
        reason: reason.trim(),
      });

      toast({
        title: "Meeting Request Sent",
        description: `Your meeting request with ${professorName} has been sent successfully.`,
      });

      // Reset form and close
      setRequestedDate(undefined);
      setRequestedTime("");
      setReason("");
      onClose();
    } catch (error: any) {
      console.error("Failed to create meeting request:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to send meeting request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setRequestedDate(undefined);
      setRequestedTime("");
      setReason("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Meeting</DialogTitle>
          <DialogDescription>
            Request a meeting with <strong>{professorName}</strong>. They will review and respond to your request.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label htmlFor="date">Meeting Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {requestedDate ? format(requestedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={requestedDate}
                  onSelect={setRequestedDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Picker */}
          <div className="space-y-2">
            <Label htmlFor="time">Meeting Time *</Label>
            <Input
              id="time"
              type="time"
              value={requestedTime}
              onChange={(e) => setRequestedTime(e.target.value)}
              required
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Meeting *</Label>
            <Textarea
              id="reason"
              placeholder="Please describe why you'd like to meet (e.g., discuss course material, project guidance, academic advising...)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={500}
              required
            />
            <p className="text-xs text-muted-foreground">
              {reason.length}/500 characters
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
