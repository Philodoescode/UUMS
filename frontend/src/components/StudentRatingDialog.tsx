import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarIcon, Loader2Icon } from "lucide-react";
import api from "@/lib/api";
import { AxiosError } from "axios";

interface StudentRatingDialogProps {
    courseId: string;
    targetUser: {
        id: string;
        fullName: string;
        role: 'TA' | 'Instructor';
    };
    semester: string;
    year: number;
    trigger?: React.ReactNode;
    onSuccess?: () => void;
}

export function StudentRatingDialog({ courseId, targetUser, semester, year, trigger, onSuccess }: StudentRatingDialogProps) {
    const [open, setOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [comments, setComments] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (rating === 0) {
            setError("Please select a rating");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await api.post('/student-feedback', {
                courseId,
                targetUserId: targetUser.id,
                targetRole: targetUser.role,
                rating,
                comments,
                semester,
                year
            });

            setOpen(false);
            if (onSuccess) onSuccess();
            // Reset form
            setRating(0);
            setComments("");
        } catch (err: unknown) {
            let errorMessage = "Failed to submit feedback";
            if (err instanceof AxiosError && err.response?.data?.message) {
                errorMessage = err.response.data.message;
            }
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline" size="sm">Rate</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Rate {targetUser.role}</DialogTitle>
                    <DialogDescription>
                        Share your feedback for {targetUser.fullName}. Submissions are anonymous.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className={`p-1 rounded-full transition-colors hover:bg-muted ${rating >= star ? 'text-yellow-500' : 'text-gray-300'}`}
                            >
                                <StarIcon className="w-8 h-8 fill-current" />
                            </button>
                        ))}
                    </div>
                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                    <div className="grid gap-2">
                        <label htmlFor="comments" className="text-sm font-medium">
                            Comments (Optional)
                        </label>
                        <Textarea
                            id="comments"
                            placeholder="Write your constructive feedback here..."
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || rating === 0}>
                        {isSubmitting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                        Submit
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
