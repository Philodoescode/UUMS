import { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileIcon, DownloadIcon } from "lucide-react";
import api from "@/lib/api";

interface Material {
    id: string;
    title: string;
    description: string;
    fileUrl: string;
    version: number;
    createdAt: string;
}

interface StudentMaterialListProps {
    courseId: string;
}

export function StudentMaterialList({ courseId }: StudentMaterialListProps) {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMaterials = async () => {
            try {
                const response = await api.get(`/materials/course/${courseId}`);
                setMaterials(response.data);
            } catch (err) {
                console.error("Failed to load materials", err);
            } finally {
                setLoading(false);
            }
        };

        if (courseId) {
            fetchMaterials();
        }
    }, [courseId]);

    if (loading) return <div>Loading materials...</div>;

    if (materials.length === 0) {
        return <div className="text-gray-500 text-sm italic">No materials available.</div>;
    }

    return (
        <div className="space-y-3">
            {materials.map((material) => (
                <Card key={material.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-start gap-3">
                            <div className="bg-primary/5 p-2 rounded">
                                <FileIcon className="size-5 text-primary" />
                            </div>
                            <div>
                                <h4 className="font-medium text-sm">{material.title}</h4>
                                <p className="text-xs text-muted-foreground">{material.description}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    Posted: {new Date(material.createdAt).toLocaleDateString()} (v{material.version})
                                </p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => window.open(material.fileUrl, '_blank')}>
                            <DownloadIcon className="size-4" />
                        </Button>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
