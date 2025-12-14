import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { STUDENT_LINKS } from "@/config/navLinks";
import { StudentCourseCard } from "@/components/StudentCourseCard";
import { CourseDetailModal } from "@/components/CourseDetailModal";
import type { Course } from "@/components/CourseCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon, AlertTriangleIcon } from "lucide-react";
import { IconListSearch } from '@tabler/icons-react';
import api from "@/lib/api";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

interface Department {
  id: string;
  code: string;
  name: string;
}

const CourseCatalog = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedCourseType, setSelectedCourseType] = useState<string>("all");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [requestLoading, setRequestLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [coursesRes, departmentsRes] = await Promise.all([
        api.get("/courses", { params: { isActive: "true" } }),
        api.get("/departments"),
      ]);
      setCourses(coursesRes.data);
      setDepartments(departmentsRes.data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load data";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredCourses = courses.filter((course) => {
    const matchesDepartment = selectedDepartment === "all" || course.department?.id === selectedDepartment;
    const matchesCourseType = selectedCourseType === "all" || course.courseType === selectedCourseType;
    return matchesDepartment && matchesCourseType;
  });

  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course);
    setIsDetailOpen(true);
  };

  const handleRequestElective = async (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation(); // Prevent opening detail modal
    if (!confirm("Are you sure you want to request this elective course?")) return;

    setRequestLoading(courseId);
    try {
      await api.post('/elective-requests', { courseId });
      alert("Request submitted successfully!");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to submit request.");
    } finally {
      setRequestLoading(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar links={STUDENT_LINKS} />
      <main className="flex-grow bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Browse Course Catalog</h1>
            <p className="text-muted-foreground mt-1">
              Explore available courses across all departments
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="w-full sm:w-64">
              <Select value={selectedCourseType} onValueChange={setSelectedCourseType}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Core">Core Courses</SelectItem>
                  <SelectItem value="Elective">Electives</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-64">
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.code} - {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={fetchData} disabled={isLoading} className="gap-2">
              <RefreshCwIcon className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCwIcon className="size-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-muted-foreground mt-2">Loading courses...</p>
              </div>
            </div>
          ) : error ? (
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <AlertTriangleIcon className="size-8 text-destructive" />
                </EmptyMedia>
                <EmptyTitle>Error loading data</EmptyTitle>
                <EmptyDescription>{error}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={fetchData} variant="outline">
                  Try Again
                </Button>
              </EmptyContent>
            </Empty>
          ) : filteredCourses.length === 0 ? (
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconListSearch className="size-8 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle>No courses found</EmptyTitle>
                <EmptyDescription>
                  {selectedDepartment === "all" && selectedCourseType === "all"
                    ? "No courses are currently available in the catalog."
                    : "No courses match your selected filters. Try adjusting your search criteria."}
                </EmptyDescription>
              </EmptyHeader>
              {(selectedDepartment !== "all" || selectedCourseType !== "all") && (
                <EmptyContent>
                  <Button
                    onClick={() => {
                      setSelectedDepartment("all");
                      setSelectedCourseType("all");
                    }}
                    variant="outline"
                  >
                    Clear Filters
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Showing {filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredCourses.map((course) => (
                  <StudentCourseCard
                    key={course.id}
                    course={course}
                    onClick={handleCourseClick}
                    onRequest={handleRequestElective}
                    loadingRequest={requestLoading === course.id}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Course Detail Modal */}
      <CourseDetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        course={selectedCourse}
      />
    </div>
  );
};

export default CourseCatalog;
