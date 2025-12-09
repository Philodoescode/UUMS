import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { PrerequisiteSelector } from "@/components/PrerequisiteSelector";
import type { Course } from "@/components/CourseCard";

type CourseType = "Core" | "Elective";

interface Department {
  id: string;
  code: string;
  name: string;
}

interface CourseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: Course | null;
  departments: Department[];
  availableCourses?: Course[];
  onSave: (course: Partial<Course> & { prerequisiteIds?: string[] }) => Promise<void>;
  isLoading?: boolean;
}

interface FormErrors {
  courseCode?: string;
  name?: string;
  credits?: string;
  departmentId?: string;
  semester?: string;
  year?: string;
  capacity?: string;
  courseType?: string;
}

export function CourseModal({
  open,
  onOpenChange,
  course,
  departments,
  availableCourses = [],
  onSave,
  isLoading = false,
}: CourseModalProps) {
  const [formData, setFormData] = useState({
    courseCode: "",
    name: "",
    description: "",
    credits: "3",
    departmentId: "",
    semester: "Fall" as "Fall" | "Spring" | "Summer",
    year: new Date().getFullYear().toString(),
    capacity: "30",
    courseType: "Core" as CourseType,
    prerequisiteIds: [] as string[],
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const isEdit = !!course;

  useEffect(() => {
    if (course) {
      setFormData({
        courseCode: course.courseCode,
        name: course.name,
        description: course.description || "",
        credits: course.credits.toString(),
        departmentId: course.department?.id || "",
        semester: course.semester,
        year: course.year.toString(),
        capacity: course.capacity.toString(),
        courseType: course.courseType || "Core",
        prerequisiteIds: course.prerequisites?.map((p) => p.id) || [],
      });
    } else {
      setFormData({
        courseCode: "",
        name: "",
        description: "",
        credits: "3",
        departmentId: departments[0]?.id || "",
        semester: "Fall",
        year: new Date().getFullYear().toString(),
        capacity: "30",
        courseType: "Core",
        prerequisiteIds: [],
      });
    }
    setErrors({});
  }, [course, departments, open]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.courseCode || formData.courseCode.length < 2 || formData.courseCode.length > 10) {
      newErrors.courseCode = "Course code must be 2-10 characters";
    }
    if (!formData.name || formData.name.length < 3) {
      newErrors.name = "Course name must be at least 3 characters";
    }
    const credits = parseInt(formData.credits);
    if (isNaN(credits) || credits < 0 || credits > 4) {
      newErrors.credits = "Credits must be 0-4";
    }
    if (!formData.departmentId) {
      newErrors.departmentId = "Please select a department";
    }
    if (!formData.semester) {
      newErrors.semester = "Please select a semester";
    }
    const year = parseInt(formData.year);
    if (isNaN(year) || year < 2000 || year > 2100) {
      newErrors.year = "Year must be between 2000 and 2100";
    }
    const capacity = parseInt(formData.capacity);
    if (isNaN(capacity) || capacity < 10) {
      newErrors.capacity = "Capacity must be at least 10";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSave({
      ...(course?.id && { id: course.id }),
      courseCode: formData.courseCode,
      name: formData.name,
      description: formData.description || undefined,
      credits: parseInt(formData.credits),
      departmentId: formData.departmentId,
      semester: formData.semester,
      year: parseInt(formData.year),
      capacity: parseInt(formData.capacity),
      courseType: formData.courseType,
      prerequisiteIds: formData.prerequisiteIds,
    } as Partial<Course> & { departmentId: string; prerequisiteIds: string[] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Course" : "Create New Course"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the course details below."
              : "Fill in the details to create a new course."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field data-invalid={!!errors.courseCode}>
                <Label htmlFor="courseCode">Course Code *</Label>
                <Input
                  id="courseCode"
                  placeholder="e.g., CS101"
                  value={formData.courseCode}
                  onChange={(e) =>
                    setFormData({ ...formData, courseCode: e.target.value.toUpperCase() })
                  }
                  aria-invalid={!!errors.courseCode}
                />
                {errors.courseCode && <FieldError>{errors.courseCode}</FieldError>}
              </Field>

              <Field data-invalid={!!errors.departmentId}>
                <Label htmlFor="department">Department *</Label>
                <Select
                  value={formData.departmentId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, departmentId: value })
                  }
                >
                  <SelectTrigger id="department" aria-invalid={!!errors.departmentId}>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.code} - {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.departmentId && <FieldError>{errors.departmentId}</FieldError>}
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field data-invalid={!!errors.courseType}>
                <Label htmlFor="courseType">Course Type *</Label>
                <Select
                  value={formData.courseType}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      courseType: value as "Core" | "Elective",
                    })
                  }
                >
                  <SelectTrigger id="courseType" aria-invalid={!!errors.courseType}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Core">Core</SelectItem>
                    <SelectItem value="Elective">Elective</SelectItem>
                  </SelectContent>
                </Select>
                {errors.courseType && <FieldError>{errors.courseType}</FieldError>}
              </Field>
            </div>

            <Field data-invalid={!!errors.name}>
              <Label htmlFor="name">Course Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Introduction to Computer Science"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                aria-invalid={!!errors.name}
              />
              {errors.name && <FieldError>{errors.name}</FieldError>}
            </Field>

            <Field>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                placeholder="Optional course description..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                rows={3}
              />
            </Field>

            {/* Prerequisites */}
            <Field>
              <Label>Prerequisites</Label>
              <PrerequisiteSelector
                availableCourses={availableCourses}
                selectedIds={formData.prerequisiteIds}
                onChange={(ids) =>
                  setFormData({ ...formData, prerequisiteIds: ids })
                }
                excludeCourseId={course?.id}
                disabled={isLoading}
              />
            </Field>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field data-invalid={!!errors.credits}>
                <Label htmlFor="credits">Credits *</Label>
                <Select
                  value={formData.credits}
                  onValueChange={(value) =>
                    setFormData({ ...formData, credits: value })
                  }
                >
                  <SelectTrigger id="credits" aria-invalid={!!errors.credits}>
                    <SelectValue placeholder="Credits" />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4].map((c) => (
                      <SelectItem key={c} value={c.toString()}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.credits && <FieldError>{errors.credits}</FieldError>}
              </Field>

              <Field data-invalid={!!errors.semester}>
                <Label htmlFor="semester">Semester *</Label>
                <Select
                  value={formData.semester}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      semester: value as "Fall" | "Spring" | "Summer",
                    })
                  }
                >
                  <SelectTrigger id="semester" aria-invalid={!!errors.semester}>
                    <SelectValue placeholder="Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fall">Fall</SelectItem>
                    <SelectItem value="Spring">Spring</SelectItem>
                    <SelectItem value="Summer">Summer</SelectItem>
                  </SelectContent>
                </Select>
                {errors.semester && <FieldError>{errors.semester}</FieldError>}
              </Field>

              <Field data-invalid={!!errors.year}>
                <Label htmlFor="year">Year *</Label>
                <Input
                  id="year"
                  type="number"
                  min="2000"
                  max="2100"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  aria-invalid={!!errors.year}
                />
                {errors.year && <FieldError>{errors.year}</FieldError>}
              </Field>

              <Field data-invalid={!!errors.capacity}>
                <Label htmlFor="capacity">Capacity *</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="10"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: e.target.value })
                  }
                  aria-invalid={!!errors.capacity}
                />
                {errors.capacity && <FieldError>{errors.capacity}</FieldError>}
              </Field>
            </div>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : isEdit ? "Save Changes" : "Create Course"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
