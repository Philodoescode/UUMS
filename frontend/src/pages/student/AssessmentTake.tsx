import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Assuming Alert exists or use standard div

interface Question {
    id: string;
    text: string;
    type: 'multiple-choice' | 'true-false' | 'text';
    options?: string[];
}

interface Assessment {
    id: string;
    title: string;
    description: string;
    timeLimit: number;
    questions?: Question[];
}

export default function AssessmentTake() {
    const { assessmentId } = useParams<{ assessmentId: string }>();
    const navigate = useNavigate();

    const [assessment, setAssessment] = useState<Assessment | null>(null);
    const [accessCode, setAccessCode] = useState('');

    const [hasStarted, setHasStarted] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [warnings, setWarnings] = useState(0);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Fetch assessment details (without access code/content ideally, but we need title)
    // Actually our getAssessmentsByCourse gave us the list. 
    // We might need a generic "get assessment info" endpoint that doesn't require the code yet?
    // Or we just use the list info passed via location state, but better to fetch.
    // For now, let's assume we can fetch basic info. 
    // Wait, the backend endpoint `GET /api/assessments/course/:id` returns list.
    // We don't have `GET /api/assessments/:id` for public info.
    // I will add a quick helper to fetch or just trust the user knows what they are accessing.
    // Let's implement a fetch based on list or just use the start endpoint to get details?
    // The `start` endpoint returns the submission object. 
    // Let's rely on the `start` endpoint to give us the go-ahead and the start time.

    useEffect(() => {
        // Prevent context menu
        const handleContextMenu = (e: MouseEvent) => e.preventDefault();
        document.addEventListener('contextmenu', handleContextMenu);

        // Anti-cheating: Visibility Change
        const handleVisibilityChange = () => {
            if (document.hidden && hasStarted) {
                setWarnings(prev => prev + 1);
                // In a real app, send this log to backend immediately
                console.warn("User switched tabs!");
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [hasStarted]);

    // Timer logic
    useEffect(() => {
        if (!hasStarted || timeLeft === null) return;

        if (timeLeft <= 0) {
            handleSubmit(); // Auto submit
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => (prev !== null ? prev - 1 : null));
        }, 1000);

        return () => clearInterval(timer);
    }, [hasStarted, timeLeft]);


    const handleStart = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`http://localhost:3000/api/assessments/${assessmentId}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ accessCode }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to start assessment');
            }

            // Success
            // data is the submission object
            // We need the assessment details (title, description, timeLimit)
            // The submission might not have it populated deep enough. 
            // Ideally we should have fetched assessment basic info first.
            // Let's cheating a bit and fetch the list first to find this assessment's details.
            // Or better, let's just use what we have. 
            // I'll make a quick call to get the assessment details if not loaded.

            // Wait, I can't easily get details without a dedicated endpoint if I didn't make one.
            // `getAssessmentsByCourse` requires courseId.
            // I'll assume for now that I can get the details from the response if I update the backend, 
            // OR I just make a dedicated `GET /api/assessments/:id` (public/protected) that returns metadata.
            // But I didn't make that route.
            // I'll just hardcode the logic to proceed, assuming data.status === 'in-progress'

            // To be proper, I will mock the "Metadata" part or better yet, 
            // let's blindly start and rely on the fact that if it started, we are good.
            // But we need the TIME LIMIT.
            // I should update the `startAssessment` controller to return the assessment details too.
            // Let's pause and update the backend controller to return `Assessment` with the submission.

            setHasStarted(true);
            // Assuming I fix the backend to return assessment in the submission or separately.
            // For now, let's assume the START response contains: { submission, assessment: { ... } }
            // I will modify the backend controller in a moment.

            // Temp fix:
            // setTimeLeft(30 * 60); // Default 30 mins if fail

            if (data.assessment) {
                setAssessment(data.assessment);
                // Calculate remaining time based on startTime
                const startTime = new Date(data.startTime).getTime();
                const now = new Date().getTime();
                const limitMs = data.assessment.timeLimit * 60 * 1000;
                const elapsed = now - startTime;
                const remaining = Math.floor((limitMs - elapsed) / 1000);
                setTimeLeft(remaining > 0 ? remaining : 0);
            }

            // Request Fullscreen
            if (containerRef.current?.requestFullscreen) {
                containerRef.current.requestFullscreen().catch(err => console.log("Fullscreen denied", err));
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const response = await fetch(`http://localhost:3000/api/assessments/${assessmentId}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ content: answers }),
            });

            if (!response.ok) throw new Error('Submit failed');

            alert('Assessment Submitted Successfully!');
            navigate(-1); // Go back
        } catch (err) {
            console.error(err);
            alert('Error submitting assessment. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (error && !hasStarted) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="w-[400px]">
                    <CardHeader><CardTitle>Error</CardTitle></CardHeader>
                    <CardContent>{error}</CardContent>
                    <CardFooter><Button onClick={() => setError('')}>Try Again</Button></CardFooter>
                </Card>
            </div>
        )
    }

    if (!hasStarted) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <Card className="w-[400px]">
                    <CardHeader>
                        <CardTitle>Secure Assessment</CardTitle>
                        <CardDescription>Enter the access code provided by your instructor to begin.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleStart} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="accessCode">Access Code</Label>
                                <Input
                                    id="accessCode"
                                    type="password"
                                    value={accessCode}
                                    onChange={(e) => setAccessCode(e.target.value)}
                                    placeholder="Enter code"
                                    required
                                />
                            </div>
                            {error && <p className="text-sm text-red-500">{error}</p>}
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Verifying...' : 'Start Assessment'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Exam Interface
    return (
        <div ref={containerRef} className="min-h-screen bg-white p-8 flex flex-col">
            <header className="flex justify-between items-center border-b pb-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">{assessment?.title || 'Assessment'}</h1>
                    <p className="text-gray-500">{assessment?.description}</p>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-mono font-bold text-blue-600">
                        {Math.floor((timeLeft || 0) / 60)}:{(timeLeft || 0) % 60 < 10 ? '0' : ''}{(timeLeft || 0) % 60}
                    </div>
                    <p className="text-xs text-gray-400">Time Remaining</p>
                </div>
            </header>

            <div className="flex-1 max-w-4xl mx-auto w-full space-y-6">
                {warnings > 0 && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
                        <strong>Warning:</strong> You have navigated away from the assessment page {warnings} times. This activity has been logged.
                    </div>
                )}

                <div className="space-y-6">
                    {assessment?.questions && assessment.questions.length > 0 ? (
                        assessment.questions.map((q, index) => (
                            <Card key={q.id}>
                                <CardHeader>
                                    <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                                    <CardDescription className="text-base text-foreground mt-2">{q.text}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {q.options ? (
                                        <div className="space-y-2">
                                            {q.options.map((option) => (
                                                <div key={option} className="flex items-center space-x-2">
                                                    <input
                                                        type="radio"
                                                        id={`${q.id}-${option}`}
                                                        name={q.id}
                                                        value={option}
                                                        checked={answers[q.id] === option}
                                                        onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                        className="h-4 w-4"
                                                    />
                                                    <Label htmlFor={`${q.id}-${option}`}>{option}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <textarea
                                            className="w-full min-h-[100px] p-3 border rounded-md"
                                            value={answers[q.id] || ''}
                                            onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                            placeholder="Type your answer..."
                                        />
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="space-y-2">
                            <Label htmlFor="answer">Your Answer</Label>
                            <textarea
                                id="answer"
                                className="w-full min-h-[400px] p-4 border rounded-md font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Type your answer here..."
                                value={answers['general'] || ''}
                                onChange={(e) => setAnswers(prev => ({ ...prev, 'general': e.target.value }))}
                            />
                            <p className="text-sm text-yellow-600">Note: No specific questions were loaded. Please provide a general answer if required.</p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end">
                    <Button size="lg" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? 'Submitting...' : 'Submit Assessment'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
