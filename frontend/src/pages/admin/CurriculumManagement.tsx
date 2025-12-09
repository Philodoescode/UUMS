import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { ADMIN_LINKS } from "@/config/navLinks";
import { Button } from "@/components/ui/button";
import { CourseCard, type Course } from "@/components/CourseCard";
import { CourseModal } from "@/components/CourseModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusIcon, RefreshCwIcon, AlertTriangleIcon } from "lucide-react"; // Added AlertTriangleIcon
import api from "@/lib/api";
import { IconBookmarkPlus } from '@tabler/icons-react';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

interface Department {
  id: string;
  code: string;
  name: string;
}

const CurriculumManagement = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [coursesRes, departmentsRes] = await Promise.all([
        api.get("/courses"),
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

  const filteredCourses =
    selectedDepartment === "all"
      ? courses
      : courses.filter((c) => c.department?.id === selectedDepartment);

  const handleCreateCourse = () => {
    setEditingCourse(null);
    setIsModalOpen(true);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setIsModalOpen(true);
  };

  const handleDeleteCourse = async (course: Course) => {
    if (!confirm(`Are you sure you want to deactivate "${course.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/courses/${course.id}`);
      // Optimistic update
      setCourses((prev) =>
        prev.map((c) => (c.id === course.id ? { ...c, isActive: false } : c))
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete course";
      alert(errorMessage);
    }
  };

  const handleSaveCourse = async (courseData: Partial<Course> & { departmentId?: string }) => {
    setIsSaving(true);
    try {
      if (editingCourse) {
        // Update existing course
        const response = await api.put(`/courses/${editingCourse.id}`, courseData);
        setCourses((prev) =>
          prev.map((c) => (c.id === editingCourse.id ? response.data : c))
        );
      } else {
        // Create new course
        const response = await api.post("/courses", courseData);
        setCourses((prev) => [...prev, response.data]);
      }
      setIsModalOpen(false);
      setEditingCourse(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const errorMessage = error.response?.data?.message || "Failed to save course";
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar links={ADMIN_LINKS} />
      <main className="flex-grow bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">Curriculum Management</h1>
              <p className="text-muted-foreground mt-1">
                Manage courses, departments, and academic programs
              </p>
            </div>
            <Button onClick={handleCreateCourse} className="gap-2 self-start sm:self-auto">
              <PlusIcon className="size-4" />
              Add Course
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
            // START: Empty status for Error
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
            // END: Empty status for Error
          ) : filteredCourses.length === 0 ? (
            // START: Empty status for No Data
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconBookmarkPlus className="size-8 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle>No courses found</EmptyTitle>
                <EmptyDescription>
                  {selectedDepartment === "all"
                    ? "Get started by adding your first course."
                    : "No courses found matching the selected filter."}
                </EmptyDescription>
              </EmptyHeader>
              {selectedDepartment === "all" && (
                <EmptyContent>
                  <Button onClick={handleCreateCourse} className="gap-2">
                    <PlusIcon className="size-4" />
                    Add Course
                  </Button>
                </EmptyContent>
              )}
            </Empty>
            // END: Empty status for No Data
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onEdit={handleEditCourse}
                  onDelete={handleDeleteCourse}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Course Modal */}
      <CourseModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        course={editingCourse}
        departments={departments}
        availableCourses={courses}
        onSave={handleSaveCourse}
        isLoading={isSaving}
      />
    </div>
  );
};

export default CurriculumManagement;