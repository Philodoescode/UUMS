import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Assuming shadcn Table exists
import { FileIcon, HistoryIcon, RefreshCwIcon, PlusIcon } from "lucide-react";
import api from "@/lib/api";

interface Material {
    id: string;
    title: string;
    description: string;
    fileUrl: string;
    version: number;
    isLatest: boolean;
    groupId: string;
    createdAt: string;
}

interface InstructorMaterialManagementProps {
    courseId: string;
}

export default function InstructorMaterialManagement({ courseId }: InstructorMaterialManagementProps) {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Upload Dialog State
    const [openUpload, setOpenUpload] = useState(false);
    const [uploadMode, setUploadMode] = useState<'new' | 'update'>('new');
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        fileUrl: ""
    });

    // History Dialog State
    const [openHistory, setOpenHistory] = useState(false);
    const [history, setHistory] = useState<Material[]>([]);

    useEffect(() => {
        if (courseId) fetchMaterials();
    }, [courseId]);

    const fetchMaterials = async () => {
        setLoading(true);
        try {
            // Fetch all materials (including history) to separate them client side or just fetch latest
            // Let's fetch all and filter client side for the main view
            const res = await api.get(`/materials/course/${courseId}?includeHistory=true`);
            setMaterials(res.data);
        } catch (error) {
            console.error("Failed to fetch materials", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenNew = () => {
        setUploadMode('new');
        setFormData({ title: "", description: "", fileUrl: "" });
        setSelectedMaterial(null);
        setOpenUpload(true);
    };

    const handleOpenUpdate = (material: Material) => {
        setUploadMode('update');
        setFormData({
            title: material.title,
            description: material.description,
            fileUrl: "" // Force new file url? Or keep old? Usually updating implies new file.
        });
        setSelectedMaterial(material);
        setOpenUpload(true);
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);
        try {
            const payload = {
                courseId,
                title: formData.title,
                description: formData.description,
                fileUrl: formData.fileUrl,
                groupId: uploadMode === 'update' && selectedMaterial ? selectedMaterial.groupId : undefined
            };

            await api.post('/materials', payload);

            setOpenUpload(false);
            fetchMaterials(); // Refresh
        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleViewHistory = (material: Material) => {
        // Filter materials by groupId
        const hist = materials.filter(m => m.groupId === material.groupId).sort((a, b) => b.version - a.version);
        setHistory(hist);
        setSelectedMaterial(material);
        setOpenHistory(true);
    };

    // Main view only shows latest versions
    const latestMaterials = materials.filter(m => m.isLatest);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Course Materials</h3>
                <Button size="sm" onClick={handleOpenNew} className="gap-2">
                    <PlusIcon className="size-4" /> Upload Material
                </Button>
            </div>

            {loading ? (
                <div>Loading materials...</div>
            ) : latestMaterials.length === 0 ? (
                <div className="text-muted-foreground text-sm italic">No materials uploaded yet.</div>
            ) : (
                <div className="grid gap-4">
                    {latestMaterials.map(material => (
                        <Card key={material.id}>
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="bg-primary/10 p-2 rounded">
                                        <FileIcon className="size-5 text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold">{material.title}</h4>
                                        <p className="text-sm text-muted-foreground mb-1">{material.description}</p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="bg-secondary px-1.5 py-0.5 rounded">v{material.version}</span>
                                            <span>{new Date(material.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={() => window.open(material.fileUrl, '_blank')}>
                                        Download
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleOpenUpdate(material)}>
                                        Update
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleViewHistory(material)} title="View History">
                                        <HistoryIcon className="size-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Upload/Update Dialog */}
            <Dialog open={openUpload} onOpenChange={setOpenUpload}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{uploadMode === 'new' ? "Upload New Material" : `Update "${selectedMaterial?.title}"`}</DialogTitle>
                        <DialogDescription>
                            {uploadMode === 'new'
                                ? "Upload a file for students to access."
                                : "Upload a new version. The old version will be archived."}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpload} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fileUrl">File URL</Label>
                            <Input
                                id="fileUrl"
                                placeholder="https://..."
                                value={formData.fileUrl}
                                onChange={e => setFormData(prev => ({ ...prev, fileUrl: e.target.value }))}
                                required
                            />
                            <p className="text-xs text-muted-foreground">Paste a link to the file (e.g. Google Drive).</p>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpenUpload(false)}>Cancel</Button>
                            <Button type="submit" disabled={uploading}>
                                {uploading && <RefreshCwIcon className="mr-2 size-4 animate-spin" />}
                                {uploadMode === 'new' ? "Upload" : "Update Version"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* History Dialog */}
            <Dialog open={openHistory} onOpenChange={setOpenHistory}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Version History: {selectedMaterial?.title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Version</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Link</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map(ver => (
                                    <TableRow key={ver.id} className={ver.isLatest ? "bg-muted/50" : ""}>
                                        <TableCell>
                                            v{ver.version} {ver.isLatest && <span className="text-xs bg-primary text-primary-foreground px-1 py-0.5 rounded ml-1">Latest</span>}
                                        </TableCell>
                                        <TableCell>{new Date(ver.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <a href={ver.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:universe text-xs">
                                                View
                                            </a>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
