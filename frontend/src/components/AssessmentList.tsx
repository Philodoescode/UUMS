import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';

interface Assessment {
    id: string;
    title: string;
    description: string;
    timeLimit: number; // in minutes
    dueDate: string | null;
    attemptsAllowed: number;
    isActive: boolean;
    startDate?: string | null;
    type: 'QUIZ' | 'ASSIGNMENT';
    submission?: {
        id: string;
        status: string;
        score: number | null;
        grade: string | null;
        gradingStatus: string;
    } | null;
}

interface AssessmentListProps {
    courseId: string;
}

export function AssessmentList({ courseId }: AssessmentListProps) {
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAssessments = async () => {
            try {
                // Assuming we have a way to get the token, or cookie is handled automatically by browser
                // In production, we should probably use an axios instance with interceptors or similar.
                // For now using fetch with credentials: include
                const response = await fetch(`http://localhost:3000/api/assessments/course/${courseId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch assessments');
                }

                const data = await response.json();
                setAssessments(data);
            } catch (err) {
                console.error(err);
                setError('Could not load assessments');
            } finally {
                setLoading(false);
            }
        };

        if (courseId) {
            fetchAssessments();
        }
    }, [courseId]);

    if (loading) return <div>Loading assessments...</div>;
    if (error) return <div className="text-red-500">{error}</div>;

    if (assessments.length === 0) {
        return <div className="text-gray-500 text-sm">No assessments available for this course.</div>;
    }

    return (
        <div className="space-y-4">
            {assessments.map((assessment) => (
                <Card key={assessment.id}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>{assessment.title}</CardTitle>
                                <CardDescription>{assessment.description}</CardDescription>
                            </div>
                            <Badge variant={assessment.isActive ? "default" : "secondary"}>
                                {assessment.isActive ? 'Active' : 'Closed'}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm space-y-1">
                            <p><strong>Time Limit:</strong> {assessment.timeLimit} minutes</p>
                            {assessment.dueDate && (
                                <p><strong>Due Date:</strong> {new Date(assessment.dueDate).toLocaleDateString()}</p>
                            )}
                            {assessment.startDate && (
                                <p><strong>Starts:</strong> {new Date(assessment.startDate).toLocaleString()}</p>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter>
                        {assessment.startDate && new Date() < new Date(assessment.startDate) ? (
                            <Button disabled>
                                Opens {new Date(assessment.startDate).toLocaleString()}
                            </Button>
                        ) : (
                            <Button
                                onClick={() => {
                                    if (assessment.submission && assessment.submission.status !== 'in-progress') {
                                        navigate(`/student/assessment/result/${assessment.submission.id}`);
                                    } else {
                                        if (assessment.type === 'ASSIGNMENT') {
                                            navigate(`/student/assignment/${assessment.id}`);
                                        } else {
                                            navigate(`/student/assessment/take/${assessment.id}`);
                                        }
                                    }
                                }}
                                disabled={!assessment.isActive && !assessment.submission}
                                variant={assessment.submission && assessment.submission.status !== 'in-progress' ? "secondary" : "default"}
                            >
                                {assessment.submission
                                    ? (assessment.submission.status === 'in-progress' ? 'Resume Assessment' : 'View Results')
                                    : (assessment.isActive ? 'Take Assessment' : 'Closed')
                                }
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}
