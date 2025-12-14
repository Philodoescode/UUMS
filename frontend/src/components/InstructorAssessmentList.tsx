import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EyeIcon, EyeOffIcon, LockIcon } from "lucide-react";
import { CreateAssessmentDialog } from "./CreateAssessmentDialog";

interface Assessment {
    id: string;
    title: string;
    description: string;
    timeLimit: number;
    dueDate: string | null;
    attemptsAllowed: number;
    isActive: boolean;
    accessCode?: string; // Optional because only instructors see it
}

interface InstructorAssessmentListProps {
    courseId: string;
}

export function InstructorAssessmentList({ courseId }: InstructorAssessmentListProps) {
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [visibleCodes, setVisibleCodes] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (courseId) {
            fetchAssessments();
        }
    }, [courseId]);

    const fetchAssessments = async () => {
        try {
            setLoading(true);
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

    const toggleCodeVisibility = (id: string) => {
        setVisibleCodes(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    if (loading) return <div>Loading assessments...</div>;
    if (error) return <div className="text-red-500">{error}</div>;

    if (assessments.length === 0) {
        return (
            <div className="space-y-4">
                <div className="flex justify-end">
                    <CreateAssessmentDialog courseId={courseId} onAssessmentCreated={fetchAssessments} />
                </div>
                <div className="text-gray-500 text-sm text-center py-4 border rounded-md border-dashed">
                    No assessments created for this course yet.
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <CreateAssessmentDialog courseId={courseId} onAssessmentCreated={fetchAssessments} />
            </div>

            {assessments.map((assessment) => (
                <Card key={assessment.id} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-lg">{assessment.title}</CardTitle>
                                <CardDescription className="line-clamp-1">{assessment.description}</CardDescription>
                            </div>
                            <Badge variant={assessment.isActive ? "default" : "secondary"}>
                                {assessment.isActive ? 'Active' : 'Closed'}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <p><strong>Time:</strong> {assessment.timeLimit} mins</p>
                            <p><strong>Attempts:</strong> {assessment.attemptsAllowed}</p>
                        </div>

                        {/* Access Code Viewer */}
                        <div className="mt-4 p-3 bg-muted rounded-md flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <LockIcon className="size-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Access Code:</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <code className="bg-background px-2 py-1 rounded border font-mono">
                                    {visibleCodes[assessment.id] ? assessment.accessCode : '••••••••'}
                                </code>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => toggleCodeVisibility(assessment.id)}
                                >
                                    {visibleCodes[assessment.id] ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
