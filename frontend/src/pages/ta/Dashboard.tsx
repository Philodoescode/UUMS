import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { INSTRUCTOR_LINKS } from "@/config/navLinks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

const TADashboard = () => {
    const { user } = useAuth();

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar links={INSTRUCTOR_LINKS} />
            <main className="flex-grow bg-background p-8">
                <div className="container mx-auto max-w-6xl">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-3xl font-bold">Welcome, {user?.fullName}</h1>
                            <p className="text-muted-foreground mt-1">Teaching Assistant Dashboard</p>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardHeader>
                                <CardTitle>My Courses</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">You are assigned to assist in these courses.</p>
                                {/* Future: List courses here */}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Grading Tasks</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">Pending assignments to grade.</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TADashboard;
