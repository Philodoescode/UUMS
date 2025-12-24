import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarIcon, BookOpenIcon, MessageSquareIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Feedback {
    id: string;
    rating: number;
    comments?: string;
    semester: string;
    year: number;
    course: {
        courseCode: string;
        name: string;
    };
    createdAt: string;
}

interface TeachingEvaluationSummaryProps {
    feedbackList: Feedback[];
}

export const TeachingEvaluationSummary = ({ feedbackList }: TeachingEvaluationSummaryProps) => {
    // calculate stats
    const totalReviews = feedbackList.length;
    const averageRating = totalReviews > 0
        ? (feedbackList.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews).toFixed(1)
        : "N/A";

    // Group by Course
    const feedbackByCourse = feedbackList.reduce((acc, curr) => {
        const key = `${curr.course.courseCode} - ${curr.semester} ${curr.year}`;
        if (!acc[key]) {
            acc[key] = {
                courseCode: curr.course.courseCode,
                courseName: curr.course.name,
                semester: curr.semester,
                year: curr.year,
                ratings: [],
                comments: []
            };
        }
        acc[key].ratings.push(curr.rating);
        if (curr.comments) acc[key].comments.push(curr.comments);
        return acc;
    }, {} as Record<string, any>);

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Overall Rating</CardTitle>
                        <StarIcon className="h-4 w-4 text-yellow-500 fill-current" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{averageRating}</div>
                        <p className="text-xs text-muted-foreground">/ 5.0</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Evaluations</CardTitle>
                        <MessageSquareIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalReviews}</div>
                        <p className="text-xs text-muted-foreground">Student submissions</p>
                    </CardContent>
                </Card>
            </div>

            <h3 className="text-lg font-semibold flex items-center gap-2">
                <BookOpenIcon className="size-5" /> Course Breakdown
            </h3>

            {Object.keys(feedbackByCourse).length === 0 ? (
                <Card className="bg-muted/20 border-dashed">
                    <CardContent className="py-8 text-center text-muted-foreground">
                        No teaching evaluations available yet.
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {Object.values(feedbackByCourse).map((item: any, idx) => {
                        const avg = (item.ratings.reduce((a: number, b: number) => a + b, 0) / item.ratings.length).toFixed(1);
                        return (
                            <Card key={idx}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-base">{item.courseCode}: {item.courseName}</CardTitle>
                                            <div className="text-sm text-muted-foreground">{item.semester} {item.year}</div>
                                        </div>
                                        <Badge variant={Number(avg) >= 4 ? "default" : "secondary"}>
                                            {avg} / 5.0
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="text-sm font-medium">Rating Distribution</div>
                                        <Progress value={(Number(avg) / 5) * 100} className="h-2" />

                                        {item.comments.length > 0 && (
                                            <div className="mt-4">
                                                <div className="text-sm font-medium mb-2">Student Comments</div>
                                                <ul className="text-sm space-y-1 text-muted-foreground list-disc pl-4">
                                                    {item.comments.slice(0, 3).map((comment: string, i: number) => (
                                                        <li key={i}>{comment}</li>
                                                    ))}
                                                    {item.comments.length > 3 && <li>...</li>}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    );
};
