import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CreateAssetData, UpdateAssetData, Asset } from '@/lib/assetService';

interface AssetFormProps {
    initialData?: Asset;
    onSubmit: (data: CreateAssetData | UpdateAssetData) => Promise<void>;
    onCancel: () => void;
    isSubmitting?: boolean;
}

export function AssetForm({ initialData, onSubmit, onCancel, isSubmitting = false }: AssetFormProps) {
    const [formData, setFormData] = useState<CreateAssetData & { status?: string }>({
        assetName: '',
        serialNumber: '',
        type: 'Hardware',
        purchaseDate: new Date().toISOString().split('T')[0],
        value: 0,
        location: '',
        description: '',
        status: 'Available',
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                assetName: initialData.assetName,
                serialNumber: initialData.serialNumber,
                type: initialData.type,
                purchaseDate: initialData.purchaseDate,
                value: initialData.value,
                location: initialData.location || '',
                description: initialData.description || '',
                status: initialData.status,
            });
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'value' ? parseFloat(value) || 0 : value
        }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="assetName">Asset Name</Label>
                    <Input
                        id="assetName"
                        name="assetName"
                        value={formData.assetName}
                        onChange={handleChange}
                        required
                        placeholder="e.g. Dell XPS 15"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="serialNumber">Serial Number / License Key</Label>
                    <Input
                        id="serialNumber"
                        name="serialNumber"
                        value={formData.serialNumber}
                        onChange={handleChange}
                        required
                        placeholder="Unique Identifier"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                        value={formData.type}
                        onValueChange={(value) => handleSelectChange('type', value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Hardware">Hardware</SelectItem>
                            <SelectItem value="Software">Software</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="purchaseDate">Purchase Date</Label>
                    <Input
                        id="purchaseDate"
                        name="purchaseDate"
                        type="date"
                        value={formData.purchaseDate}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="value">Value ($)</Label>
                    <Input
                        id="value"
                        name="value"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.value}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                        value={formData.status}
                        onValueChange={(value) => handleSelectChange('status', value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Available">Available</SelectItem>
                            <SelectItem value="In Use">In Use</SelectItem>
                            <SelectItem value="Retired">Retired</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        placeholder="e.g. IT storage room"
                    />
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Additional details..."
                        className="min-h-[100px]"
                    />
                </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : initialData ? 'Update Asset' : 'Create Asset'}
                </Button>
            </div>
        </form>
    );
}
