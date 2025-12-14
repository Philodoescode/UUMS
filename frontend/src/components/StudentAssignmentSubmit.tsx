import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircleIcon, XCircleIcon, AlertTriangleIcon } from "lucide-react";
import api from "@/lib/api";

interface Assessment {
    id: string;
    title: string;
    description: string;
    type: 'QUIZ' | 'ASSIGNMENT';
    dueDate?: string;
    closeDate?: string;
    latePolicy: 'NONE' | 'ALLOW_LATE' | 'BLOCK_LATE';
    latePenalty: number;
}

export default function StudentAssignmentSubmit() {
    const { assessmentId } = useParams<{ assessmentId: string }>();
    const navigate = useNavigate();

    const [assessment, setAssessment] = useState<Assessment | null>(null);
    const [accessCode, setAccessCode] = useState("");
    const [fileUrl, setFileUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [authorized, setAuthorized] = useState(false);
    const [error, setError] = useState("");
    const [status, setStatus] = useState<'idle' | 'submitted' | 'late'>('idle');

    // 1. Verify Entry (Access Code) - Assignments still protected
    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setVerifying(true);
        setError("");

        try {
            // Re-using start endpoint to verify code and get assessment details
            // Backend "startAssessment" handles assignments too (creates submission record)
            const response = await api.post(`/assessments/${assessmentId}/start`, { accessCode });

            setAssessment(response.data.assessment);
            setAuthorized(true);

            // Check if already submitted
            if (response.data.status === 'submitted') {
                setStatus('submitted');
                setFileUrl(response.data.fileUrl || "");
            }

        } catch (err: any) {
            setError(err.response?.data?.message || "Invalid Access Code");
        } finally {
            setVerifying(false);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // For MVP, fileUrl is just a text input (simulating a link to Google Drive/Dropbox)
            // Real app would upload file to storage and get URL
            await api.post(`/assessments/${assessmentId}/submit`, {
                fileUrl
            });
            setStatus('submitted');
            alert("Assignment submitted successfully!");
            navigate(-1);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || "Failed to submit assignment");
        } finally {
            setLoading(false);
        }
    };

    if (!authorized) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Assignment Access</CardTitle>
                        <CardDescription>Enter access code to view and submit assignment.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleVerify} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="accessCode">Access Code</Label>
                                <Input
                                    id="accessCode"
                                    type="password"
                                    value={accessCode}
                                    onChange={e => setAccessCode(e.target.value)}
                                    required
                                />
                            </div>
                            {error && <p className="text-sm text-destructive">{error}</p>}
                            <Button type="submit" className="w-full" disabled={verifying}>
                                {verifying ? "Verifying..." : "Access Assignment"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!assessment) return <div>Loading...</div>;

    const now = new Date();
    const isLate = assessment.dueDate ? now > new Date(assessment.dueDate) : false;
    const isClosed = assessment.closeDate ? now > new Date(assessment.closeDate) : false;
    const isLateAllowed = assessment.latePolicy !== 'BLOCK_LATE';

    // Calculate display style for deadline
    let deadlineStatus = "text-muted-foreground";
    if (isClosed) deadlineStatus = "text-destructive font-bold";
    else if (isLate) deadlineStatus = "text-yellow-600 font-bold";

    return (
        <div className="container mx-auto max-w-2xl py-12 px-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl">{assessment.title}</CardTitle>
                            <CardDescription className="mt-2 text-base">{assessment.description}</CardDescription>
                        </div>
                        <Badge variant="outline">{assessment.type}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="font-semibold block text-muted-foreground">Due Date:</span>
                            {assessment.dueDate ? new Date(assessment.dueDate).toLocaleString() : "No Due Date"}
                        </div>
                        <div>
                            <span className="font-semibold block text-muted-foreground">Close Date (Hard Deadline):</span>
                            <span className={deadlineStatus}>
                                {assessment.closeDate ? new Date(assessment.closeDate).toLocaleString() : "No Close Date"}
                            </span>
                        </div>
                        <div className="col-span-2">
                            <span className="font-semibold block text-muted-foreground">Late Policy:</span>
                            {assessment.latePolicy === 'BLOCK_LATE' ? (
                                <span className="text-destructive flex items-center gap-1">
                                    <XCircleIcon className="size-4" /> Late submissions not accepted
                                </span>
                            ) : (
                                <span className="text-yellow-600 flex items-center gap-1">
                                    <AlertTriangleIcon className="size-4" />
                                    Late accepted {assessment.latePenalty > 0 ? `(-${assessment.latePenalty}% penalty)` : "(No penalty)"}
                                </span>
                            )}
                        </div>
                    </div>

                    {status === 'submitted' ? (
                        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-md flex items-center gap-3">
                            <CheckCircleIcon className="size-6" />
                            <div>
                                <h4 className="font-semibold">Submitted</h4>
                                <p className="text-sm">Your assignment has been submitted successfully.</p>
                                {fileUrl && <a href={fileUrl} target="_blank" rel="noreferrer" className="underline text-xs mt-1 block">View Submission</a>}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 pt-4 border-t">
                            {isClosed ? (
                                <div className="bg-destructive/10 text-destructive p-4 rounded-md font-medium text-center">
                                    This assignment is closed. Submissions are no longer accepted.
                                </div>
                            ) : (
                                <>
                                    {isLate && !isLateAllowed ? (
                                        <div className="bg-destructive/10 text-destructive p-4 rounded-md font-medium text-center">
                                            The due date has passed. Late submissions are not accepted.
                                        </div>
                                    ) : (
                                        <>
                                            {isLate && (
                                                <div className="bg-yellow-50 text-yellow-700 p-3 rounded-md text-sm border border-yellow-200">
                                                    <strong>Late Warning:</strong> You are submitting after the due date.
                                                    {assessment.latePenalty > 0 && ` A ${assessment.latePenalty}% penalty will be applied.`}
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <Label htmlFor="fileUrl">Submission Link (File URL)</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        id="fileUrl"
                                                        placeholder="https://drive.google.com/file/..."
                                                        value={fileUrl}
                                                        onChange={e => setFileUrl(e.target.value)}
                                                    />
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Please upload your file to a cloud storage (Google Drive, Dropbox) and paste the shareable link here.
                                                </p>
                                            </div>

                                            <Button className="w-full" onClick={handleSubmit} disabled={loading || !fileUrl}>
                                                {loading ? "Submitting..." : (isLate ? "Submit Late Assignment" : "Submit Assignment")}
                                            </Button>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                </CardContent>
            </Card>
        </div>
    );
}
