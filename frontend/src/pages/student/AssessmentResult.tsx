import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2Icon, CheckCircleIcon, XCircleIcon, ArrowLeftIcon, AwardIcon } from "lucide-react";
import Navbar from "@/components/Navbar";
import { STUDENT_LINKS } from "@/config/navLinks";

interface AssessmentResultData {
    id: string; // Submission ID
    score: number | null;
    grade: string | null;
    status: string;
    gradingStatus: string;
    content: Record<string, string>; // Student answers
    assessment: {
        title: string;
        description: string;
        questions?: {
            id: string;
            text: string;
            type: string;
            options?: string[];
            correctAnswer?: string; // Optional if we want to show it
        }[];
    };
}

const AssessmentResult = () => {
    const { submissionId } = useParams<{ submissionId: string }>();
    const navigate = useNavigate();
    const [result, setResult] = useState<AssessmentResultData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        // Need an endpoint to fetch specific submission result
        // For now, we might need to update backend to allow fetching submission by ID
        // Or reuse existing endpoints if available.
        // Let's assume GET /api/assessments/submission/:id exists or we create it.
        // Actually, we don't have that endpoint yet. We need to add it!
        // For the sake of this step, I'll assume we add it. 
        fetchResult();
    }, [submissionId]);

    const fetchResult = async () => {
        try {
            const response = await api.get(`/assessments/submission/${submissionId}`);
            setResult(response.data);
        } catch (err) {
            console.error("Failed to load result:", err);
            setError("Failed to load assessment result.");
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return "text-green-600";
        if (score >= 70) return "text-blue-600";
        if (score >= 60) return "text-yellow-600";
        return "text-red-600";
    };

    const [showAppealForm, setShowAppealForm] = useState(false);
    const [appealReason, setAppealReason] = useState("");
    const [appeal, setAppeal] = useState<any>(null); // Type this properly
    const [submittingAppeal, setSubmittingAppeal] = useState(false);

    useEffect(() => {
        if (!loading && result && result.id) {
            fetchAppeal();
        }
    }, [result, loading]);

    const fetchAppeal = async () => {
        try {
            // New endpoint we created
            const res = await api.get(`/appeals/submission/${result!.id}`);
            if (res.data) setAppeal(res.data);
        } catch (error) {
            console.error("Failed to fetch appeal", error);
        }
    };

    const handleAppealSubmit = async () => {
        if (!appealReason.trim()) return;
        setSubmittingAppeal(true);
        try {
            const res = await api.post('/appeals', {
                submissionId: result!.id,
                reason: appealReason
            });
            setAppeal(res.data.appeal);
            setShowAppealForm(false);
            alert("Appeal submitted successfully");
        } catch (error: any) {
            alert(error.response?.data?.message || "Failed to submit appeal");
        } finally {
            setSubmittingAppeal(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen">
                <Navbar links={STUDENT_LINKS} />
                <div className="flex-grow flex items-center justify-center">
                    <Loader2Icon className="size-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    if (error || !result) {
        return (
            <div className="flex flex-col min-h-screen">
                <Navbar links={STUDENT_LINKS} />
                <div className="flex-grow flex flex-col items-center justify-center gap-4">
                    <p className="text-destructive font-semibold">{error || "Result not found"}</p>
                    <Button onClick={() => navigate(-1)}>Go Back</Button>
                </div>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'reviewed': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Navbar links={STUDENT_LINKS} />
            <main className="flex-grow container mx-auto px-4 py-8 max-w-3xl">
                <Button variant="ghost" className="mb-6 gap-2" onClick={() => navigate("/student/academics")}>
                    <ArrowLeftIcon className="size-4" />
                    Back to Courses
                </Button>

                <Card className="mb-6 border-t-4 border-t-primary">
                    <CardHeader className="text-center pb-2">
                        <AwardIcon className="size-12 mx-auto text-primary mb-2" />
                        <CardTitle className="text-2xl">{result.assessment.title}</CardTitle>
                        <CardDescription>Assessment Result</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center pt-4">
                        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-6">
                            <div className="bg-muted/50 p-4 rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">Score</p>
                                <p className={`text-3xl font-bold ${getScoreColor(result.score || 0)}`}>
                                    {result.score !== null ? `${result.score.toFixed(1)}%` : "N/A"}
                                </p>
                            </div>
                            <div className="bg-muted/50 p-4 rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">Grade</p>
                                <p className={`text-3xl font-bold ${getScoreColor(result.score || 0)}`}>
                                    {result.grade || "-"}
                                </p>
                            </div>
                        </div>

                        {result.gradingStatus === 'pending' && (
                            <div className="flex items-center justify-center gap-2 text-yellow-600 bg-yellow-50 p-3 rounded-md">
                                <Loader2Icon className="size-4 animate-spin" />
                                <span className="text-sm font-medium">Grading in progress...</span>
                            </div>
                        )}

                        {/* Appeal Section */}
                        {result.score !== null && (
                            <div className="mt-8 border-t pt-6 text-left">
                                <h3 className="font-semibold mb-4">Grade Appeal</h3>

                                {appeal ? (
                                    <div className={`p-4 rounded-lg border ${getStatusColor(appeal.status)}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold uppercase text-xs tracking-wider">{appeal.status}</span>
                                            <span className="text-xs opacity-70">{new Date(appeal.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm mb-2"><span className="font-semibold">Your Reason:</span> {appeal.reason}</p>
                                        {appeal.professorResponse && (
                                            <div className="mt-3 pt-3 border-t border-black/10">
                                                <p className="text-sm"><span className="font-semibold">Instructor Response:</span> {appeal.professorResponse}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    showAppealForm ? (
                                        <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
                                            <p className="text-sm font-medium">Why are you appealing this grade?</p>
                                            <textarea
                                                className="w-full min-h-[100px] p-2 rounded border text-sm"
                                                placeholder="Explain any issues or grading errors..."
                                                value={appealReason}
                                                onChange={e => setAppealReason(e.target.value)}
                                            />
                                            <div className="flex gap-2 justify-end">
                                                <Button variant="ghost" size="sm" onClick={() => setShowAppealForm(false)}>Cancel</Button>
                                                <Button size="sm" onClick={handleAppealSubmit} disabled={submittingAppeal}>
                                                    {submittingAppeal ? "Submitting..." : "Submit Appeal"}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-center">
                                            <Button variant="outline" onClick={() => setShowAppealForm(true)}>Request Review</Button>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Optional: Break down answers if questions are available */}
                {result.assessment.questions && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Question Breakdown</h3>
                        {result.assessment.questions.map((q, index) => {
                            const userAnswer = result.content?.[q.id];
                            const isCorrect = userAnswer === q.correctAnswer;

                            return (
                                <Card key={q.id} className={isCorrect ? "border-green-200 bg-green-50/20" : "border-red-200 bg-red-50/20"}>
                                    <CardHeader className="py-3">
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-1 rounded-full p-1 ${isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                                {isCorrect ? <CheckCircleIcon className="size-4" /> : <XCircleIcon className="size-4" />}
                                            </div>
                                            <div>
                                                <CardTitle className="text-base font-medium">Question {index + 1}</CardTitle>
                                                <p className="text-sm mt-1">{q.text}</p>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="py-3 pt-0 pl-12 text-sm space-y-2">
                                        <div>
                                            <span className="font-semibold text-muted-foreground">Your Answer: </span>
                                            <span className={isCorrect ? "text-green-700" : "text-red-700"}>
                                                {userAnswer || "No answer"}
                                            </span>
                                        </div>
                                        {!isCorrect && q.correctAnswer && (
                                            <div>
                                                <span className="font-semibold text-muted-foreground">Correct Answer: </span>
                                                <span className="text-green-700">{q.correctAnswer}</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

export default AssessmentResult;
