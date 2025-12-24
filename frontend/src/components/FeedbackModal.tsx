import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import api from "@/lib/api";
import { RefreshCwIcon, StarIcon } from "lucide-react";

interface TargetStaff {
    userId: string;
    name: string;
    role: "Instructor" | "TA";
}

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: string;
    courseName: string;
    staffMembers: TargetStaff[];
}

const FeedbackModal = ({ isOpen, onClose, courseId, courseName, staffMembers }: FeedbackModalProps) => {
    const [selectedTarget, setSelectedTarget] = useState<string>("");
    const [rating, setRating] = useState<number>(0);
    const [comments, setComments] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!selectedTarget) {
            toast.error("Please select an Instructor or TA to review.");
            return;
        }
        if (rating === 0) {
            toast.error("Please provide a rating.");
            return;
        }

        const target = staffMembers.find(s => s.userId === selectedTarget);
        if (!target) return;

        setIsSubmitting(true);
        try {
            await api.post("/feedback/submit", {
                courseId,
                targetUserId: target.userId,
                targetRole: target.role,
                rating,
                comments
            });
            toast.success("Feedback submitted successfully.");
            onClose();
            // Reset form
            setSelectedTarget("");
            setRating(0);
            setComments("");
        } catch (error: any) {
            console.error("Submission error", error);
            const msg = error.response?.data?.message || "Failed to submit feedback.";
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Evaluate Course Staff</DialogTitle>
                    <DialogDescription>
                        Provide anonymous feedback for {courseName}. Your input helps improve the course experience.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="staff">Select Instructor or TA</Label>
                        <Select value={selectedTarget} onValueChange={setSelectedTarget}>
                            <SelectTrigger id="staff">
                                <SelectValue placeholder="Select staff member..." />
                            </SelectTrigger>
                            <SelectContent>
                                {staffMembers.map((staff) => (
                                    <SelectItem key={staff.userId} value={staff.userId}>
                                        {staff.name} ({staff.role})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label>Rating (1-5)</Label>
                        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    className={`p-1 rounded-full hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${rating >= star ? "text-yellow-500" : "text-muted-foreground"}`}
                                    onClick={() => setRating(star)}
                                    title={`${star} stars`}
                                >
                                    <StarIcon className={`size-8 ${rating >= star ? "fill-current" : ""}`} />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="comments">Comments (Optional)</Label>
                        <Textarea
                            id="comments"
                            placeholder="Share your specific feedback here..."
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            rows={4}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            "Submit Feedback"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default FeedbackModal;
