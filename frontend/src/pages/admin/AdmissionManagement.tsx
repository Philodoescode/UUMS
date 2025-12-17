import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { ADMIN_LINKS } from "@/config/navLinks";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { Loader2 } from "lucide-react";

interface Application {
    id: string;
    name: string;
    email: string;
    previousEducation: string;
    intendedMajor: string;
    status: 'Submitted' | 'Under Review' | 'Accepted' | 'Rejected';
    createdAt: string;
}

const AdmissionManagement = () => {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("All");
    const { toast } = useToast();

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const res = await api.get('/applications');
            setApplications(res.data);
        } catch (error) {
            console.error("Failed to fetch applications", error);
            toast({
                title: "Error",
                description: "Failed to fetch applications",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            await api.put(`/applications/${id}/status`, { status: newStatus });
            toast({
                title: "Success",
                description: `Application status updated to ${newStatus}`,
            });
            fetchApplications();

            // Update selected app locally to reflect change in dialog if open
            if (selectedApp && selectedApp.id === id) {
                setSelectedApp(prev => prev ? { ...prev, status: newStatus as any } : null);
                // If accepted/rejected, maybe close dialog?
                setIsDialogOpen(false);
            }
        } catch (error) {
            console.error("Failed to update status", error);
            toast({
                title: "Error",
                description: "Failed to update application status",
                variant: "destructive",
            });
        }
    };

    const filteredApplications = activeTab === "All"
        ? applications
        : applications.filter(app => app.status === activeTab);

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'Accepted': return 'default'; // usually black/primary
            case 'Rejected': return 'destructive';
            case 'Under Review': return 'secondary';
            default: return 'outline';
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar links={ADMIN_LINKS} />
            <main className="flex-grow bg-background p-8">
                <div className="container mx-auto max-w-6xl">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold">Admission Applications</h1>
                        <Button onClick={fetchApplications} variant="outline" size="sm">
                            Refresh
                        </Button>
                    </div>

                    <Tabs defaultValue="All" onValueChange={setActiveTab} className="w-full">
                        <TabsList className="mb-4">
                            <TabsTrigger value="All">All</TabsTrigger>
                            <TabsTrigger value="Submitted">Submitted</TabsTrigger>
                            <TabsTrigger value="Under Review">Under Review</TabsTrigger>
                            <TabsTrigger value="Accepted">Accepted</TabsTrigger>
                            <TabsTrigger value="Rejected">Rejected</TabsTrigger>
                        </TabsList>

                        {loading ? (
                            <div className="flex justify-center p-12">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        ) : (
                            <div className="border rounded-lg overflow-hidden bg-card text-card-foreground shadow-sm">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Major</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredApplications.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                                    No applications found for this filter.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredApplications.map((app) => (
                                                <TableRow key={app.id}>
                                                    <TableCell>{new Date(app.createdAt).toLocaleDateString()}</TableCell>
                                                    <TableCell className="font-medium">{app.name}</TableCell>
                                                    <TableCell>{app.email}</TableCell>
                                                    <TableCell>{app.intendedMajor}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={getStatusBadgeVariant(app.status)}>
                                                            {app.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedApp(app);
                                                                setIsDialogOpen(true);
                                                            }}
                                                        >
                                                            View Details
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </Tabs>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Application Details</DialogTitle>
                                <DialogDescription>
                                    Review application information below.
                                </DialogDescription>
                            </DialogHeader>
                            {selectedApp && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="font-semibold text-muted-foreground">Name:</span>
                                            <div className="mt-1">{selectedApp.name}</div>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-muted-foreground">Email:</span>
                                            <div className="mt-1">{selectedApp.email}</div>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-muted-foreground">Intended Major:</span>
                                            <div className="mt-1">{selectedApp.intendedMajor}</div>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-muted-foreground">Status:</span>
                                            <div className="mt-1">
                                                <Badge variant={getStatusBadgeVariant(selectedApp.status)}>
                                                    {selectedApp.status}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="font-semibold text-muted-foreground">Previous Education:</span>
                                            <div className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                                                {selectedApp.previousEducation}
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="font-semibold text-muted-foreground">Submitted On:</span>
                                            <div className="mt-1">
                                                {new Date(selectedApp.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>

                                    <DialogFooter className="flex-col sm:flex-row gap-2 mt-6">
                                        {selectedApp.status !== 'Accepted' && selectedApp.status !== 'Rejected' && (
                                            <>
                                                <Button
                                                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 hover:text-white"
                                                    onClick={() => updateStatus(selectedApp.id, 'Accepted')}
                                                >
                                                    Approve & Accept
                                                </Button>
                                                <Button
                                                    className="w-full sm:w-auto"
                                                    variant="destructive"
                                                    onClick={() => updateStatus(selectedApp.id, 'Rejected')}
                                                >
                                                    Reject
                                                </Button>
                                                {selectedApp.status === 'Submitted' && (
                                                    <Button
                                                        className="w-full sm:w-auto"
                                                        variant="outline"
                                                        onClick={() => updateStatus(selectedApp.id, 'Under Review')}
                                                    >
                                                        Mark Under Review
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
                                            Close
                                        </Button>
                                    </DialogFooter>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </main>
        </div>
    );
};

export default AdmissionManagement;
