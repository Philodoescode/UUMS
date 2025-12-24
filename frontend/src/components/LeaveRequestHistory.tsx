import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ClockIcon, Loader2Icon, XCircleIcon, HistoryIcon } from "lucide-react";
import api from "@/lib/api";

interface LeaveRequest {
    id: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: "pending" | "approved" | "denied";
    reviewedBy?: {
        fullName: string;
    };
    reviewedAt?: string;
    reviewNotes?: string;
    createdAt: string;
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
    sick: "Sick Leave",
    vacation: "Vacation",
    personal: "Personal",
    emergency: "Emergency",
    unpaid: "Unpaid",
};

const STATUS_BADGES: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    pending: { variant: "secondary", label: "Pending" },
    approved: { variant: "default", label: "Approved" },
    denied: { variant: "destructive", label: "Denied" },
};

interface LeaveRequestHistoryProps {
    refreshTrigger?: number;
}

export const LeaveRequestHistory = ({ refreshTrigger }: LeaveRequestHistoryProps) => {
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<string | null>(null);

    useEffect(() => {
        fetchRequests();
    }, [refreshTrigger]);

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const response = await api.get("/leave-requests/my");
            setRequests(response.data);
        } catch (error) {
            console.error("Failed to fetch leave requests:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = async (id: string, leaveType: string, startDate: string, endDate: string) => {
        const confirmed = window.confirm(
            `Cancel leave request?\n\nThis will cancel your pending ${LEAVE_TYPE_LABELS[leaveType] || leaveType} request from ${formatDate(startDate)} to ${formatDate(endDate)}.`
        );

        if (!confirmed) return;

        setCancellingId(id);
        try {
            await api.delete(`/leave-requests/${id}`);
            setRequests(requests.filter((r) => r.id !== id));
        } catch (error) {
            console.error("Failed to cancel request:", error);
        } finally {
            setCancellingId(null);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <HistoryIcon className="size-5" />
                    Leave Request History
                </CardTitle>
                <CardDescription>
                    Track the status of your submitted leave requests
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                    </div>
                ) : requests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <ClockIcon className="size-10 mx-auto mb-2 opacity-50" />
                        <p>No leave requests submitted yet.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>Dates</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Submitted</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {requests.map((request) => (
                                <TableRow key={request.id}>
                                    <TableCell className="font-medium">
                                        {LEAVE_TYPE_LABELS[request.leaveType] || request.leaveType}
                                    </TableCell>
                                    <TableCell>
                                        {formatDate(request.startDate)} - {formatDate(request.endDate)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={STATUS_BADGES[request.status]?.variant || "outline"}>
                                            {STATUS_BADGES[request.status]?.label || request.status}
                                        </Badge>
                                        {request.reviewNotes && (
                                            <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
                                                Note: {request.reviewNotes}
                                            </p>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {formatDate(request.createdAt)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {request.status === "pending" && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive"
                                                disabled={cancellingId === request.id}
                                                onClick={() => handleCancel(
                                                    request.id,
                                                    request.leaveType,
                                                    request.startDate,
                                                    request.endDate
                                                )}
                                            >
                                                {cancellingId === request.id ? (
                                                    <Loader2Icon className="size-4 animate-spin" />
                                                ) : (
                                                    <XCircleIcon className="size-4" />
                                                )}
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
};

export default LeaveRequestHistory;
