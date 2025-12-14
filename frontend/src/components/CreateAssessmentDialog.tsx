import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusIcon, Loader2Icon } from "lucide-react";
import api from "@/lib/api";

interface CreateAssessmentDialogProps {
    courseId: string;
    onAssessmentCreated: () => void;
}

export function CreateAssessmentDialog({ courseId, onAssessmentCreated }: CreateAssessmentDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        accessCode: "",
        timeLimit: 60,
        startDate: "",
        dueDate: "",
        closeDate: "",
        type: "QUIZ",
        latePolicy: "BLOCK_LATE",
        latePenalty: 0,
        questionsJson: JSON.stringify([
            {
                "id": "q1",
                "type": "multiple-choice",
                "text": "Sample Question?",
                "options": ["A", "B", "C"],
                "correctAnswer": "A"
            }
        ], null, 2)
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            let questions = null;
            try {
                if (formData.questionsJson && formData.type === 'QUIZ') {
                    questions = JSON.parse(formData.questionsJson);
                }
            } catch (err) {
                throw new Error("Invalid JSON format for questions");
            }

            await api.post("/assessments", {
                courseId,
                title: formData.title,
                description: formData.description,
                accessCode: formData.accessCode,
                timeLimit: Number(formData.timeLimit),
                startDate: formData.startDate ? new Date(formData.startDate) : null,
                dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
                closeDate: formData.closeDate ? new Date(formData.closeDate) : null,
                type: formData.type,
                latePolicy: formData.latePolicy,
                latePenalty: Number(formData.latePenalty),
                questions
            });

            setOpen(false);
            setFormData({
                title: "",
                description: "",
                accessCode: "",
                timeLimit: 60,
                startDate: "",
                dueDate: "",
                closeDate: "",
                type: "QUIZ",
                latePolicy: "BLOCK_LATE",
                latePenalty: 0,
                questionsJson: JSON.stringify([
                    {
                        "id": "q1",
                        "type": "multiple-choice",
                        "text": "Sample Question?",
                        "options": ["A", "B", "C"],
                        "correctAnswer": "A"
                    }
                ], null, 2)
            });
            onAssessmentCreated();
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || err.message || "Failed to create assessment");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                    <PlusIcon className="size-4" />
                    New Assessment
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Assessment</DialogTitle>
                    <DialogDescription>
                        Configure assessment details, timing, and policies.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {error && (
                        <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="e.g. Midterm Exam"
                                required
                            />
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Instructions for students..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="type">Assessment Type</Label>
                            <select
                                id="type"
                                name="type"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.type}
                                onChange={handleChange}
                            >
                                <option value="QUIZ">Quiz (Questions)</option>
                                <option value="ASSIGNMENT">Assignment (File Upload)</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="accessCode">Access Code</Label>
                            <Input
                                id="accessCode"
                                name="accessCode"
                                value={formData.accessCode}
                                onChange={handleChange}
                                placeholder="e.g. SECRET123"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="startDate">Start Date (Opens)</Label>
                            <Input
                                id="startDate"
                                name="startDate"
                                type="datetime-local"
                                value={formData.startDate}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="dueDate">Due Date (Soft Deadline)</Label>
                            <Input
                                id="dueDate"
                                name="dueDate"
                                type="datetime-local"
                                value={formData.dueDate}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="closeDate">Close Date (Hard Deadline)</Label>
                            <Input
                                id="closeDate"
                                name="closeDate"
                                type="datetime-local"
                                value={formData.closeDate}
                                onChange={handleChange}
                            />
                        </div>

                        {formData.type === 'QUIZ' && (
                            <div className="space-y-2">
                                <Label htmlFor="timeLimit">Time Limit (Minutes)</Label>
                                <Input
                                    id="timeLimit"
                                    name="timeLimit"
                                    type="number"
                                    min="1"
                                    value={formData.timeLimit}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="latePolicy">Late Policy</Label>
                            <select
                                id="latePolicy"
                                name="latePolicy"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.latePolicy}
                                onChange={handleChange}
                            >
                                <option value="BLOCK_LATE">Block Late Submissions</option>
                                <option value="ALLOW_LATE">Allow Late (With Penalty)</option>
                                <option value="NONE">Allow Late (No Penalty)</option>
                            </select>
                        </div>

                        {formData.latePolicy === 'ALLOW_LATE' && (
                            <div className="space-y-2">
                                <Label htmlFor="latePenalty">Late Penalty (%)</Label>
                                <Input
                                    id="latePenalty"
                                    name="latePenalty"
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.latePenalty}
                                    onChange={handleChange}
                                />
                            </div>
                        )}
                    </div>

                    {formData.type === 'QUIZ' && (
                        <div className="space-y-2">
                            <Label htmlFor="questionsJson">Questions (JSON Format)</Label>
                            <Textarea
                                id="questionsJson"
                                name="questionsJson"
                                value={formData.questionsJson}
                                onChange={handleChange}
                                className="font-mono text-xs h-[150px]"
                                placeholder='[{"id":"q1", "text":"...", "correctAnswer":"..."}]'
                            />
                            <p className="text-xs text-muted-foreground">
                                Define questions with IDs, text, options (array), and correctAnswer.
                            </p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2Icon className="mr-2 size-4 animate-spin" />}
                            Create Assessment
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
