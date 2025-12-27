import { useState, useEffect, useCallback } from 'react';
import { Plus, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { INSTRUCTOR_LINKS } from '@/config/navLinks';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
    createMaintenanceRequest,
    getMaintenanceRequests,
    type MaintenanceRequest,
} from '@/lib/maintenanceService';
import { getAllFacilities, type Facility } from '@/lib/facilityService';

const MaintenanceReporting = () => {
    const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        facilityId: '',
        description: '',
        severity: 'Low' as 'Low' | 'Medium' | 'High',
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [requestsData, facilitiesData] = await Promise.all([
                getMaintenanceRequests(),
                // Note: Loading all facilities for dropdown. Consider implementing
                // pagination, search, or lazy loading if facility count grows significantly
                getAllFacilities({ limit: 1000 }),
            ]);
            setRequests(requestsData);
            setFacilities(facilitiesData.facilities);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: 'Failed to load maintenance requests and facilities',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.facilityId || !formData.description) {
            toast({
                title: 'Error',
                description: 'Please fill in all required fields',
                variant: 'destructive',
            });
            return;
        }

        try {
            await createMaintenanceRequest(formData);
            toast({
                title: 'Success',
                description: 'Maintenance request submitted successfully',
            });
            setDialogOpen(false);
            setFormData({
                facilityId: '',
                description: '',
                severity: 'Low',
            });
            fetchData();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to submit request',
                variant: 'destructive',
            });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Resolved':
                return 'default'; // primary/black
            case 'In Progress':
                return 'secondary'; // gray
            case 'Reported':
                return 'destructive'; // red - using destructive for attention
            default:
                return 'outline';
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'High':
                return <AlertTriangle className="h-4 w-4 text-destructive" />;
            case 'Medium':
                return <AlertTriangle className="h-4 w-4 text-orange-500" />;
            case 'Low':
                return <AlertTriangle className="h-4 w-4 text-blue-500" />;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar links={INSTRUCTOR_LINKS} />
            <main className="flex-grow container mx-auto p-6">
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold">Facility Maintenance</h1>
                            <p className="text-muted-foreground mt-1">
                                Report and track facility issues
                            </p>
                        </div>
                        <Button onClick={() => setDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Report Issue
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {requests.map((request) => (
                            <Card key={request.id}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg">
                                            {request.Facility?.name}
                                        </CardTitle>
                                        <Badge variant={getStatusColor(request.status)}>
                                            {request.status}
                                        </Badge>
                                    </div>
                                    <CardDescription>
                                        {request.Facility?.code} • {request.Facility?.building}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <p className="text-sm font-medium mb-1">Issue Description</p>
                                        <p className="text-sm text-muted-foreground">
                                            {request.description}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            {getSeverityIcon(request.severity)}
                                            {request.severity} Priority
                                        </span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            {new Date(request.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {requests.length === 0 && !loading && (
                            <div className="col-span-full text-center py-12 text-muted-foreground">
                                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>No maintenance requests found.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Report Maintenance Issue</DialogTitle>
                        <DialogDescription>
                            Submit a maintenance request for a facility.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="facility">Facility</Label>
                            <Select
                                value={formData.facilityId}
                                onValueChange={(value) =>
                                    setFormData({ ...formData, facilityId: value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select facility" />
                                </SelectTrigger>
                                <SelectContent>
                                    {facilities.map((f) => (
                                        <SelectItem key={f.id} value={f.id}>
                                            {f.code} - {f.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="severity">Severity</Label>
                            <Select
                                value={formData.severity}
                                onValueChange={(value: 'Low' | 'Medium' | 'High') =>
                                    setFormData({ ...formData, severity: value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Low">Low - Cosmetic/Minor</SelectItem>
                                    <SelectItem value="Medium">Medium - Affects Function</SelectItem>
                                    <SelectItem value="High">High - Critical/Safety</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                placeholder="Describe the issue..."
                                rows={4}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Submit Request</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MaintenanceReporting;
