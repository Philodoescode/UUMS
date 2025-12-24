import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // Ensure Badge is imported if used
import { SearchIcon, UserIcon, ArrowLeftIcon } from "lucide-react";
import api from "@/lib/api";
import { ProfessionalDevelopmentManager } from "@/components/ProfessionalDevelopmentManager";
import { useNavigate } from "react-router-dom";

// Standard HR Links (Should be consistent)
const HR_LINKS = [
    { label: "Dashboard", href: "/hr/dashboard" },
    { label: "Staff", href: "/hr/staff" },
    { label: "Professional Development", href: "/hr/professional-development" },
];

interface Employee {
    id: string;
    fullName: string;
    email: string;
    role: {
        name: string;
    };
    department?: {
        name: string;
    };
}

const ProfessionalDevelopmentPage = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const response = await api.get("/hr/employees"); // Reusing existing endpoint
            if (response.data.success) {
                setEmployees(response.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch employees", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar links={HR_LINKS} />
            <main className="flex-grow bg-background p-8">
                <div className="container mx-auto max-w-7xl h-[calc(100vh-8rem)] flex flex-col">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold">Professional Development Management</h1>
                            <p className="text-muted-foreground">Assign and verify training records for TAs and Instructors</p>
                        </div>
                        <Button variant="outline" onClick={() => navigate("/hr/dashboard")}>
                            <ArrowLeftIcon className="mr-2 size-4" /> Back to Dashboard
                        </Button>
                    </div>

                    <div className="flex gap-6 h-full overflow-hidden">
                        {/* Sidebar: Employee List */}
                        <Card className="w-1/3 flex flex-col overflow-hidden">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">Staff List</CardTitle>
                                <div className="relative mt-2">
                                    <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search staff..."
                                        className="pl-8"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow overflow-y-auto p-0">
                                {loading ? (
                                    <div className="p-4 text-center text-muted-foreground">Loading...</div>
                                ) : (
                                    <div className="flex flex-col">
                                        {filteredEmployees.map((emp) => (
                                            <button
                                                key={emp.id}
                                                className={`flex items-start gap-3 p-4 text-left border-b transition-colors hover:bg-muted/50 ${selectedEmployee?.id === emp.id ? "bg-muted border-l-4 border-l-primary" : ""
                                                    }`}
                                                onClick={() => setSelectedEmployee(emp)}
                                            >
                                                <div className="bg-muted p-2 rounded-full">
                                                    <UserIcon className="size-5 text-muted-foreground" />
                                                </div>
                                                <div className="flex-grow overflow-hidden">
                                                    <div className="font-medium truncate">{emp.fullName}</div>
                                                    <div className="text-xs text-muted-foreground truncate">{emp.email}</div>
                                                    <div className="mt-1 flex items-center gap-2">
                                                        <Badge variant="secondary" className="text-[10px] px-1 py-0 h-5">
                                                            {emp.role.name.toUpperCase()}
                                                        </Badge>
                                                        {emp.department && (
                                                            <span className="text-xs text-muted-foreground truncate">
                                                                {emp.department.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Main Content: Selected Employee PD Manager */}
                        <div className="flex-grow flex flex-col h-full overflow-hidden">
                            {selectedEmployee ? (
                                <div className="h-full overflow-y-auto pr-2">
                                    <ProfessionalDevelopmentManager
                                        userId={selectedEmployee.id}
                                        userName={selectedEmployee.fullName}
                                    />
                                </div>
                            ) : (
                                <Card className="h-full flex items-center justify-center bg-muted/10 border-dashed">
                                    <div className="text-center text-muted-foreground">
                                        <UserIcon className="size-16 mx-auto mb-4 opacity-20" />
                                        <h3 className="text-lg font-medium">No Staff Selected</h3>
                                        <p>Select a staff member from the list to view and manage their training records.</p>
                                    </div>
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ProfessionalDevelopmentPage;
