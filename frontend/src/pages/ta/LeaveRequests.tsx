import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { TA_LINKS } from "@/config/navLinks";
import { LeaveRequestForm } from "@/components/LeaveRequestForm";
import { LeaveRequestHistory } from "@/components/LeaveRequestHistory";

const TALeaveRequests = () => {
    const { user } = useAuth();
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleSubmitSuccess = () => {
        setRefreshTrigger((prev) => prev + 1);
    };

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar links={TA_LINKS} />
            <main className="flex-grow bg-background p-8">
                <div className="container mx-auto max-w-4xl space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold">Leave Requests</h1>
                            <p className="text-muted-foreground">
                                Submit and track your leave requests
                            </p>
                        </div>
                        <div className="text-right text-sm">
                            <p className="font-medium">{user?.fullName}</p>
                            <p className="text-muted-foreground">{user?.email}</p>
                        </div>
                    </div>

                    {/* Submit Form */}
                    <LeaveRequestForm onSuccess={handleSubmitSuccess} />

                    {/* History */}
                    <LeaveRequestHistory refreshTrigger={refreshTrigger} />
                </div>
            </main>
        </div>
    );
};

export default TALeaveRequests;
