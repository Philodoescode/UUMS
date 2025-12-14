import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircleIcon, XCircleIcon } from "lucide-react";
import api from "@/lib/api";

interface Appeal {
    id: string;
    studentId: string;
    enrollmentId: string | null;
    submissionId: string | null;
    reason: string;
    status: 'pending' | 'reviewed' | 'resolved';
    professorResponse: string | null;
    newGrade: string | null;
    createdAt: string;
    student: {
        id: string;
        fullName: string;
        email: string;
    };
    submission?: {
        id: string;
        assessment: {
            title: string;
        };
    };
    enrollment?: {
        // ... if we need enrollment details
    };
}

interface InstructorGradeAppealsProps {
    courseId: string;
}

export function InstructorGradeAppeals({ courseId }: InstructorGradeAppealsProps) {
    const [appeals, setAppeals] = useState<Appeal[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
    const [response, setResponse] = useState("");
    const [action, setAction] = useState<'approve' | 'reject' | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (courseId) fetchAppeals();
    }, [courseId]);

    const fetchAppeals = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/appeals/instructor/course/${courseId}`);
            // Combine both course and assessment appeals? Or just show one type?
            // The controller returns { courseAppeals, assessmentAppeals }
            const allAppeals = [...res.data.courseAppeals, ...res.data.assessmentAppeals].sort((a: any, b: any) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setAppeals(allAppeals);
        } catch (error) {
            console.error("Failed to fetch appeals", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenReview = (appeal: Appeal, actionType: 'approve' | 'reject') => {
        setSelectedAppeal(appeal);
        setAction(actionType);
        setResponse("");
    };

    const handleSubmitReview = async () => {
        if (!selectedAppeal) return;
        setSubmitting(true);
        try {
            await api.put(`/appeals/${selectedAppeal.id}`, {
                status: 'resolved',
                professorResponse: response,
                // Simple logic: if approved, we assume teacher updated grade elsewhere or we rely on newGrade field?
                // For now, let's just resolve the appeal status.
                // In a real app, 'Approve' might prompt for a new grade.
            });
            await fetchAppeals();
            setSelectedAppeal(null);
            setAction(null);
        } catch (error) {
            console.error(error);
            alert("Failed to submit review");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div>Loading appeals...</div>;

    if (appeals.length === 0) return <div className="text-muted-foreground text-sm italic">No active appeals.</div>;

    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-lg">Student Grade Appeals</h3>
            {appeals.map(appeal => (
                <Card key={appeal.id} className={appeal.status === 'pending' ? 'border-yellow-200 bg-yellow-50/30' : ''}>
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-medium text-sm">{appeal.student.fullName}</h4>
                                <p className="text-xs text-muted-foreground">
                                    {appeal.submission ? `Assessment: ${appeal.submission.assessment.title}` : "Course Grade"}
                                </p>
                            </div>
                            <Badge variant={appeal.status === 'pending' ? 'secondary' : 'outline'}>
                                {appeal.status}
                            </Badge>
                        </div>
                        <div className="bg-background p-2 rounded border text-sm mb-3">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Reason:</p>
                            {appeal.reason}
                        </div>

                        {appeal.status === 'pending' ? (
                            <div className="flex gap-2 justify-end">
                                <Button size="sm" variant="outline" onClick={() => handleOpenReview(appeal, 'reject')} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                    <XCircleIcon className="size-4 mr-1" /> REJECT
                                </Button>
                                <Button size="sm" onClick={() => handleOpenReview(appeal, 'approve')} className="bg-green-600 hover:bg-green-700">
                                    <CheckCircleIcon className="size-4 mr-1" /> RESOLVE
                                </Button>
                            </div>
                        ) : (
                            appeal.professorResponse && (
                                <p className="text-xs text-muted-foreground">
                                    <span className="font-semibold">Response:</span> {appeal.professorResponse}
                                </p>
                            )
                        )}
                    </CardContent>
                </Card>
            ))}

            <Dialog open={!!selectedAppeal} onOpenChange={(open) => !open && setSelectedAppeal(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Review Appeal</DialogTitle>
                        <DialogDescription>
                            Add a comment for {selectedAppeal?.student.fullName}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Textarea
                            value={response}
                            onChange={e => setResponse(e.target.value)}
                            placeholder="Explain your decision..."
                            className="min-h-[100px]"
                        />
                        <p className="text-xs text-muted-foreground">
                            Note: If you are changing the grade, please update it manually in the Assessment/Student list first, then resolve this appeal.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setSelectedAppeal(null)}>Cancel</Button>
                        <Button onClick={handleSubmitReview} disabled={submitting}>
                            {submitting ? "Submitting..." : `Confirm ${action === 'approve' ? 'Resolution' : 'Rejection'}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
