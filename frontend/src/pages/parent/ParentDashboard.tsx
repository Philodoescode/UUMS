import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import { PARENT_LINKS } from "@/config/navLinks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Child {
    id: string;
    fullName: string;
    email: string;
}

const ParentDashboard = () => {
    const [children, setChildren] = useState<Child[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchChildren = async () => {
            try {
                const response = await api.get('/parent/children');
                setChildren(response.data);
            } catch (error) {
                console.error("Failed to fetch children", error);
            } finally {
                setLoading(false);
            }
        };

        fetchChildren();
    }, []);

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Navbar links={PARENT_LINKS} />
            <main className="container mx-auto p-6 md:p-10">
                <h1 className="text-3xl font-bold mb-8">Parent Dashboard</h1>

                {loading ? (
                    <div>Loading children...</div>
                ) : children.length === 0 ? (
                    <div className="text-muted-foreground">No students are linked to your account.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {children.map((child) => (
                            <Card key={child.id} className="hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <CardTitle>{child.fullName}</CardTitle>
                                    <CardDescription>Student</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">{child.email}</p>
                                    <Link to={`/parent/child-progress/${child.id}`}>
                                        <Button className="w-full">View Progress</Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default ParentDashboard;
