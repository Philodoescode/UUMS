import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    RefreshCw,
    Package,
    MapPin,
    User,
    Calendar,
    Clock,
    UserCheck,
    RotateCcw,
    LogIn,
    LogOut,
} from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
    getAssetById,
    returnAsset,
    type Asset,
    type AssetAllocationLog,
} from '@/lib/assetService';

const AssetDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [asset, setAsset] = useState<Asset | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchAsset = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await getAssetById(id);
            setAsset(data);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: 'Failed to load asset details',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [id, toast]);

    useEffect(() => {
        fetchAsset();
    }, [fetchAsset]);

    const handleReturn = async () => {
        if (!asset) return;
        try {
            await returnAsset(asset.id);
            toast({ title: 'Success', description: 'Asset returned successfully' });
            fetchAsset();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to return asset',
                variant: 'destructive',
            });
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'available':
                return <Badge className="bg-green-500 hover:bg-green-600">Available</Badge>;
            case 'checked_out':
                return <Badge className="bg-blue-500 hover:bg-blue-600">Checked Out</Badge>;
            case 'maintenance':
                return <Badge className="bg-orange-500 hover:bg-orange-600">Maintenance</Badge>;
            case 'retired':
                return <Badge variant="secondary">Retired</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getCategoryBadge = (category: string) => {
        const labels: Record<string, string> = {
            equipment: 'Equipment',
            furniture: 'Furniture',
            electronics: 'Electronics',
            other: 'Other',
        };
        return <Badge variant="outline">{labels[category] || category}</Badge>;
    };

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'checked_out':
                return <LogOut className="h-4 w-4 text-blue-500" />;
            case 'returned':
                return <LogIn className="h-4 w-4 text-green-500" />;
            default:
                return null;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen">
                <Navbar links={ADMIN_LINKS} />
                <main className="flex-grow container mx-auto p-6 flex items-center justify-center">
                    <div className="text-center">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                        <p className="text-muted-foreground mt-2">Loading asset details...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (!asset) {
        return (
            <div className="flex flex-col min-h-screen">
                <Navbar links={ADMIN_LINKS} />
                <main className="flex-grow container mx-auto p-6 flex items-center justify-center">
                    <div className="text-center">
                        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">Asset not found</p>
                        <Button variant="outline" className="mt-4" onClick={() => navigate('/admin/assets')}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Assets
                        </Button>
                    </div>
                </main>
            </div>
        );
    }

    // Sort allocation history by date (newest first)
    const sortedHistory = [...(asset.allocationHistory || [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar links={ADMIN_LINKS} />
            <main className="flex-grow container mx-auto p-6">
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => navigate('/admin/assets')}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold">{asset.assetName}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <code className="text-sm bg-muted px-2 py-1 rounded">{asset.serialNumber}</code>
                                {getCategoryBadge(asset.type)}
                                {getStatusBadge(asset.status)}
                            </div>
                        </div>
                        {asset.status === 'In Use' && (
                            <Button onClick={handleReturn}>
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Return Asset
                            </Button>
                        )}
                    </div>

                    {/* Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    Location
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-lg font-medium">
                                    {asset.location || <span className="text-muted-foreground">Not specified</span>}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Current Holder
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {asset.currentHolder ? (
                                    <div>
                                        <p className="text-lg font-medium">{asset.currentHolder.fullName}</p>
                                        <p className="text-sm text-muted-foreground">{asset.currentHolder.email}</p>
                                    </div>
                                ) : (
                                    <p className="text-lg font-medium text-muted-foreground">No one</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Added
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-lg font-medium">
                                    {new Date(asset.createdAt).toLocaleDateString()}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Description */}
                    {asset.description && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Description</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">{asset.description}</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Allocation History */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Allocation History
                            </CardTitle>
                            <CardDescription>
                                Track who had this asset and when
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {sortedHistory.length === 0 ? (
                                <div className="text-center py-8">
                                    <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-muted-foreground">No allocation history yet</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Action</TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead>Performed By</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Notes</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedHistory.map((log: AssetAllocationLog) => (
                                            <TableRow key={log.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {getActionIcon(log.action)}
                                                        <span className="capitalize">
                                                            {log.action.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {log.user ? (
                                                        <div>
                                                            <div className="font-medium">{log.user.fullName}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {log.user.email}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {log.performedBy ? (
                                                        <div>
                                                            <div className="text-sm">{log.performedBy.fullName}</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">{formatDate(log.createdAt)}</div>
                                                </TableCell>
                                                <TableCell>
                                                    {log.notes ? (
                                                        <span className="text-sm">{log.notes}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
};

export default AssetDetails;
