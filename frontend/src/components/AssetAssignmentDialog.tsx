import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { checkoutAsset, type Asset } from "@/lib/assetService";

interface AssetAssignmentDialogProps {
    asset: Asset;
    isOpen: boolean;
    onClose: () => void;
    onAssign: () => void;
}

interface User {
    id: string;
    fullName: string;
    email: string;
}

interface Department {
    id: string;
    name: string;
}

export function AssetAssignmentDialog({ asset, isOpen, onClose, onAssign }: AssetAssignmentDialogProps) {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<"person" | "department">("person");
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);

    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (isOpen) {
            fetchData();
            // Reset form
            setSelectedUserId("");
            setSelectedDepartmentId("");
            setNotes("");
        }
    }, [isOpen]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch users (instructors)
            const userRes = await axios.get('http://localhost:3000/api/users?role=instructor', { withCredentials: true });
            setUsers(userRes.data);

            // Fetch departments
            const deptRes = await axios.get('http://localhost:3000/api/departments', { withCredentials: true });
            setDepartments(deptRes.data);
        } catch (error) {
            console.error("Failed to fetch data", error);
            toast({
                title: "Error",
                description: "Failed to load users and departments",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async () => {
        if (activeTab === 'person' && !selectedUserId) {
            toast({ title: "Error", description: "Please select a user", variant: "destructive" });
            return;
        }
        if (activeTab === 'department' && !selectedDepartmentId) {
            toast({ title: "Error", description: "Please select a department", variant: "destructive" });
            return;
        }

        setSubmitting(true);
        try {
            await checkoutAsset(asset.id, {
                userId: activeTab === 'person' ? selectedUserId : undefined,
                departmentId: activeTab === 'department' ? selectedDepartmentId : undefined,
                notes
            });
            toast({ title: "Success", description: "Asset assigned successfully" });
            onAssign();
            onClose();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to assign asset",
                variant: "destructive"
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Assign Asset</DialogTitle>
                    <DialogDescription>
                        Assign {asset.assetName} to a person or department.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="person" value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="person">Person</TabsTrigger>
                        <TabsTrigger value="department">Department</TabsTrigger>
                    </TabsList>

                    <div className="py-4 space-y-4">
                        <TabsContent value="person" className="mt-0 space-y-4">
                            <div className="space-y-2">
                                <Label>Select Instructor/User</Label>
                                <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={loading}>
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
                        </TabsContent>

                        <TabsContent value="department" className="mt-0 space-y-4">
                            <div className="space-y-2">
                                <Label>Select Department</Label>
                                <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId} disabled={loading}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map((dept) => (
                                            <SelectItem key={dept.id} value={dept.id}>
                                                {dept.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </TabsContent>

                        <div className="space-y-2">
                            <Label>Notes (Optional)</Label>
                            <Textarea
                                placeholder="Any comments about this assignment..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleAssign} disabled={submitting || loading}>
                        {submitting ? "Assigning..." : "Assign Asset"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
