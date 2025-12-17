import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { ADMIN_LINKS } from "@/config/navLinks";
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
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { Plus } from "lucide-react";

interface User {
    id: string;
    fullName: string;
    email: string;
    role: { name: string };
    roleName?: string; // Sometimes flattened in response
}

const StaffManagement = () => {
    const [staff, setStaff] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("TA");

    const { toast } = useToast();

    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        setLoading(true);
        try {
            // Fetch all users and filter for staff. 
            // Optimally backend should filter, but for now we filter client side as per established pattern.
            const response = await api.get('/users');
            const data = response.data;
            const staffMembers = data.filter((u: any) =>
                u.role?.name === 'TA' || u.role?.name === 'Instructor' || u.role === 'TA' || u.role === 'Instructor'
            );
            setStaff(staffMembers);
        } catch (error) {
            console.error("Failed to fetch staff", error);
            toast({
                title: "Error",
                description: "Failed to fetch staff members",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            await api.post('/users', {
                fullName,
                email,
                role
            });

            toast({
                title: "Success",
                description: "Staff account created successfully",
            });

            setOpen(false);
            resetForm();
            fetchStaff();

        } catch (error: any) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to create account",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setFullName("");
        setEmail("");
        setRole("TA");
    };

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar links={ADMIN_LINKS} />
            <main className="flex-grow bg-background p-8">
                <div className="container mx-auto max-w-6xl">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-3xl font-bold">Staff Management</h1>
                            <p className="text-muted-foreground mt-1">Manage teaching assistants and instructors</p>
                        </div>
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Staff
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <form onSubmit={handleCreateUser}>
                                    <DialogHeader>
                                        <DialogTitle>Create Staff Account</DialogTitle>
                                        <DialogDescription>
                                            Add a new TA or Instructor. They will be able to log in with their email and default password.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="name" className="text-right">
                                                Name
                                            </Label>
                                            <Input
                                                id="name"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                className="col-span-3"
                                                required
                                            />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="email" className="text-right">
                                                Email
                                            </Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="col-span-3"
                                                required
                                            />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="role" className="text-right">
                                                Role
                                            </Label>
                                            <div className="col-span-3">
                                                <Select value={role} onValueChange={setRole}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select role" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="TA">Teaching Assistant (TA)</SelectItem>
                                                        <SelectItem value="Instructor">Instructor</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" disabled={submitting}>
                                            {submitting ? "Creating..." : "Create Account"}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {loading ? (
                        <div>Loading...</div>
                    ) : (
                        <div className="border rounded-lg overflow-hidden bg-card">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {staff.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                                                No staff members found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        staff.map((user) => (
                                            <TableRow key={user.id}>
                                                <TableCell className="font-medium">{user.fullName}</TableCell>
                                                <TableCell>{user.email}</TableCell>
                                                <TableCell>
                                                    <Badge variant={
                                                        (user.role?.name || user.roleName) === 'Instructor' ? "default" : "secondary"
                                                    }>
                                                        {user.role?.name || user.roleName || user.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Active</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default StaffManagement;
