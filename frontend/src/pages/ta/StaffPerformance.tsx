import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { TA_LINKS } from "@/config/navLinks";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfessionalDevelopmentManager } from "@/components/ProfessionalDevelopmentManager";
import { TeachingEvaluationSummary } from "@/components/TeachingEvaluationSummary";
import api from "@/lib/api";
import { Loader2Icon } from "lucide-react";

const StaffPerformance = () => {
    const { user } = useAuth();
    const [feedback, setFeedback] = useState([]);
    const [loadingFeedback, setLoadingFeedback] = useState(true);

    useEffect(() => {
        const fetchFeedback = async () => {
            try {
                const res = await api.get('/student-feedback/my-feedback');
                setFeedback(res.data);
            } catch (error) {
                console.error("Failed to fetch feedback", error);
            } finally {
                setLoadingFeedback(false);
            }
        };

        if (user) {
            fetchFeedback();
        }
    }, [user]);

    if (!user) return null;

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar links={TA_LINKS} />
            <main className="flex-grow bg-background p-8">
                <div className="container mx-auto max-w-5xl">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold">Staff Performance</h1>
                        <p className="text-muted-foreground mt-2">
                            Review your teaching evaluations and verified professional development records.
                        </p>
                    </div>

                    <Tabs defaultValue="evaluations" className="space-y-6">
                        <TabsList>
                            <TabsTrigger value="evaluations">Teaching Evaluations</TabsTrigger>
                            <TabsTrigger value="training">Professional Development</TabsTrigger>
                        </TabsList>

                        <TabsContent value="evaluations" className="space-y-4">
                            <div className="bg-card rounded-lg border shadow-sm p-6">
                                {loadingFeedback ? (
                                    <div className="flex justify-center p-8">
                                        <Loader2Icon className="size-6 animate-spin" />
                                    </div>
                                ) : (
                                    <TeachingEvaluationSummary feedbackList={feedback} />
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="training" className="space-y-4">
                            {/* Reusing the HR manager component in read-only mode */}
                            <ProfessionalDevelopmentManager
                                userId={user.id}
                                readOnly={true}
                            />
                        </TabsContent>
                    </Tabs>
                </div>
            </main>
        </div>
    );
};

export default StaffPerformance;
