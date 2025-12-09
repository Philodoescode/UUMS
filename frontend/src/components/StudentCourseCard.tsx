import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpenIcon } from "lucide-react";
import type { Course } from "@/components/CourseCard";

interface StudentCourseCardProps {
  course: Course;
  onClick: (course: Course) => void;
}

export function StudentCourseCard({ course, onClick }: StudentCourseCardProps) {
  return (
    <Card 
      className="relative transition-all hover:shadow-md hover:border-primary/50 cursor-pointer"
      onClick={() => onClick(course)}
    >
      <CardHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="default">
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
        <CardTitle className="mt-2 text-lg">{course.name}</CardTitle>
        <CardDescription className="mt-1">
          {course.department?.name || "No Department"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {course.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {course.description}
          </p>
        )}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <BookOpenIcon className="size-4" />
          <span>{course.credits} credits</span>
        </div>
      </CardContent>
    </Card>
  );
}
