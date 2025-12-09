import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BookOpenIcon, GraduationCapIcon, BuildingIcon, CalendarIcon, LinkIcon } from "lucide-react";
import type { Course } from "@/components/CourseCard";

interface CourseDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course | null;
}

export function CourseDetailModal({
  open,
  onOpenChange,
  course,
}: CourseDetailModalProps) {
  if (!course) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge variant="default">{course.courseCode}</Badge>
            <Badge 
              variant="outline" 
              className={course.courseType === "Core" 
                ? "border-blue-500 text-blue-600 bg-blue-50" 
                : "border-green-500 text-green-600 bg-green-50"
              }
            >
              {course.courseType}
            </Badge>
          </div>
          <DialogTitle className="text-xl">{course.name}</DialogTitle>
          <DialogDescription>
            View detailed course information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Course Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <BookOpenIcon className="size-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Credits</p>
                <p className="font-medium">{course.credits}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Semester</p>
                <p className="font-medium">{course.semester} {course.year}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <BuildingIcon className="size-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Department</p>
                <p className="font-medium">{course.department?.name || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {course.description && (
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {course.description}
              </p>
            </div>
          )}

          {/* Prerequisites */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <LinkIcon className="size-4 text-muted-foreground" />
              <h4 className="font-medium">Prerequisites</h4>
            </div>
            {course.prerequisites && course.prerequisites.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {course.prerequisites.map((prereq) => (
                  <Badge 
                    key={prereq.id} 
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <GraduationCapIcon className="size-3" />
                    {prereq.courseCode}: {prereq.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No prerequisites required
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
