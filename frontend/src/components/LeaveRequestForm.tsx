import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, Loader2Icon, SendIcon } from "lucide-react";
import api from "@/lib/api";

interface LeaveRequestFormProps {
    onSuccess?: () => void;
}

const LEAVE_TYPES = [
    { value: "sick", label: "Sick Leave" },
    { value: "vacation", label: "Vacation" },
    { value: "personal", label: "Personal Leave" },
    { value: "emergency", label: "Emergency Leave" },
    { value: "unpaid", label: "Unpaid Leave" },
];

export const LeaveRequestForm = ({ onSuccess }: LeaveRequestFormProps) => {
    const [leaveType, setLeaveType] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess(false);

        if (!leaveType || !startDate || !endDate || !reason.trim()) {
            setError("All fields are required");
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            setError("End date must be after or equal to start date");
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post("/leave-requests", {
                leaveType,
                startDate,
                endDate,
                reason: reason.trim(),
            });
            setSuccess(true);
            setLeaveType("");
            setStartDate("");
            setEndDate("");
            setReason("");
            onSuccess?.();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to submit leave request");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get today's date in YYYY-MM-DD format for min date
    const today = new Date().toISOString().split("T")[0];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="size-5" />
                    Submit Leave Request
                </CardTitle>
                <CardDescription>
                    Request time off for sick leave, vacation, or other purposes
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Leave Type */}
                    <div className="space-y-2">
                        <Label htmlFor="leaveType">Type of Leave *</Label>
                        <Select value={leaveType} onValueChange={setLeaveType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select leave type..." />
                            </SelectTrigger>
                            <SelectContent>
                                {LEAVE_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Start Date *</Label>
                            <input
                                type="date"
                                id="startDate"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                min={today}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endDate">End Date *</Label>
                            <input
                                type="date"
                                id="endDate"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                min={startDate || today}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                    </div>

                    {/* Reason */}
                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason / Notes *</Label>
                        <Textarea
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Provide a brief explanation for your leave request..."
                            className="min-h-[100px]"
                        />
                    </div>

                    {/* Error/Success Messages */}
                    {error && (
                        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md">
                            Leave request submitted successfully! You will receive a confirmation.
                        </div>
                    )}

                    {/* Submit Button */}
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                        {isSubmitting ? (
                            <>
                                <Loader2Icon className="size-4 mr-2 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <SendIcon className="size-4 mr-2" />
                                Submit Request
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};

export default LeaveRequestForm;
