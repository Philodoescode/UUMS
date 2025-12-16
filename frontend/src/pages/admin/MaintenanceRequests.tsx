import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, Clock, AlertTriangle, Filter } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { ADMIN_LINKS } from '@/config/navLinks';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
    getMaintenanceRequests,
    updateMaintenanceStatus,
    type MaintenanceRequest,
} from '@/lib/maintenanceService';

const MaintenanceRequests = () => {
    const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
    const [filteredRequests, setFilteredRequests] = useState<MaintenanceRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const { toast } = useToast();

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const data = await getMaintenanceRequests();
            setRequests(data);
            setFilteredRequests(data);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: 'Failed to load requests',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    useEffect(() => {
        if (statusFilter === 'all') {
            setFilteredRequests(requests);
        } else {
            setFilteredRequests(requests.filter((r) => r.status === statusFilter));
        }
    }, [statusFilter, requests]);

    const handleStatusChange = async (id: string, newStatus: 'Reported' | 'In Progress' | 'Resolved') => {
        try {
            await updateMaintenanceStatus(id, newStatus);
            toast({
                title: 'Success',
                description: `Status updated to ${newStatus}`,
            });
            fetchRequests();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: 'Failed to update status',
                variant: 'destructive',
            });
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Resolved':
                return <Badge className="bg-green-500 hover:bg-green-600">Resolved</Badge>;
            case 'In Progress':
                return <Badge className="bg-blue-500 hover:bg-blue-600">In Progress</Badge>;
            case 'Reported':
                return <Badge variant="destructive">Reported</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
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
            <Navbar links={ADMIN_LINKS} />
            <main className="flex-grow container mx-auto p-6">
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold">Maintenance Requests</h1>
                            <p className="text-muted-foreground mt-1">
                                Manage and track facility maintenance issues
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="Reported">Reported</SelectItem>
                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                    <SelectItem value="Resolved">Resolved</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="border rounded-lg bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Facility</TableHead>
                                    <TableHead>Reported By</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Severity</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8">
                                            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                            <p className="text-muted-foreground mt-2">Loading requests...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredRequests.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8">
                                            <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                                            <p className="text-muted-foreground">No requests found</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRequests.map((request) => (
                                        <TableRow key={request.id}>
                                            <TableCell>
                                                <div className="font-medium">{request.Facility?.name}</div>
                                                <div className="text-sm text-muted-foreground font-mono">
                                                    {request.Facility?.code}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">{request.reportedBy?.fullName}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {request.reportedBy?.email}
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate" title={request.description}>
                                                {request.description}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getSeverityIcon(request.severity)}
                                                    {request.severity}
                                                </div>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(request.status)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(request.createdAt).toLocaleDateString()}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Select
                                                    defaultValue={request.status}
                                                    onValueChange={(value: any) =>
                                                        handleStatusChange(request.id, value)
                                                    }
                                                >
                                                    <SelectTrigger className="w-[130px] ml-auto">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Reported">Reported</SelectItem>
                                                        <SelectItem value="In Progress">In Progress</SelectItem>
                                                        <SelectItem value="Resolved">Resolved</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MaintenanceRequests;
