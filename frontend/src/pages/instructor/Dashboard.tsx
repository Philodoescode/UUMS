import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { INSTRUCTOR_LINKS } from "@/config/navLinks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InstructorAssessmentList } from "@/components/InstructorAssessmentList";
import { InstructorAnnouncements } from "@/components/InstructorAnnouncements";
import { InstructorGradeAppeals } from "@/components/InstructorGradeAppeals";
import InstructorMaterialManagement from "@/components/InstructorMaterialManagement";
import api from "@/lib/api";
import { BookOpenIcon, RefreshCwIcon } from "lucide-react";

interface Course {
  id: string;
  courseCode: string;
  name: string;
  semester: string;
  year: number;
}

const InstructorDashboard = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await api.get("/instructor-portal/my-courses");
        setCourses(response.data);
      } catch (error) {
        console.error("Failed to fetch courses", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar links={INSTRUCTOR_LINKS} />
      <main className="flex-grow bg-background p-8">
        <div className="container mx-auto max-w-6xl space-y-8">
          {/* Welcome Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Instructor Dashboard</h1>
              <p className="text-muted-foreground">Manage your courses and assessments</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium">{user?.fullName}</p>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          {/* Courses & Assessments Grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCwIcon className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpenIcon className="size-12 mx-auto mb-4 opacity-50" />
              <p>You are not assigned to any courses yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courses.map(course => (
                <Card key={course.id} className="flex flex-col h-full">
                  <CardHeader className="bg-muted/30 pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{course.courseCode}</CardTitle>
                        <CardDescription>{course.name}</CardDescription>
                      </div>
                      <span className="text-xs font-medium bg-background px-2 py-1 rounded border">
                        {course.semester} {course.year}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow pt-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      Assessments
                    </h3>
                    <InstructorAssessmentList courseId={course.id} />

                    <div className="my-6 border-t pt-6"></div>
                    <InstructorMaterialManagement courseId={course.id} />

                    <div className="my-6 border-t pt-6"></div>

                    <InstructorAnnouncements courseId={course.id} />

                    <div className="my-6 border-t pt-6"></div>

                    <InstructorGradeAppeals courseId={course.id} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default InstructorDashboard;