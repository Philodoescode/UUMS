import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Laptop, Key } from "lucide-react";
import { getMyAssets, type Asset } from "@/lib/assetService"; // Ensure type checks out

// We might need to adjust types in assetService or define here if response structure differs
interface MyAssets {
    hardware: Asset[];
    software: any[]; // The shape I returned from backend: { id, assetName, serialNumber, type, description, assignedDate }
}

export function StudentResources() {
    const [assets, setAssets] = useState<MyAssets | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAssets = async () => {
            try {
                const data = await getMyAssets();
                setAssets(data);
            } catch (error) {
                console.error("Failed to load assets", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAssets();
    }, []);

    if (loading) {
        return <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
        </div>;
    }

    const hasAssets = assets && (assets.hardware.length > 0 || assets.software.length > 0);

    if (!hasAssets) {
        return (
            <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                    You have no assigned resources at this time.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {assets?.software.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                        <Key className="h-5 w-5" /> Software Licenses
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {assets.software.map((item) => (
                            <Card key={item.id}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg">{item.assetName}</CardTitle>
                                        <Badge variant="secondary">Software</Badge>
                                    </div>
                                    <CardDescription>Assigned: {new Date(item.assignedDate).toLocaleDateString()}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="bg-muted p-3 rounded-md font-mono text-sm break-all">
                                        {item.serialNumber}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">License Key</p>
                                    {item.description && <p className="text-sm mt-2">{item.description}</p>}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {assets?.hardware.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                        <Laptop className="h-5 w-5" /> Hardware Assets
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {assets.hardware.map((item) => (
                            <Card key={item.id}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg">{item.assetName}</CardTitle>
                                        <Badge variant="outline">Hardware</Badge>
                                    </div>
                                    <CardDescription>Serial: {item.serialNumber}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm">{item.description || 'No description provided.'}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
