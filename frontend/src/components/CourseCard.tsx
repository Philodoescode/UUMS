import { Card, CardContent, CardHeader, CardTitle, CardAction, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PencilIcon, TrashIcon, UsersIcon, BookOpenIcon } from "lucide-react";

export interface PrerequisiteCourse {
  id: string;
  courseCode: string;
  name: string;
}

export interface Course {
  id: string;
  courseCode: string;
  name: string;
  description?: string;
  credits: number;
  semester: "Fall" | "Spring" | "Summer";
  year: number;
  capacity: number;
  isActive: boolean;
  courseType: "Core" | "Elective";
  prerequisites?: PrerequisiteCourse[];
  department?: {
    id: string;
    code: string;
    name: string;
  };
  instructors?: {
    id: string;
    user: {
      fullName: string;
    };
    isPrimary: boolean;
  }[];
}

interface CourseCardProps {
  course: Course;
  onEdit: (course: Course) => void;
  onDelete: (course: Course) => void;
}

export function CourseCard({ course, onEdit, onDelete }: CourseCardProps) {
  return (
    <Card className={`relative transition-all hover:shadow-md ${!course.isActive ? "opacity-60" : ""}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={course.isActive ? "default" : "secondary"}>
                {course.courseCode}
              </Badge>
              <Badge variant="outline">
                {course.semester} {course.year}
              </Badge>
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
            <CardTitle className="mt-2 text-lg truncate">{course.name}</CardTitle>
            <CardDescription className="mt-1">
              {course.department?.name || "No Department"}
            </CardDescription>
          </div>
          <CardAction>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onEdit(course)}
                title="Edit course"
              >
                <PencilIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onDelete(course)}
                title="Delete course"
                className="text-destructive hover:text-destructive"
              >
                <TrashIcon className="size-4" />
              </Button>
            </div>
          </CardAction>
        </div>
      </CardHeader>
      <CardContent>
        {course.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {course.description}
          </p>
        )}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <BookOpenIcon className="size-4" />
            <span>{course.credits} credits</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <UsersIcon className="size-4" />
            <span>Capacity: {course.capacity}</span>
          </div>
        </div>
        {!course.isActive && (
          <Badge variant="destructive" className="mt-3">
            Inactive
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
