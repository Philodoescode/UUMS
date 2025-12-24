import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Loader2Icon,
    PlusIcon,
    AwardIcon,
    TrashIcon,
    CalendarIcon,
    CheckCircleIcon,
    ExternalLinkIcon
} from "lucide-react";
import api from "@/lib/api";
import { format } from "date-fns";

interface ProfessionalDevelopment {
    id: string;
    userId: string;
    title: string;
    type: 'Workshop' | 'Seminar' | 'Course' | 'Certification';
    provider: string;
    completionDate: string;
    expiryDate?: string;
    description?: string;
    credentialUrl?: string;
    verified: boolean;
}

interface ProfessionalDevelopmentManagerProps {
    userId: string;
    userName?: string;
    readOnly?: boolean;
}

export const ProfessionalDevelopmentManager = ({ userId, userName, readOnly = false }: ProfessionalDevelopmentManagerProps) => {
    const [records, setRecords] = useState<ProfessionalDevelopment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [title, setTitle] = useState("");
    const [type, setType] = useState<string>("Workshop");
    const [provider, setProvider] = useState("");
    const [completionDate, setCompletionDate] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [description, setDescription] = useState("");
    const [credentialUrl, setCredentialUrl] = useState("");

    useEffect(() => {
        if (userId) {
            fetchRecords();
        }
    }, [userId]);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            const response = await api.get(`/professional-development/user/${userId}`);
            setRecords(response.data);
        } catch (error) {
            console.error("Failed to fetch PD records:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post("/professional-development", {
                userId,
                title,
                type,
                provider,
                completionDate,
                expiryDate: expiryDate || null,
                description,
                credentialUrl
            });
            setIsAddDialogOpen(false);
            resetForm();
            fetchRecords();
        } catch (error: any) {
            console.error("Failed to create record:", error);
            alert(error.response?.data?.message || "Failed to create record");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteRecord = async (id: string) => {
        if (!confirm("Are you sure you want to delete this record?")) return;
        try {
            await api.delete(`/professional-development/${id}`);
            fetchRecords();
        } catch (error) {
            console.error("Failed to delete record:", error);
        }
    };

    const resetForm = () => {
        setTitle("");
        setType("Workshop");
        setProvider("");
        setCompletionDate("");
        setExpiryDate("");
        setDescription("");
        setCredentialUrl("");
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'Certification': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'Workshop': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Course': return 'bg-green-100 text-green-800 border-green-200';
            case 'Seminar': return 'bg-orange-100 text-orange-800 border-orange-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <AwardIcon className="size-5" />
                        Professional Development
                    </CardTitle>
                    <CardDescription>
                        {userName ? `Manage training and certifications for ${userName}` : "Verified training and certifications"}
                    </CardDescription>
                </div>
                {!readOnly && (
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="gap-1">
                                <PlusIcon className="size-4" />
                                Add Record
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Add Professional Development Record</DialogTitle>
                                <DialogDescription>
                                    Add a verified training, workshop, or certification.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreateRecord} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Title *</label>
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g. AWS Cloud Practitioner"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Type *</label>
                                        <Select value={type} onValueChange={setType}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Workshop">Workshop</SelectItem>
                                                <SelectItem value="Seminar">Seminar</SelectItem>
                                                <SelectItem value="Course">Course</SelectItem>
                                                <SelectItem value="Certification">Certification</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Provider</label>
                                        <Input
                                            value={provider}
                                            onChange={(e) => setProvider(e.target.value)}
                                            placeholder="e.g. Coursera, Internal"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Completion Date *</label>
                                        <Input
                                            type="date"
                                            value={completionDate}
                                            onChange={(e) => setCompletionDate(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Expiry Date</label>
                                        <Input
                                            type="date"
                                            value={expiryDate}
                                            onChange={(e) => setExpiryDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Credential URL</label>
                                    <Input
                                        value={credentialUrl}
                                        onChange={(e) => setCredentialUrl(e.target.value)}
                                        placeholder="https://..."
                                        type="url"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Description</label>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Additional details..."
                                    />
                                </div>

                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2Icon className="size-4 mr-2 animate-spin" />}
                                        Save Record
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                    </div>
                ) : records.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                        <AwardIcon className="size-10 mx-auto mb-2 opacity-50" />
                        <p>No professional development records found.</p>
                        {!readOnly && <p className="text-sm">Click "Add Record" to verify a new training.</p>}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Expiry</TableHead>
                                <TableHead>Status</TableHead>
                                {!readOnly && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {records.map((record) => (
                                <TableRow key={record.id}>
                                    <TableCell>
                                        <div className="font-medium">{record.title}</div>
                                        {record.provider && (
                                            <div className="text-xs text-muted-foreground">{record.provider}</div>
                                        )}
                                        {record.credentialUrl && (
                                            <a
                                                href={record.credentialUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs flex items-center gap-1 text-blue-600 hover:underline mt-1"
                                            >
                                                View Credential <ExternalLinkIcon className="size-3" />
                                            </a>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={getTypeColor(record.type)}>
                                            {record.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-sm">
                                            <CalendarIcon className="size-3 text-muted-foreground" />
                                            {format(new Date(record.completionDate), "MMM d, yyyy")}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {record.expiryDate ? (
                                            <div className="text-sm">
                                                {format(new Date(record.expiryDate), "MMM d, yyyy")}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {record.verified ? (
                                            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 gap-1">
                                                <CheckCircleIcon className="size-3" /> Verified
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline">Pending</Badge>
                                        )}
                                    </TableCell>
                                    {!readOnly && (
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                onClick={() => handleDeleteRecord(record.id)}
                                            >
                                                <TrashIcon className="size-4" />
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
};
