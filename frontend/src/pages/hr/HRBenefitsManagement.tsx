import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { Shield, History, Edit, CheckCircle, XCircle, Clock } from "lucide-react";

interface Benefits {
    id: string;
    planType: string;
    coverageDetails: string;
    coverageDocumentUrl: string | null;
    validityStartDate: string;
    validityEndDate: string;
    dentalCoverage: boolean;
    visionCoverage: boolean;
    dependentsCovered: number;
    additionalBenefits: string;
    status: 'active' | 'expired' | 'pending';
}

interface Employee {
    id: string;
    fullName: string;
    email: string;
    isActive: boolean;
    roles: { name: string }[];
    instructorProfile?: {
        title: string;
        department: {
            name: string;
            code: string;
        };
    };
    benefits?: Benefits;
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

const PLAN_TYPES = ['Basic', 'Standard', 'Premium', 'Family', 'Executive'];

const HRBenefitsManagement = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [showBenefitsDialog, setShowBenefitsDialog] = useState(false);
    const [showAuditDialog, setShowAuditDialog] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Benefits form state
    const [planType, setPlanType] = useState("Basic");
    const [coverageDetails, setCoverageDetails] = useState("");
    const [coverageDocumentUrl, setCoverageDocumentUrl] = useState("");
    const [validityStartDate, setValidityStartDate] = useState("");
    const [validityEndDate, setValidityEndDate] = useState("");
    const [dentalCoverage, setDentalCoverage] = useState(false);
    const [visionCoverage, setVisionCoverage] = useState(false);
    const [dependentsCovered, setDependentsCovered] = useState("0");
    const [additionalBenefits, setAdditionalBenefits] = useState("");
    const [status, setStatus] = useState<'active' | 'expired' | 'pending'>('pending');
    const [changeReason, setChangeReason] = useState("");

    const { toast } = useToast();

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const response = await api.get('/hr/employees-benefits');
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

    const openBenefitsDialog = (employee: Employee) => {
        setSelectedEmployee(employee);
        if (employee.benefits) {
            setPlanType(employee.benefits.planType);
            setCoverageDetails(employee.benefits.coverageDetails || "");
            setCoverageDocumentUrl(employee.benefits.coverageDocumentUrl || "");
            setValidityStartDate(employee.benefits.validityStartDate);
            setValidityEndDate(employee.benefits.validityEndDate);
            setDentalCoverage(employee.benefits.dentalCoverage);
            setVisionCoverage(employee.benefits.visionCoverage);
            setDependentsCovered(employee.benefits.dependentsCovered.toString());
            setAdditionalBenefits(employee.benefits.additionalBenefits || "");
            setStatus(employee.benefits.status);
        } else {
            resetBenefitsForm();
        }
        setShowBenefitsDialog(true);
    };

    const resetBenefitsForm = () => {
        setPlanType("Basic");
        setCoverageDetails("");
        setCoverageDocumentUrl("");
        const today = new Date();
        const nextYear = new Date(today.setFullYear(today.getFullYear() + 1));
        setValidityStartDate(new Date().toISOString().split('T')[0]);
        setValidityEndDate(nextYear.toISOString().split('T')[0]);
        setDentalCoverage(false);
        setVisionCoverage(false);
        setDependentsCovered("0");
        setAdditionalBenefits("");
        setStatus('pending');
        setChangeReason("");
    };

    const handleUpdateBenefits = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployee) return;

        setSubmitting(true);
        try {
            await api.put(`/hr/employees/${selectedEmployee.id}/benefits`, {
                planType,
                coverageDetails,
                coverageDocumentUrl: coverageDocumentUrl || null,
                validityStartDate,
                validityEndDate,
                dentalCoverage,
                visionCoverage,
                dependentsCovered: parseInt(dependentsCovered),
                additionalBenefits,
                status,
                changeReason,
            });

            toast({
                title: "Success",
                description: "Benefits updated successfully",
            });

            setShowBenefitsDialog(false);
            fetchEmployees();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to update benefits",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const viewAuditLogs = async (employee: Employee) => {
        setSelectedEmployee(employee);
        try {
            const response = await api.get(`/hr/employees/${employee.id}/benefits/audit`);
            setAuditLogs(response.data.data);
            setShowAuditDialog(true);
        } catch (error: any) {
            toast({
                title: "Info",
                description: error.response?.data?.message || "No benefits audit logs found",
            });
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" /> Active</Badge>;
            case 'expired':
                return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Expired</Badge>;
            case 'pending':
                return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar links={HR_LINKS} />
            <main className="flex-grow bg-background p-8">
                <div className="container mx-auto max-w-7xl">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold">Benefits & Insurance Management</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage health insurance and benefits for Instructors and TAs
                        </p>
                    </div>

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
                                        <TableHead>Plan Type</TableHead>
                                        <TableHead>Coverage Status</TableHead>
                                        <TableHead>Validity</TableHead>
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
                                                    <Badge variant={employee.roles?.some(r => r.name === 'instructor') ? "default" : "secondary"}>
                                                        {employee.instructorProfile?.title || employee.roles?.map(r => r.name).join(', ')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {employee.instructorProfile?.department?.name || 'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    {employee.benefits ? (
                                                        <Badge variant="outline">
                                                            <Shield className="mr-1 h-3 w-3" />
                                                            {employee.benefits.planType}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground">Not Set</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {employee.benefits ? (
                                                        getStatusBadge(employee.benefits.status)
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {employee.benefits ? (
                                                        <span className="text-sm">
                                                            {formatDate(employee.benefits.validityStartDate)} - {formatDate(employee.benefits.validityEndDate)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openBenefitsDialog(employee)}
                                                        >
                                                            <Edit className="mr-1 h-3 w-3" />
                                                            Manage
                                                        </Button>
                                                        {employee.benefits && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => viewAuditLogs(employee)}
                                                            >
                                                                <History className="h-3 w-3" />
                                                            </Button>
                                                        )}
                                                    </div>
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

            {/* Benefits Management Dialog */}
            <Dialog open={showBenefitsDialog} onOpenChange={setShowBenefitsDialog}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleUpdateBenefits}>
                        <DialogHeader>
                            <DialogTitle>Manage Benefits & Insurance</DialogTitle>
                            <DialogDescription>
                                Update health insurance and benefits for {selectedEmployee?.fullName}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {/* Plan Type & Status */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="planType">Health Insurance Plan Type</Label>
                                    <Select value={planType} onValueChange={setPlanType}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select plan type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PLAN_TYPES.map((type) => (
                                                <SelectItem key={type} value={type}>{type}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">Coverage Status</Label>
                                    <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="expired">Expired</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Validity Period */}
                            <div className="space-y-2">
                                <Label>Validity Period</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="validityStartDate" className="text-xs text-muted-foreground">Start Date</Label>
                                        <Input
                                            id="validityStartDate"
                                            type="date"
                                            value={validityStartDate}
                                            onChange={(e) => setValidityStartDate(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="validityEndDate" className="text-xs text-muted-foreground">End Date</Label>
                                        <Input
                                            id="validityEndDate"
                                            type="date"
                                            value={validityEndDate}
                                            onChange={(e) => setValidityEndDate(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Coverage Details */}
                            <div className="space-y-2">
                                <Label htmlFor="coverageDetails">Coverage Details</Label>
                                <Textarea
                                    id="coverageDetails"
                                    value={coverageDetails}
                                    onChange={(e) => setCoverageDetails(e.target.value)}
                                    placeholder="Enter coverage details or summary..."
                                    rows={3}
                                />
                            </div>

                            {/* Coverage Document URL */}
                            <div className="space-y-2">
                                <Label htmlFor="coverageDocumentUrl">Coverage Document URL (optional)</Label>
                                <Input
                                    id="coverageDocumentUrl"
                                    type="url"
                                    value={coverageDocumentUrl}
                                    onChange={(e) => setCoverageDocumentUrl(e.target.value)}
                                    placeholder="https://..."
                                />
                            </div>

                            {/* Additional Coverage Options */}
                            <div className="space-y-3">
                                <Label>Additional Coverage</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="dentalCoverage"
                                            checked={dentalCoverage}
                                            onCheckedChange={(checked) => setDentalCoverage(checked as boolean)}
                                        />
                                        <label htmlFor="dentalCoverage" className="text-sm">Dental Coverage</label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="visionCoverage"
                                            checked={visionCoverage}
                                            onCheckedChange={(checked) => setVisionCoverage(checked as boolean)}
                                        />
                                        <label htmlFor="visionCoverage" className="text-sm">Vision Coverage</label>
                                    </div>
                                </div>
                            </div>

                            {/* Dependents Covered */}
                            <div className="space-y-2">
                                <Label htmlFor="dependentsCovered">Dependents Covered</Label>
                                <Input
                                    id="dependentsCovered"
                                    type="number"
                                    min="0"
                                    value={dependentsCovered}
                                    onChange={(e) => setDependentsCovered(e.target.value)}
                                />
                            </div>

                            {/* Additional Benefits */}
                            <div className="space-y-2">
                                <Label htmlFor="additionalBenefits">Other Staff Benefits</Label>
                                <Textarea
                                    id="additionalBenefits"
                                    value={additionalBenefits}
                                    onChange={(e) => setAdditionalBenefits(e.target.value)}
                                    placeholder="e.g., Gym membership, parking allowance, childcare support..."
                                    rows={2}
                                />
                            </div>

                            {/* Change Reason */}
                            <div className="space-y-2">
                                <Label htmlFor="changeReason">Reason for Change (for audit)</Label>
                                <Textarea
                                    id="changeReason"
                                    value={changeReason}
                                    onChange={(e) => setChangeReason(e.target.value)}
                                    placeholder="e.g., Annual enrollment, Plan upgrade, New hire setup..."
                                    rows={2}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowBenefitsDialog(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? "Saving..." : "Save Benefits"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Benefits Audit Logs Dialog */}
            <Dialog open={showAuditDialog} onOpenChange={setShowAuditDialog}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>Benefits Audit Logs</DialogTitle>
                        <DialogDescription>
                            History of benefits changes for {selectedEmployee?.fullName}
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
                                            <span className="text-red-600">{log.oldValue || 'null'}</span>
                                            {" → "}
                                            <span className="text-green-600">{log.newValue || 'null'}</span>
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
        </div>
    );
};

export default HRBenefitsManagement;
