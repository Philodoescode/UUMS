import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    RefreshCw,
    Plus,
    Package,
    Filter,
    Eye,
    Pencil,
    Trash2,
    UserCheck,
    RotateCcw,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
    getAllAssets,
    createAsset,
    updateAsset,
    deleteAsset,
    checkoutAsset,
    returnAsset,
    type Asset,
    type CreateAssetData,
} from '@/lib/assetService';

// Fetch users for checkout dropdown
import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface User {
    id: string;
    fullName: string;
    email: string;
}

const AssetManagement = () => {
    const navigate = useNavigate();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const { toast } = useToast();

    // Dialog states
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

    // Form states
    const [formData, setFormData] = useState<CreateAssetData>({
        name: '',
        assetTag: '',
        category: 'other',
        location: '',
        description: '',
    });
    const [checkoutUserId, setCheckoutUserId] = useState('');
    const [checkoutNotes, setCheckoutNotes] = useState('');
    const [users, setUsers] = useState<User[]>([]);

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const data = await getAllAssets();
            setAssets(data);
            setFilteredAssets(data);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: 'Failed to load assets',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/users`, {
                withCredentials: true,
            });
            setUsers(response.data);
        } catch (error) {
            console.error('Failed to fetch users');
        }
    };

    useEffect(() => {
        fetchAssets();
        fetchUsers();
    }, []);

    useEffect(() => {
        let filtered = assets;
        if (statusFilter !== 'all') {
            filtered = filtered.filter((a) => a.status === statusFilter);
        }
        if (categoryFilter !== 'all') {
            filtered = filtered.filter((a) => a.category === categoryFilter);
        }
        setFilteredAssets(filtered);
    }, [statusFilter, categoryFilter, assets]);

    const handleCreate = async () => {
        try {
            await createAsset(formData);
            toast({ title: 'Success', description: 'Asset created successfully' });
            setCreateDialogOpen(false);
            resetForm();
            fetchAssets();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to create asset',
                variant: 'destructive',
            });
        }
    };

    const handleUpdate = async () => {
        if (!selectedAsset) return;
        try {
            await updateAsset(selectedAsset.id, formData);
            toast({ title: 'Success', description: 'Asset updated successfully' });
            setEditDialogOpen(false);
            resetForm();
            fetchAssets();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to update asset',
                variant: 'destructive',
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this asset?')) return;
        try {
            await deleteAsset(id);
            toast({ title: 'Success', description: 'Asset deleted successfully' });
            fetchAssets();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to delete asset',
                variant: 'destructive',
            });
        }
    };

    const handleCheckout = async () => {
        if (!selectedAsset || !checkoutUserId) return;
        try {
            await checkoutAsset(selectedAsset.id, checkoutUserId, checkoutNotes);
            toast({ title: 'Success', description: 'Asset checked out successfully' });
            setCheckoutDialogOpen(false);
            setCheckoutUserId('');
            setCheckoutNotes('');
            fetchAssets();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to checkout asset',
                variant: 'destructive',
            });
        }
    };

    const handleReturn = async (asset: Asset) => {
        try {
            await returnAsset(asset.id);
            toast({ title: 'Success', description: 'Asset returned successfully' });
            fetchAssets();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to return asset',
                variant: 'destructive',
            });
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            assetTag: '',
            category: 'other',
            location: '',
            description: '',
        });
        setSelectedAsset(null);
    };

    const openEditDialog = (asset: Asset) => {
        setSelectedAsset(asset);
        setFormData({
            name: asset.name,
            assetTag: asset.assetTag,
            category: asset.category,
            location: asset.location || '',
            description: asset.description || '',
        });
        setEditDialogOpen(true);
    };

    const openCheckoutDialog = (asset: Asset) => {
        setSelectedAsset(asset);
        setCheckoutDialogOpen(true);
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
        switch (category) {
            case 'equipment':
                return <Badge variant="outline">Equipment</Badge>;
            case 'furniture':
                return <Badge variant="outline">Furniture</Badge>;
            case 'electronics':
                return <Badge variant="outline">Electronics</Badge>;
            default:
                return <Badge variant="outline">Other</Badge>;
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar links={ADMIN_LINKS} />
            <main className="flex-grow container mx-auto p-6">
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold">Asset Management</h1>
                            <p className="text-muted-foreground mt-1">
                                Track and manage university assets
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[150px]">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="available">Available</SelectItem>
                                        <SelectItem value="checked_out">Checked Out</SelectItem>
                                        <SelectItem value="maintenance">Maintenance</SelectItem>
                                        <SelectItem value="retired">Retired</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="w-[150px]">
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        <SelectItem value="equipment">Equipment</SelectItem>
                                        <SelectItem value="furniture">Furniture</SelectItem>
                                        <SelectItem value="electronics">Electronics</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button onClick={resetForm}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Asset
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Create New Asset</DialogTitle>
                                        <DialogDescription>
                                            Add a new asset to the inventory
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">Name</Label>
                                            <Input
                                                id="name"
                                                value={formData.name}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, name: e.target.value })
                                                }
                                                placeholder="Asset name"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="assetTag">Asset Tag</Label>
                                            <Input
                                                id="assetTag"
                                                value={formData.assetTag}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, assetTag: e.target.value })
                                                }
                                                placeholder="Unique identifier (e.g., AST-001)"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="category">Category</Label>
                                            <Select
                                                value={formData.category}
                                                onValueChange={(v: any) =>
                                                    setFormData({ ...formData, category: v })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="equipment">Equipment</SelectItem>
                                                    <SelectItem value="furniture">Furniture</SelectItem>
                                                    <SelectItem value="electronics">Electronics</SelectItem>
                                                    <SelectItem value="other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="location">Location</Label>
                                            <Input
                                                id="location"
                                                value={formData.location}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, location: e.target.value })
                                                }
                                                placeholder="Current location"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="description">Description</Label>
                                            <Textarea
                                                id="description"
                                                value={formData.description}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, description: e.target.value })
                                                }
                                                placeholder="Description (optional)"
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button onClick={handleCreate}>Create Asset</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    <div className="border rounded-lg bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Asset</TableHead>
                                    <TableHead>Tag</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Current Holder</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8">
                                            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                            <p className="text-muted-foreground mt-2">Loading assets...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredAssets.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8">
                                            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                                            <p className="text-muted-foreground">No assets found</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredAssets.map((asset) => (
                                        <TableRow key={asset.id}>
                                            <TableCell>
                                                <div className="font-medium">{asset.name}</div>
                                                {asset.description && (
                                                    <div className="text-sm text-muted-foreground truncate max-w-xs">
                                                        {asset.description}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <code className="text-sm bg-muted px-2 py-1 rounded">
                                                    {asset.assetTag}
                                                </code>
                                            </TableCell>
                                            <TableCell>{getCategoryBadge(asset.category)}</TableCell>
                                            <TableCell>{getStatusBadge(asset.status)}</TableCell>
                                            <TableCell>
                                                {asset.currentHolder ? (
                                                    <div>
                                                        <div className="text-sm">{asset.currentHolder.fullName}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {asset.currentHolder.email}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {asset.location || <span className="text-muted-foreground">—</span>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => navigate(`/admin/assets/${asset.id}`)}
                                                        title="View Details"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditDialog(asset)}
                                                        title="Edit"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    {asset.status === 'available' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openCheckoutDialog(asset)}
                                                            title="Checkout"
                                                        >
                                                            <UserCheck className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {asset.status === 'checked_out' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleReturn(asset)}
                                                            title="Return"
                                                        >
                                                            <RotateCcw className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(asset.id)}
                                                        title="Delete"
                                                        disabled={asset.status === 'checked_out'}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </main>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Asset</DialogTitle>
                        <DialogDescription>Update asset information</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">Name</Label>
                            <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-assetTag">Asset Tag</Label>
                            <Input
                                id="edit-assetTag"
                                value={formData.assetTag}
                                onChange={(e) => setFormData({ ...formData, assetTag: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-category">Category</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(v: any) => setFormData({ ...formData, category: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="equipment">Equipment</SelectItem>
                                    <SelectItem value="furniture">Furniture</SelectItem>
                                    <SelectItem value="electronics">Electronics</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-location">Location</Label>
                            <Input
                                id="edit-location"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea
                                id="edit-description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdate}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Checkout Dialog */}
            <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Checkout Asset</DialogTitle>
                        <DialogDescription>
                            Assign "{selectedAsset?.name}" to a user
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="checkout-user">Assign To</Label>
                            <Select value={checkoutUserId} onValueChange={setCheckoutUserId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a user" />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map((user) => (
                                        <SelectItem key={user.id} value={user.id}>
                                            {user.fullName} ({user.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="checkout-notes">Notes (optional)</Label>
                            <Textarea
                                id="checkout-notes"
                                value={checkoutNotes}
                                onChange={(e) => setCheckoutNotes(e.target.value)}
                                placeholder="Add notes about this checkout"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCheckoutDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCheckout} disabled={!checkoutUserId}>
                            Checkout
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AssetManagement;
