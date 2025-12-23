import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { ADMIN_LINKS } from "@/config/navLinks";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AssetForm } from "@/components/AssetForm";
import {
    getAllAssets,
    createAsset,
    updateAsset,
    deleteAsset,
    type Asset,
    type CreateAssetData,
    type UpdateAssetData
} from "@/lib/assetService";
import { Plus, Pencil, Trash2, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";

export default function AssetManagement() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | undefined>(undefined);
    const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const { toast } = useToast();
    const navigate = useNavigate();

    const fetchAssets = async () => {
        try {
            setLoading(true);
            const data = await getAllAssets();
            setAssets(data);
        } catch (error) {
            console.error("Failed to fetch assets:", error);
            toast({
                title: "Error",
                description: "Failed to load assets. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssets();
    }, []);

    const handleCreateAsset = () => {
        setEditingAsset(undefined);
        setIsDialogOpen(true);
    };

    const handleEditAsset = (asset: Asset) => {
        setEditingAsset(asset);
        setIsDialogOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        setDeleteConfirmation(id);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmation) return;

        try {
            await deleteAsset(deleteConfirmation);
            toast({
                title: "Success",
                description: "Asset deleted successfully.",
            });
            fetchAssets();
        } catch (error: any) {
            console.error("Failed to delete asset:", error);
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to delete asset.",
                variant: "destructive",
            });
        } finally {
            setDeleteConfirmation(null);
        }
    };

    const handleFormSubmit = async (data: CreateAssetData | UpdateAssetData) => {
        try {
            if (editingAsset) {
                await updateAsset(editingAsset.id, data as UpdateAssetData);
                toast({
                    title: "Success",
                    description: "Asset updated successfully.",
                });
            } else {
                await createAsset(data as CreateAssetData);
                toast({
                    title: "Success",
                    description: "Asset created successfully.",
                });
            }
            setIsDialogOpen(false);
            fetchAssets();
        } catch (error: any) {
            console.error("Failed to save asset:", error);
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to save asset.",
                variant: "destructive",
            });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Available': return 'bg-green-500 hover:bg-green-600';
            case 'In Use': return 'bg-blue-500 hover:bg-blue-600';
            case 'Retired': return 'bg-gray-500 hover:bg-gray-600';
            default: return 'bg-gray-500';
        }
    };

    const filteredAssets = assets.filter(asset => {
        const matchesSearch =
            asset.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            asset.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = typeFilter === "all" || asset.type === typeFilter;
        const matchesStatus = statusFilter === "all" || asset.status === statusFilter;

        return matchesSearch && matchesType && matchesStatus;
    });

    return (
        <div className="flex flex-col min-h-screen bg-gray-50/50">
            <Navbar links={ADMIN_LINKS} />

            <div className="flex-1 p-8 pt-6 space-y-6 container mx-auto max-w-7xl">
                <div className="flex flex-col space-y-2 md:flex-row md:justify-between md:items-center md:space-y-0">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Asset Management</h1>
                        <p className="text-muted-foreground mt-1">
                            Track and manage hardware and software assets inventory.
                        </p>
                    </div>
                    <Button onClick={handleCreateAsset} className="bg-primary shadow-sm">
                        <Plus className="mr-2 h-4 w-4" /> Add Asset
                    </Button>
                </div>

                <div className="bg-white rounded-xl border shadow-sm p-4 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or serial number..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-[140px]">
                                    <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="Hardware">Hardware</SelectItem>
                                    <SelectItem value="Software">Software</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[140px]">
                                    <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="Available">Available</SelectItem>
                                    <SelectItem value="In Use">In Use</SelectItem>
                                    <SelectItem value="Retired">Retired</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead className="font-semibold">Asset Name</TableHead>
                                    <TableHead className="font-semibold">Serial / License</TableHead>
                                    <TableHead className="font-semibold">Type</TableHead>
                                    <TableHead className="font-semibold">Status</TableHead>
                                    <TableHead className="font-semibold">Value</TableHead>
                                    <TableHead className="font-semibold">Purchase Date</TableHead>
                                    <TableHead className="text-right font-semibold">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            Loading assets...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredAssets.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            No assets found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredAssets.map((asset) => (
                                        <TableRow key={asset.id} className="hover:bg-gray-50/50 transition-colors">
                                            <TableCell className="font-medium cursor-pointer text-primary hover:underline" onClick={() => navigate(`/admin/assets/${asset.id}`)}>
                                                {asset.assetName}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground font-mono text-sm">{asset.serialNumber}</TableCell>
                                            <TableCell>
                                                <Badge variant={asset.type === 'Hardware' ? 'secondary' : 'outline'}>
                                                    {asset.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`${getStatusColor(asset.status)} text-white border-0`}>
                                                    {asset.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>${Number(asset.value).toFixed(2)}</TableCell>
                                            <TableCell>{asset.purchaseDate}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEditAsset(asset)}
                                                        className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                        <span className="sr-only">Edit</span>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteClick(asset.id)}
                                                        className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        <span className="sr-only">Delete</span>
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
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{editingAsset ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
                        <DialogDescription>
                            {editingAsset ? 'Update asset details properly.' : 'Enter the details of the new asset below.'}
                        </DialogDescription>
                    </DialogHeader>
                    <AssetForm
                        initialData={editingAsset}
                        onSubmit={handleFormSubmit}
                        onCancel={() => setIsDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteConfirmation} onOpenChange={(open: boolean) => !open && setDeleteConfirmation(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the asset from the system.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
