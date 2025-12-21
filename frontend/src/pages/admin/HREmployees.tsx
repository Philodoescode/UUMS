import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { HR_LINKS } from "@/config/navLinks";
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
} from "@/components/ui/dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { DollarSign, Clock, CheckCircle, XCircle, Eye, History } from "lucide-react";

interface Employee {
    id: string;
    fullName: string;
    email: string;
    isActive: boolean;
    role: { name: string };
    instructorProfile?: {
        title: string;
        department: {
            name: string;
            code: string;
        };
    };
    compensation?: {
        baseSalary: number;
        housingAllowance: number;
        transportAllowance: number;
        bonuses: number;
        taxDeduction: number;
        insuranceDeduction: number;
        unpaidLeaveDeduction: number;
        otherDeductions: number;
    };
    netPay: number;
    pendingLeaveCount: number;
}

interface LeaveRequest {
    id: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: string;
    user: {
        fullName: string;
        email: string;
        role: { name: string };
    };
    reviewedBy?: {
        fullName: string;
    };
    reviewedAt?: string;
    reviewNotes?: string;
}

interface AuditLog {
    id: string;
    fieldChanged: string;
    oldValue: string;
    newValue: string;
    changeReason: string;
    createdAt: string;
    changedBy: {
        fullName: string;
        email: string;
    };
}

const HREmployees = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [selectedLeaveRequest, setSelectedLeaveRequest] = useState<LeaveRequest | null>(null);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [showCompensationDialog, setShowCompensationDialog] = useState(false);
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const [showAuditDialog, setShowAuditDialog] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState("employees");

    // Compensation form state
    const [baseSalary, setBaseSalary] = useState("");
    const [housingAllowance, setHousingAllowance] = useState("");
    const [transportAllowance, setTransportAllowance] = useState("");
    const [bonuses, setBonuses] = useState("");
    const [taxDeduction, setTaxDeduction] = useState("");
    const [insuranceDeduction, setInsuranceDeduction] = useState("");
    const [unpaidLeaveDeduction, setUnpaidLeaveDeduction] = useState("");
    const [otherDeductions, setOtherDeductions] = useState("");
    const [changeReason, setChangeReason] = useState("");

    // Leave review state
    const [reviewNotes, setReviewNotes] = useState("");

    const { toast } = useToast();
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get("tab");
        if (tab) {
            setActiveTab(tab);
        }
        fetchEmployees();
        fetchLeaveRequests();
    }, [location.search]);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const response = await api.get('/hr/employees');
            setEmployees(response.data.data);
        } catch (error: any) {
            console.error("Failed to fetch employees", error);
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to fetch employees",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchLeaveRequests = async () => {
        try {
            const response = await api.get('/hr/leave-requests?status=pending');
            setLeaveRequests(response.data.data);
        } catch (error: any) {
            console.error("Failed to fetch leave requests", error);
        }
    };

    const openCompensationDialog = (employee: Employee) => {
        setSelectedEmployee(employee);
        if (employee.compensation) {
            setBaseSalary(employee.compensation.baseSalary.toString());
            setHousingAllowance(employee.compensation.housingAllowance.toString());
            setTransportAllowance(employee.compensation.transportAllowance.toString());
            setBonuses(employee.compensation.bonuses.toString());
            setTaxDeduction(employee.compensation.taxDeduction.toString());
            setInsuranceDeduction(employee.compensation.insuranceDeduction.toString());
            setUnpaidLeaveDeduction(employee.compensation.unpaidLeaveDeduction.toString());
            setOtherDeductions(employee.compensation.otherDeductions.toString());
        } else {
            resetCompensationForm();
        }
        setShowCompensationDialog(true);
    };

    const resetCompensationForm = () => {
        setBaseSalary("0");
        setHousingAllowance("0");
        setTransportAllowance("0");
        setBonuses("0");
        setTaxDeduction("0");
        setInsuranceDeduction("0");
        setUnpaidLeaveDeduction("0");
        setOtherDeductions("0");
        setChangeReason("");
    };

    const handleUpdateCompensation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployee) return;

        setSubmitting(true);
        try {
            await api.put(`/hr/employees/${selectedEmployee.id}/compensation`, {
                baseSalary: parseFloat(baseSalary),
                housingAllowance: parseFloat(housingAllowance),
                transportAllowance: parseFloat(transportAllowance),
                bonuses: parseFloat(bonuses),
                taxDeduction: parseFloat(taxDeduction),
                insuranceDeduction: parseFloat(insuranceDeduction),
                unpaidLeaveDeduction: parseFloat(unpaidLeaveDeduction),
                otherDeductions: parseFloat(otherDeductions),
                changeReason,
            });

            toast({
                title: "Success",
                description: "Compensation updated successfully",
            });

            setShowCompensationDialog(false);
            fetchEmployees();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to update compensation",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const viewAuditLogs = async (employee: Employee) => {
        setSelectedEmployee(employee);
        try {
            const response = await api.get(`/hr/employees/${employee.id}/compensation/audit`);
            setAuditLogs(response.data.data);
            setShowAuditDialog(true);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to fetch audit logs",
                variant: "destructive",
            });
        }
    };

    const openLeaveDialog = (request: LeaveRequest) => {
        setSelectedLeaveRequest(request);
        setReviewNotes("");
        setShowLeaveDialog(true);
    };

    const handleReviewLeave = async (status: 'approved' | 'denied') => {
        if (!selectedLeaveRequest) return;

        setSubmitting(true);
        try {
            await api.put(`/hr/leave-requests/${selectedLeaveRequest.id}`, {
                status,
                reviewNotes,
            });

            toast({
                title: "Success",
                description: `Leave request ${status} successfully`,
            });

            setShowLeaveDialog(false);
            fetchLeaveRequests();
            fetchEmployees(); // Refresh to update pending count
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to review leave request",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar links={HR_LINKS} />
            <main className="flex-grow bg-background p-8">
                <div className="container mx-auto max-w-7xl">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold">HR - Employees</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage compensation and leave requests for Instructors and TAs
                        </p>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full max-w-md grid-cols-2">
                            <TabsTrigger value="employees">
                                <DollarSign className="mr-2 h-4 w-4" />
                                Employees ({employees.length})
                            </TabsTrigger>
                            <TabsTrigger value="leave-requests">
                                <Clock className="mr-2 h-4 w-4" />
                                Leave Requests ({leaveRequests.length})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="employees" className="mt-6">
                            {loading ? (
                                <div className="text-center py-8">Loading employees...</div>
                            ) : (
                                <div className="border rounded-lg overflow-hidden bg-card">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Role</TableHead>
                                                <TableHead>Department</TableHead>
                                                <TableHead>Net Pay</TableHead>
                                                <TableHead>Pending Leaves</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {employees.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                                                        No employees found.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                employees.map((employee) => (
                                                    <TableRow key={employee.id}>
                                                        <TableCell className="font-medium">
                                                            <div>
                                                                <div>{employee.fullName}</div>
                                                                <div className="text-xs text-muted-foreground">{employee.email}</div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={employee.role.name === 'instructor' ? "default" : "secondary"}>
                                                                {employee.instructorProfile?.title || employee.role.name}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {employee.instructorProfile?.department?.name || 'N/A'}
                                                        </TableCell>
                                                        <TableCell className="font-semibold">
                                                            {formatCurrency(employee.netPay)}
                                                        </TableCell>
                                                        <TableCell>
                                                            {employee.pendingLeaveCount > 0 ? (
                                                                <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                                                                    {employee.pendingLeaveCount} pending
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-muted-foreground">None</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={employee.isActive ? "outline" : "destructive"}
                                                                className={employee.isActive ? "text-green-600 border-green-200 bg-green-50" : ""}>
                                                                {employee.isActive ? "Active" : "Inactive"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => openCompensationDialog(employee)}
                                                                >
                                                                    <DollarSign className="mr-1 h-3 w-3" />
                                                                    Salary
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => viewAuditLogs(employee)}
                                                                >
                                                                    <History className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="leave-requests" className="mt-6">
                            <div className="border rounded-lg overflow-hidden bg-card">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Employee</TableHead>
                                            <TableHead>Leave Type</TableHead>
                                            <TableHead>Start Date</TableHead>
                                            <TableHead>End Date</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {leaveRequests.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                                                    No pending leave requests.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            leaveRequests.map((request) => (
                                                <TableRow key={request.id}>
                                                    <TableCell className="font-medium">
                                                        <div>
                                                            <div>{request.user.fullName}</div>
                                                            <div className="text-xs text-muted-foreground">{request.user.email}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">
                                                            {request.leaveType}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{formatDate(request.startDate)}</TableCell>
                                                    <TableCell>{formatDate(request.endDate)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">
                                                            {request.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openLeaveDialog(request)}
                                                        >
                                                            <Eye className="mr-1 h-3 w-3" />
                                                            Review
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </main>

            {/* Compensation Management Dialog */}
            <Dialog open={showCompensationDialog} onOpenChange={setShowCompensationDialog}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleUpdateCompensation}>
                        <DialogHeader>
                            <DialogTitle>Manage Compensation</DialogTitle>
                            <DialogDescription>
                                Update salary, allowances, and deductions for {selectedEmployee?.fullName}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-4">
                                <h3 className="font-semibold text-sm">Base Salary & Allowances</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="baseSalary">Base Salary</Label>
                                        <Input
                                            id="baseSalary"
                                            type="number"
                                            step="0.01"
                                            value={baseSalary}
                                            onChange={(e) => setBaseSalary(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="housingAllowance">Housing Allowance</Label>
                                        <Input
                                            id="housingAllowance"
                                            type="number"
                                            step="0.01"
                                            value={housingAllowance}
                                            onChange={(e) => setHousingAllowance(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="transportAllowance">Transport Allowance</Label>
                                        <Input
                                            id="transportAllowance"
                                            type="number"
                                            step="0.01"
                                            value={transportAllowance}
                                            onChange={(e) => setTransportAllowance(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="bonuses">Bonuses</Label>
                                        <Input
                                            id="bonuses"
                                            type="number"
                                            step="0.01"
                                            value={bonuses}
                                            onChange={(e) => setBonuses(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-sm">Deductions</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="taxDeduction">Tax Deduction</Label>
                                        <Input
                                            id="taxDeduction"
                                            type="number"
                                            step="0.01"
                                            value={taxDeduction}
                                            onChange={(e) => setTaxDeduction(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="insuranceDeduction">Insurance Deduction</Label>
                                        <Input
                                            id="insuranceDeduction"
                                            type="number"
                                            step="0.01"
                                            value={insuranceDeduction}
                                            onChange={(e) => setInsuranceDeduction(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="unpaidLeaveDeduction">Unpaid Leave Deduction</Label>
                                        <Input
                                            id="unpaidLeaveDeduction"
                                            type="number"
                                            step="0.01"
                                            value={unpaidLeaveDeduction}
                                            onChange={(e) => setUnpaidLeaveDeduction(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="otherDeductions">Other Deductions</Label>
                                        <Input
                                            id="otherDeductions"
                                            type="number"
                                            step="0.01"
                                            value={otherDeductions}
                                            onChange={(e) => setOtherDeductions(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="changeReason">Reason for Change (for audit)</Label>
                                <Textarea
                                    id="changeReason"
                                    value={changeReason}
                                    onChange={(e) => setChangeReason(e.target.value)}
                                    placeholder="e.g., Annual salary increase, Promotion, etc."
                                    rows={2}
                                />
                            </div>

                            {selectedEmployee?.compensation && (
                                <div className="bg-muted p-4 rounded-md">
                                    <div className="text-sm font-semibold mb-2">Calculated Net Pay:</div>
                                    <div className="text-2xl font-bold">
                                        {formatCurrency(
                                            parseFloat(baseSalary || "0") +
                                            parseFloat(housingAllowance || "0") +
                                            parseFloat(transportAllowance || "0") +
                                            parseFloat(bonuses || "0") -
                                            parseFloat(taxDeduction || "0") -
                                            parseFloat(insuranceDeduction || "0") -
                                            parseFloat(unpaidLeaveDeduction || "0") -
                                            parseFloat(otherDeductions || "0")
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowCompensationDialog(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? "Saving..." : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Audit Logs Dialog */}
            <Dialog open={showAuditDialog} onOpenChange={setShowAuditDialog}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>Compensation Audit Logs</DialogTitle>
                        <DialogDescription>
                            History of compensation changes for {selectedEmployee?.fullName}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto">
                        {auditLogs.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No audit logs found.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {auditLogs.map((log) => (
                                    <div key={log.id} className="border rounded-lg p-4 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-semibold">{log.fieldChanged}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {formatDate(log.createdAt)}
                                                </div>
                                            </div>
                                            <Badge variant="outline">{log.changedBy.fullName}</Badge>
                                        </div>
                                        <div className="text-sm">
                                            <span className="text-red-600">{log.oldValue}</span>
                                            {" → "}
                                            <span className="text-green-600">{log.newValue}</span>
                                        </div>
                                        {log.changeReason && (
                                            <div className="text-sm text-muted-foreground italic">
                                                Reason: {log.changeReason}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Leave Request Review Dialog */}
            <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Review Leave Request</DialogTitle>
                        <DialogDescription>
                            Review and respond to leave request from {selectedLeaveRequest?.user.fullName}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedLeaveRequest && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <div className="font-semibold">Leave Type:</div>
                                    <div className="text-muted-foreground">{selectedLeaveRequest.leaveType}</div>
                                </div>
                                <div>
                                    <div className="font-semibold">Duration:</div>
                                    <div className="text-muted-foreground">
                                        {formatDate(selectedLeaveRequest.startDate)} - {formatDate(selectedLeaveRequest.endDate)}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div className="font-semibold text-sm mb-1">Reason:</div>
                                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                                    {selectedLeaveRequest.reason}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reviewNotes">Review Notes (optional)</Label>
                                <Textarea
                                    id="reviewNotes"
                                    value={reviewNotes}
                                    onChange={(e) => setReviewNotes(e.target.value)}
                                    placeholder="Add any notes about your decision..."
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowLeaveDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => handleReviewLeave('denied')}
                            disabled={submitting}
                        >
                            <XCircle className="mr-2 h-4 w-4" />
                            Deny
                        </Button>
                        <Button
                            type="button"
                            onClick={() => handleReviewLeave('approved')}
                            disabled={submitting}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default HREmployees;
