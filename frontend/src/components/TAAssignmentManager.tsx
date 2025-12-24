import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    UserPlusIcon,
    PencilIcon,
    TrashIcon,
    Loader2Icon,
    UsersIcon,
    ClipboardListIcon,
} from "lucide-react";
import api from "@/lib/api";

interface TAUser {
    id: string;
    fullName: string;
    email: string;
}

interface TAAssignment {
    id: string;
    duties: string;
    taUser: TAUser;
    createdAt: string;
}

interface TAAssignmentManagerProps {
    courseId: string;
}

export const TAAssignmentManager = ({ courseId }: TAAssignmentManagerProps) => {
    const [assignments, setAssignments] = useState<TAAssignment[]>([]);
    const [availableTAs, setAvailableTAs] = useState<TAUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedTA, setSelectedTA] = useState<string>("");
    const [duties, setDuties] = useState("");
    const [editingAssignment, setEditingAssignment] = useState<TAAssignment | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchAssignments();
        fetchAvailableTAs();
    }, [courseId]);

    const fetchAssignments = async () => {
        setIsLoading(true);
        try {
            const response = await api.get(`/ta-assignments/course/${courseId}`);
            setAssignments(response.data);
        } catch (error) {
            console.error("Failed to fetch TA assignments:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAvailableTAs = async () => {
        try {
            const response = await api.get("/ta-assignments/available-tas");
            setAvailableTAs(response.data);
        } catch (error) {
            console.error("Failed to fetch available TAs:", error);
        }
    };

    const handleAssignTA = async () => {
        if (!selectedTA) return;

        setIsSubmitting(true);
        try {
            await api.post("/ta-assignments", {
                courseId,
                taUserId: selectedTA,
                duties,
            });
            setIsAddDialogOpen(false);
            setSelectedTA("");
            setDuties("");
            fetchAssignments();
        } catch (error: any) {
            console.error("Failed to assign TA:", error);
            alert(error.response?.data?.message || "Failed to assign TA");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateDuties = async () => {
        if (!editingAssignment) return;

        setIsSubmitting(true);
        try {
            await api.put(`/ta-assignments/${editingAssignment.id}`, {
                duties,
            });
            setIsEditDialogOpen(false);
            setEditingAssignment(null);
            setDuties("");
            fetchAssignments();
        } catch (error) {
            console.error("Failed to update duties:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveTA = async (assignmentId: string) => {
        if (!confirm("Are you sure you want to remove this TA from the course?")) return;

        try {
            await api.delete(`/ta-assignments/${assignmentId}`);
            fetchAssignments();
        } catch (error) {
            console.error("Failed to remove TA:", error);
        }
    };

    const openEditDialog = (assignment: TAAssignment) => {
        setEditingAssignment(assignment);
        setDuties(assignment.duties || "");
        setIsEditDialogOpen(true);
    };

    // Filter out TAs already assigned to this course
    const unassignedTAs = availableTAs.filter(
        (ta) => !assignments.some((a) => a.taUser.id === ta.id)
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <UsersIcon className="size-5" />
                    Teaching Assistants
                </h3>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-1">
                            <UserPlusIcon className="size-4" />
                            Assign TA
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Assign Teaching Assistant</DialogTitle>
                            <DialogDescription>
                                Select a TA and define their duties for this course.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Select TA</Label>
                                <Select value={selectedTA} onValueChange={setSelectedTA}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose a teaching assistant..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {unassignedTAs.length === 0 ? (
                                            <SelectItem value="none" disabled>
                                                No available TAs
                                            </SelectItem>
                                        ) : (
                                            unassignedTAs.map((ta) => (
                                                <SelectItem key={ta.id} value={ta.id}>
                                                    {ta.fullName} ({ta.email})
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Duties & Responsibilities</Label>
                                <Textarea
                                    placeholder="e.g., Grade labs, Hold office hours MWF 2-3 PM, Lead discussion sections..."
                                    value={duties}
                                    onChange={(e) => setDuties(e.target.value)}
                                    className="min-h-[100px]"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setIsAddDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAssignTA}
                                disabled={!selectedTA || isSubmitting}
                            >
                                {isSubmitting && (
                                    <Loader2Icon className="size-4 mr-2 animate-spin" />
                                )}
                                Assign TA
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit TA Duties</DialogTitle>
                        <DialogDescription>
                            Update duties for {editingAssignment?.taUser.fullName}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Duties & Responsibilities</Label>
                            <Textarea
                                placeholder="e.g., Grade labs, Hold office hours MWF 2-3 PM..."
                                value={duties}
                                onChange={(e) => setDuties(e.target.value)}
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsEditDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateDuties} disabled={isSubmitting}>
                            {isSubmitting && (
                                <Loader2Icon className="size-4 mr-2 animate-spin" />
                            )}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* TA List */}
            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                </div>
            ) : assignments.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="py-8 text-center text-muted-foreground">
                        <UsersIcon className="size-10 mx-auto mb-2 opacity-50" />
                        <p>No TAs assigned to this course yet.</p>
                        <p className="text-sm">Click "Assign TA" to add a teaching assistant.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {assignments.map((assignment) => (
                        <Card key={assignment.id} className="bg-muted/30">
                            <CardHeader className="py-3 flex flex-row items-start justify-between space-y-0">
                                <div>
                                    <CardTitle className="text-base font-medium">
                                        {assignment.taUser.fullName}
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        {assignment.taUser.email}
                                    </CardDescription>
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8"
                                        onClick={() => openEditDialog(assignment)}
                                    >
                                        <PencilIcon className="size-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 text-destructive hover:text-destructive"
                                        onClick={() => handleRemoveTA(assignment.id)}
                                    >
                                        <TrashIcon className="size-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="py-3 pt-0">
                                {assignment.duties ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                                            <ClipboardListIcon className="size-4" />
                                            Duties:
                                        </div>
                                        <p className="text-sm whitespace-pre-wrap bg-background p-3 rounded-md border">
                                            {assignment.duties}
                                        </p>
                                    </div>
                                ) : (
                                    <Badge variant="outline" className="text-muted-foreground">
                                        No duties defined
                                    </Badge>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TAAssignmentManager;
