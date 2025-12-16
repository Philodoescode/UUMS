import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, RefreshCw, Building2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { ADMIN_LINKS } from '@/config/navLinks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  getAllFacilities,
  createFacility,
  updateFacility,
  deleteFacility,
  updateFacilityStatus,
  type Facility,
  type FacilityFilters,
} from '@/lib/facilityService';

const FacilityManagement = () => {
  // State management
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const { toast } = useToast();

  // Pagination state
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });

  // Filter state
  const [filters, setFilters] = useState<FacilityFilters>({
    page: 1,
    limit: 20,
  });

  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'Classroom' as 'Classroom' | 'Laboratory',
    capacity: 0,
    status: 'Active' as 'Active' | 'Maintenance',
    description: '',
    floor: '',
    building: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch facilities
  const fetchFacilities = async () => {
    setLoading(true);
    try {
      const data = await getAllFacilities(filters);
      setFacilities(data.facilities);
      setPagination(data.pagination);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load facilities',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, [filters]);

  // Apply filters
  const handleApplyFilters = () => {
    setFilters({
      ...filters,
      page: 1,
      search: searchInput || undefined,
      type: typeFilter !== 'all' ? (typeFilter as any) : undefined,
      status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
    });
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchInput('');
    setTypeFilter('all');
    setStatusFilter('all');
    setFilters({
      page: 1,
      limit: 20,
    });
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.length < 2 || formData.name.length > 100) {
      errors.name = 'Name must be 2-100 characters';
    }

    if (!formData.code.trim()) {
      errors.code = 'Code is required';
    } else if (formData.code.length < 2 || formData.code.length > 20) {
      errors.code = 'Code must be 2-20 characters';
    }

    if (!formData.capacity || formData.capacity < 1) {
      errors.capacity = 'Capacity must be at least 1';
    } else if (formData.capacity > 1000) {
      errors.capacity = 'Capacity cannot exceed 1000';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle create/update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (selectedFacility) {
        await updateFacility(selectedFacility.id, formData);
        toast({
          title: 'Success',
          description: 'Facility updated successfully',
        });
      } else {
        await createFacility(formData);
        toast({
          title: 'Success',
          description: 'Facility created successfully',
        });
      }
      setDialogOpen(false);
      resetForm();
      fetchFacilities();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Operation failed',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (facility: Facility) => {
    if (!confirm(`Are you sure you want to delete "${facility.name}"?`)) {
      return;
    }

    setLoading(true);
    try {
      await deleteFacility(facility.id);
      toast({
        title: 'Success',
        description: 'Facility deleted successfully',
      });
      fetchFacilities();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete facility',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle status toggle
  const handleStatusToggle = async (facility: Facility) => {
    const newStatus = facility.status === 'Active' ? 'Maintenance' : 'Active';

    try {
      await updateFacilityStatus(facility.id, newStatus);
      toast({
        title: 'Success',
        description: `Facility status changed to ${newStatus}`,
      });
      fetchFacilities();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  // Open edit dialog
  const openEditDialog = (facility: Facility) => {
    setSelectedFacility(facility);
    setFormData({
      name: facility.name,
      code: facility.code,
      type: facility.type,
      capacity: facility.capacity,
      status: facility.status,
      description: facility.description || '',
      floor: facility.floor || '',
      building: facility.building || '',
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  // Open create dialog
  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setSelectedFacility(null);
    setFormData({
      name: '',
      code: '',
      type: 'Classroom',
      capacity: 0,
      status: 'Active',
      description: '',
      floor: '',
      building: '',
    });
    setFormErrors({});
  };

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage });
  };

  const handleLimitChange = (newLimit: string) => {
    setFilters({ ...filters, page: 1, limit: parseInt(newLimit) });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar links={ADMIN_LINKS} />
      <main className="flex-grow container mx-auto p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Facility Management</h1>
              <p className="text-muted-foreground mt-1">
                Manage classrooms and laboratories
              </p>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" /> Add Facility
            </Button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-card p-4 rounded-lg border">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Name or code..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-8"
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Classroom">Classroom</SelectItem>
                  <SelectItem value="Laboratory">Laboratory</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={handleApplyFilters} className="flex-1">
                Apply Filters
              </Button>
              <Button onClick={handleResetFilters} variant="outline">
                Reset
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="text-sm text-muted-foreground">
            Showing {facilities.length} of {pagination.total} facilities
          </div>

          {/* Table */}
          <div className="border rounded-lg bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Building</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground mt-2">Loading facilities...</p>
                    </TableCell>
                  </TableRow>
                ) : facilities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No facilities found</p>
                      <Button
                        onClick={openCreateDialog}
                        variant="outline"
                        size="sm"
                        className="mt-4"
                      >
                        <Plus className="mr-2 h-4 w-4" /> Add First Facility
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  facilities.map((facility) => (
                    <TableRow key={facility.id}>
                      <TableCell className="font-mono font-semibold">
                        {facility.code}
                      </TableCell>
                      <TableCell>{facility.name}</TableCell>
                      <TableCell>
                        <Badge variant={facility.type === 'Laboratory' ? 'default' : 'secondary'}>
                          {facility.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{facility.capacity}</TableCell>
                      <TableCell>
                        <Badge
                          variant={facility.status === 'Active' ? 'default' : 'destructive'}
                          className="cursor-pointer"
                          onClick={() => handleStatusToggle(facility)}
                        >
                          {facility.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{facility.building || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(facility)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(facility)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="pageSize">Items per page:</Label>
                <Select
                  value={filters.limit?.toString() || '20'}
                  onValueChange={handleLimitChange}
                >
                  <SelectTrigger id="pageSize" className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedFacility ? 'Edit Facility' : 'Create New Facility'}
            </DialogTitle>
            <DialogDescription>
              {selectedFacility
                ? 'Update facility information'
                : 'Add a new classroom or laboratory to the system'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Computer Lab A"
                />
                {formErrors.name && (
                  <p className="text-sm text-destructive">{formErrors.name}</p>
                )}
              </div>

              {/* Code */}
              <div className="space-y-2">
                <Label htmlFor="code">
                  Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g., SCI-101"
                  className="font-mono"
                />
                {formErrors.code && (
                  <p className="text-sm text-destructive">{formErrors.code}</p>
                )}
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="facilityType">
                  Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'Classroom' | 'Laboratory') =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger id="facilityType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Classroom">Classroom</SelectItem>
                    <SelectItem value="Laboratory">Laboratory</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Capacity */}
              <div className="space-y-2">
                <Label htmlFor="capacity">
                  Capacity <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })
                  }
                  placeholder="e.g., 30"
                  min="1"
                  max="1000"
                />
                {formErrors.capacity && (
                  <p className="text-sm text-destructive">{formErrors.capacity}</p>
                )}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="facilityStatus">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'Active' | 'Maintenance') =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger id="facilityStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Building */}
              <div className="space-y-2">
                <Label htmlFor="building">Building</Label>
                <Input
                  id="building"
                  value={formData.building}
                  onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                  placeholder="e.g., Engineering Building"
                />
              </div>

              {/* Floor */}
              <div className="space-y-2 col-span-2">
                <Label htmlFor="floor">Floor</Label>
                <Input
                  id="floor"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  placeholder="e.g., 2nd Floor"
                />
              </div>

              {/* Description */}
              <div className="space-y-2 col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional information about the facility..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : selectedFacility ? (
                  'Update Facility'
                ) : (
                  'Create Facility'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FacilityManagement;
