import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface StudentDocumentsDialogProps {
    student: { id: string; fullName: string };
}

interface Document {
    id: string;
    category: string;
    fileUrl: string;
    createdAt: string;
    uploader?: { fullName: string };
}

export function StudentDocumentsDialog({ student }: StudentDocumentsDialogProps) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [category, setCategory] = useState("Admission");
    const [uploading, setUploading] = useState(false);
    const { toast } = useToast();

    const fetchDocuments = async () => {
        try {
            const res = await api.get(`/student-documents/${student.id}`);
            setDocuments(res.data);
        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: "Failed to load documents", variant: "destructive" });
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast({ title: "Error", description: "Please select a file", variant: "destructive" });
            return;
        }
        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("studentId", student.id);
        formData.append("category", category);

        try {
            await api.post("/student-documents", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            toast({ title: "Documents", description: "File uploaded successfully" });
            setFile(null);
            // Reset file input value manually if needed, or rely on React state key
            fetchDocuments();
        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: "Failed to upload document", variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'; // Adjust as needed or use relative if proxy

    const getFullUrl = (path: string) => {
        // If path already starts with http, return it
        if (path.startsWith('http')) return path;
        // Remove leading slash if exists to avoid double slash
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        return `${API_BASE_URL}/${cleanPath}`;
    };

    return (
        <Dialog onOpenChange={(open) => { if (open) fetchDocuments(); }}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="ml-2">Docs</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Documents for {student.fullName}</DialogTitle>
                </DialogHeader>

                {/* Upload Section */}
                <div className="bg-muted/50 p-4 rounded-lg mb-6">
                    <h3 className="text-sm font-semibold mb-3">Upload New Document</h3>
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="w-[200px]">
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Admission">Admission</SelectItem>
                                    <SelectItem value="Medical">Medical</SelectItem>
                                    <SelectItem value="Disciplinary">Disciplinary</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <Input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                            />
                        </div>
                        <Button onClick={handleUpload} disabled={uploading}>
                            {uploading ? "Uploading..." : "Upload"}
                        </Button>
                    </div>
                </div>

                {/* List Section */}
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Category</TableHead>
                                <TableHead>Uploaded By</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {documents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                                        No documents found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                documents.map((doc) => (
                                    <TableRow key={doc.id}>
                                        <TableCell>{doc.category}</TableCell>
                                        <TableCell>{doc.uploader?.fullName || 'Unknown'}</TableCell>
                                        <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" asChild>
                                                <a href={getFullUrl(doc.fileUrl)} target="_blank" rel="noopener noreferrer">
                                                    View
                                                </a>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}
