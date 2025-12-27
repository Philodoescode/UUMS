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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { StudentDocumentsDialog } from "@/components/admin/StudentDocumentsDialog";

interface User {
    id: string;
    fullName: string;
    email: string;
    roles: { name: string }[];
    advisor?: { id: string; fullName: string };
}

const StudentManagement = () => {
    const [students, setStudents] = useState<User[]>([]);
    const [advisors, setAdvisors] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersRes, advisorsRes] = await Promise.all([
                api.get('/users?role=student'), // Assuming endpoint supports filtering
                api.get('/users?role=advisor')
            ]);
            // Filter manually if API doesn't support query params yet
            // Assuming simplified for now, or we'll add filtering to backend users endpoint shortly if needed
            // For MVP, enable fetching all users and filtering client side if needed

            // Let's assume we need to update/verify the backend endpoint for /users first. 
            // Attempting to filter client-side for safety if backend dumps all.
            const allUsers = (await api.get('/users')).data;
            setStudents(allUsers.filter((u: User) => u.roles?.some(r => r.name === 'student')));
            setAdvisors(allUsers.filter((u: User) => u.roles?.some(r => r.name === 'advisor')));
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignAdvisor = async (studentId: string, advisorId: string) => {
        try {
            await api.put(`/users/${studentId}/advisor`, { advisorId });
            toast({ title: "Success", description: "Advisor assigned successfully" });
            fetchData(); // Refresh list
        } catch (error) {
            toast({ title: "Error", description: "Failed to assign advisor", variant: "destructive" });
        }
    };

    const handleDownloadTranscript = async (studentId: string, studentName: string) => {
        try {
            const response = await api.get(`/student-documents/${studentId}/transcript`, {
                responseType: 'blob', // Important for handling binary data (PDF)
            });

            // Create a blob URL and invoke download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `transcript_${studentName.replace(/\s+/g, '_')}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error) {
            console.error("Download error:", error);
            toast({ title: "Error", description: "Failed to download transcript", variant: "destructive" });
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar links={ADMIN_LINKS} />
            <main className="flex-grow bg-background p-8">
                <div className="container mx-auto max-w-6xl">
                    <h1 className="text-3xl font-bold mb-6">Student Management</h1>

                    {loading ? (
                        <div>Loading...</div>
                    ) : (
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Current Advisor</TableHead>
                                        <TableHead>Assign Advisor</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {students.map(student => (
                                        <TableRow key={student.id}>
                                            <TableCell className="font-medium">{student.fullName}</TableCell>
                                            <TableCell>{student.email}</TableCell>
                                            <TableCell>
                                                {student.advisor ? student.advisor.fullName : <span className="text-muted-foreground italic">None</span>}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Select
                                                        onValueChange={(val) => handleAssignAdvisor(student.id, val)}
                                                        defaultValue={student.advisor?.id}
                                                    >
                                                        <SelectTrigger className="w-[200px]">
                                                            <SelectValue placeholder="Select Advisor" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {advisors.map(adv => (
                                                                <SelectItem key={adv.id} value={adv.id}>
                                                                    {adv.fullName}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDownloadTranscript(student.id, student.fullName)}
                                                    >
                                                        transcript
                                                    </Button>
                                                    <StudentDocumentsDialog student={student} />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default StudentManagement;
