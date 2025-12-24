// import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { INSTRUCTOR_LINKS, TA_LINKS } from "@/config/navLinks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
    DollarSign,
    Download,
    History,
    Wallet,
    TrendingUp,
    TrendingDown,
    Printer,
    FileText
} from "lucide-react";
import { useLocation } from "react-router-dom";

interface Compensation {
    baseSalary: string;
    housingAllowance: string;
    transportAllowance: string;
    bonuses: string;
    taxDeduction: string;
    insuranceDeduction: string;
    unpaidLeaveDeduction: string;
    otherDeductions: string;
    totalEarnings: number;
    totalDeductions: number;
    netSalary: number;
    ytdEarnings?: number;
    user?: {
        fullName: string;
        email: string;
        id: string;
    };
}

interface Payslip {
    id: string;
    month: number;
    year: number;
    baseSalary: string;
    netSalary: string;
    paymentDate: string;
    status: string;
}

const PayrollPage = () => {
    const location = useLocation();
    const [currentComp, setCurrentComp] = useState<Compensation | null>(null);
    const [history, setHistory] = useState<Payslip[]>([]);
    const [loading, setLoading] = useState(true);

    const isTA = location.pathname.startsWith('/ta');
    const links = isTA ? TA_LINKS : INSTRUCTOR_LINKS;

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [compRes, historyRes] = await Promise.all([
                api.get('/payroll/current').catch(() => null), // Handle 404 gracefully
                api.get('/payroll/history').catch(() => ({ data: { data: [] } }))
            ]);

            if (compRes?.data?.data) {
                setCurrentComp(compRes.data.data);
            }
            if (historyRes?.data?.data) {
                setHistory(historyRes.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch payroll data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (id: string) => {
        try {
            const response = await api.get(`/payroll/download/${id}`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const filename = id === 'current'
                ? `Payslip_Current.pdf`
                : `Payslip_${history.find(h => h.id === id)?.year}_${history.find(h => h.id === id)?.month}.pdf`;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Download failed", error);
        }
    };

    const formatCurrency = (val: string | number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(Number(val));
    };

    const getMonthName = (month: number) => {
        return new Date(2000, month - 1).toLocaleString('default', { month: 'long' });
    };

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen">
                <Navbar links={links} />
                <div className="flex-grow flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-muted/10">
            <Navbar links={links} />
            <main className="flex-grow p-8">
                <div className="container mx-auto max-w-6xl space-y-8">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Payroll & Compensation</h1>
                            <p className="text-muted-foreground mt-1">
                                Manage your salary information, view payslips, and track history.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => window.print()}>
                                <Printer className="mr-2 h-4 w-4" />
                                Print Page
                            </Button>
                        </div>
                    </div>

                    {!currentComp ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Wallet className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                                <h3 className="text-lg font-semibold">No Salary Information Available</h3>
                                <p className="text-muted-foreground">
                                    Your compensation details have not been set up by HR yet.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* Detailed Current Salary Slip */}
                            <Card className="lg:col-span-2 border-primary/20 shadow-lg">
                                <CardHeader className="bg-primary/5 border-b pb-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <CardTitle className="text-xl flex items-center gap-2">
                                                <FileText className="h-5 w-5 text-primary" />
                                                Current Salary Slip
                                            </CardTitle>
                                            <CardDescription>
                                                Breakdown for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                                            </CardDescription>
                                        </div>
                                        <Badge variant="outline" className="bg-background text-primary border-primary">
                                            Active
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-6">

                                    {/* Earnings Section */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-green-500" /> Earnings
                                        </h4>
                                        <div className="grid gap-3 pl-4 border-l-2 border-green-500/20">
                                            <div className="flex justify-between items-center">
                                                <span>Basic Salary</span>
                                                <span className="font-medium">{formatCurrency(currentComp.baseSalary)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span>Housing Allowance</span>
                                                <span className="font-medium">{formatCurrency(currentComp.housingAllowance)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span>Transport Allowance</span>
                                                <span className="font-medium">{formatCurrency(currentComp.transportAllowance)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span>Bonuses</span>
                                                <span className="font-medium">{formatCurrency(currentComp.bonuses)}</span>
                                            </div>
                                            <div className="pt-2 mt-2 border-t flex justify-between items-center font-semibold text-green-700">
                                                <span>Total Earnings</span>
                                                <span>{formatCurrency(currentComp.totalEarnings)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Deductions Section */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                            <TrendingDown className="h-4 w-4 text-red-500" /> Deductions
                                        </h4>
                                        <div className="grid gap-3 pl-4 border-l-2 border-red-500/20">
                                            <div className="flex justify-between items-center">
                                                <span>Tax</span>
                                                <span className="font-medium text-red-600">-{formatCurrency(currentComp.taxDeduction)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span>Insurance</span>
                                                <span className="font-medium text-red-600">-{formatCurrency(currentComp.insuranceDeduction)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span>Unpaid Leave</span>
                                                <span className="font-medium text-red-600">-{formatCurrency(currentComp.unpaidLeaveDeduction)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span>Other Deductions</span>
                                                <span className="font-medium text-red-600">-{formatCurrency(currentComp.otherDeductions)}</span>
                                            </div>
                                            <div className="pt-2 mt-2 border-t flex justify-between items-center font-semibold text-red-700">
                                                <span>Total Deductions</span>
                                                <span>-{formatCurrency(currentComp.totalDeductions)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Net Pay Highlight */}
                                    <div className="bg-primary/10 p-6 rounded-xl flex justify-between items-center border border-primary/20 mt-6">
                                        <div>
                                            <div className="text-sm text-primary font-medium mb-1">Net Salary Pay</div>
                                            <div className="text-3xl font-bold text-primary">
                                                {formatCurrency(currentComp.netSalary)}
                                            </div>
                                        </div>
                                        <Button onClick={() => handleDownload('current')}>
                                            <Download className="mr-2 h-4 w-4" />
                                            Download Slip
                                        </Button>
                                    </div>

                                </CardContent>
                            </Card>

                            {/* Info / Stats Sidebar or Small Cards */}
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Stats Overview</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                                                <Wallet className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Annual Base</p>
                                                <p className="font-bold text-lg">{formatCurrency(Number(currentComp.baseSalary) * 12)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-green-100 rounded-full text-green-600">
                                                <DollarSign className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">YTD Earnings</p>
                                                <p className="font-bold text-lg">
                                                    {currentComp.ytdEarnings
                                                        ? formatCurrency(currentComp.ytdEarnings)
                                                        : formatCurrency(currentComp.totalEarnings * (new Date().getMonth() + 1))
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="bg-muted/50 p-4 text-xs text-muted-foreground">
                                        Estimate based on current salary
                                    </CardFooter>
                                </Card>
                            </div>

                        </div>
                    )}

                    {/* Salary History */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <History className="h-5 w-5" />
                                Salary History
                            </CardTitle>
                            <CardDescription>Archives of past salary slips</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {history.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No history available.
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Period</TableHead>
                                            <TableHead>Payment Date</TableHead>
                                            <TableHead>Base Salary</TableHead>
                                            <TableHead>Net Salary</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {history.map((slip) => (
                                            <TableRow key={slip.id}>
                                                <TableCell className="font-medium">
                                                    {getMonthName(slip.month)} {slip.year}
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(slip.paymentDate).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>{formatCurrency(slip.baseSalary)}</TableCell>
                                                <TableCell className="font-bold text-green-600">
                                                    {formatCurrency(slip.netSalary)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                                                        {slip.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => handleDownload(slip.id)}>
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </main>
        </div>
    );
};

export default PayrollPage;
