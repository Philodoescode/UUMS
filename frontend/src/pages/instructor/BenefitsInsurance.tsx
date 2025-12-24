import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { INSTRUCTOR_LINKS } from "@/config/navLinks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
    Shield,
    Calendar,
    CheckCircle,
    XCircle,
    Clock,
    Eye,
    Users,
    FileText,
    ExternalLink
} from "lucide-react";

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
    isCoverageActive: boolean;
    lastUpdatedAt?: string;
    lastUpdatedBy?: {
        fullName: string;
        email: string;
    };
}

const BenefitsInsurance = () => {
    const { user } = useAuth();
    const [benefits, setBenefits] = useState<Benefits | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchBenefits();
    }, []);

    const fetchBenefits = async () => {
        setLoading(true);
        try {
            const response = await api.get('/staff/my-benefits');
            setBenefits(response.data.data);
            setError(null);
        } catch (err: any) {
            console.error("Failed to fetch benefits", err);
            setError(err.response?.data?.message || "Failed to fetch benefits");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getStatusBadge = (status: string, isActive: boolean) => {
        if (status === 'active' && isActive) {
            return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" /> Active</Badge>;
        } else if (status === 'expired' || !isActive) {
            return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Expired</Badge>;
        } else {
            return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
        }
    };

    const getDaysRemaining = () => {
        if (!benefits) return null;
        const endDate = new Date(benefits.validityEndDate);
        const today = new Date();
        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar links={INSTRUCTOR_LINKS} />
            <main className="flex-grow bg-background p-8">
                <div className="container mx-auto max-w-4xl">
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold">Benefits & Insurance</h1>
                        <p className="text-xl mt-2">
                            Welcome, <span className="font-semibold">{user?.fullName}</span>
                        </p>
                        <p className="text-muted-foreground mt-1">
                            View your health insurance and benefits information
                        </p>
                    </div>

                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p>Loading your benefits information...</p>
                        </div>
                    ) : error ? (
                        <Card className="border-destructive">
                            <CardContent className="pt-6">
                                <div className="text-center text-destructive">
                                    <XCircle className="h-12 w-12 mx-auto mb-4" />
                                    <p>{error}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : !benefits ? (
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center py-8">
                                    <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                                    <h3 className="text-xl font-semibold mb-2">No Benefits Information Available</h3>
                                    <p className="text-muted-foreground">
                                        Your benefits information has not been set up yet. Please contact the HR department for assistance.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-6">
                            {/* Main Coverage Card */}
                            <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <Shield className="h-5 w-5" />
                                                Health Insurance Coverage
                                            </CardTitle>
                                            <CardDescription>Your current health insurance plan details</CardDescription>
                                        </div>
                                        {getStatusBadge(benefits.status, benefits.isCoverageActive)}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Plan Type */}
                                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                                        <div>
                                            <div className="text-sm text-muted-foreground">Plan Type</div>
                                            <div className="text-2xl font-bold">{benefits.planType}</div>
                                        </div>
                                        <Shield className="h-10 w-10 text-primary" />
                                    </div>

                                    {/* Validity Period */}
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="p-4 border rounded-lg">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                                <Calendar className="h-4 w-4" />
                                                Coverage Start Date
                                            </div>
                                            <div className="font-semibold">{formatDate(benefits.validityStartDate)}</div>
                                        </div>
                                        <div className="p-4 border rounded-lg">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                                <Calendar className="h-4 w-4" />
                                                Coverage End Date
                                            </div>
                                            <div className="font-semibold">{formatDate(benefits.validityEndDate)}</div>
                                            {getDaysRemaining() !== null && getDaysRemaining()! > 0 && (
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {getDaysRemaining()} days remaining
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Coverage Details */}
                                    {benefits.coverageDetails && (
                                        <div>
                                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                                                <FileText className="h-4 w-4" />
                                                Coverage Details
                                            </h4>
                                            <div className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                                                {benefits.coverageDetails}
                                            </div>
                                        </div>
                                    )}

                                    {/* Coverage Document */}
                                    {benefits.coverageDocumentUrl && (
                                        <div>
                                            <Button variant="outline" asChild>
                                                <a href={benefits.coverageDocumentUrl} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="mr-2 h-4 w-4" />
                                                    View Coverage Document
                                                </a>
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Additional Coverage */}
                            <div className="grid md:grid-cols-3 gap-4">
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${benefits.dentalCoverage ? 'bg-green-100' : 'bg-gray-100'}`}>
                                                {benefits.dentalCoverage ? (
                                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                                ) : (
                                                    <XCircle className="h-5 w-5 text-gray-400" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-semibold">Dental Coverage</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {benefits.dentalCoverage ? 'Included' : 'Not Included'}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${benefits.visionCoverage ? 'bg-green-100' : 'bg-gray-100'}`}>
                                                {benefits.visionCoverage ? (
                                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                                ) : (
                                                    <Eye className="h-5 w-5 text-gray-400" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-semibold">Vision Coverage</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {benefits.visionCoverage ? 'Included' : 'Not Included'}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-full bg-blue-100">
                                                <Users className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <div className="font-semibold">Dependents Covered</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {benefits.dependentsCovered} {benefits.dependentsCovered === 1 ? 'dependent' : 'dependents'}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Additional Benefits */}
                            {benefits.additionalBenefits && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Other Staff Benefits</CardTitle>
                                        <CardDescription>Additional benefits provided by the university</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                                            {benefits.additionalBenefits}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Last Updated Info */}
                            {benefits.lastUpdatedAt && (
                                <div className="text-sm text-muted-foreground text-center">
                                    Last updated on {formatDate(benefits.lastUpdatedAt)}
                                    {benefits.lastUpdatedBy && ` by ${benefits.lastUpdatedBy.fullName}`}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default BenefitsInsurance;
