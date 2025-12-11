import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpenIcon, GraduationCapIcon, BuildingIcon, CalendarIcon, LinkIcon, UsersIcon, Loader2Icon, CheckCircleIcon, AlertCircleIcon } from "lucide-react";
import type { Course } from "@/components/CourseCard";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { AxiosError } from "axios";

interface CourseDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course | null;
  onRegistrationSuccess?: () => void;
}

export function CourseDetailModal({
  open,
  onOpenChange,
  course,
  onRegistrationSuccess,
}: CourseDetailModalProps) {
  const { user } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleRegister = async () => {
    if (!course) return;

    setIsRegistering(true);
    setRegistrationResult(null);

    try {
      const response = await api.post('/enrollments/register', {
        courseId: course.id,
      });

      setRegistrationResult({
        success: true,
        message: response.data.message || 'Successfully registered for course!',
      });

      if (onRegistrationSuccess) {
        onRegistrationSuccess();
      }
    } catch (error) {
      let errorMessage = 'Failed to register for course';
      if (error instanceof AxiosError && error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      setRegistrationResult({
        success: false,
        message: errorMessage,
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setRegistrationResult(null);
    }
    onOpenChange(isOpen);
  };

  if (!course) return null;

  const isStudent = user?.role === 'student';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
            <div className="flex items-center gap-2">
              <UsersIcon className="size-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Capacity</p>
                <p className="font-medium">{course.capacity} seats</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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

          {/* Registration Result */}
          {registrationResult && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${registrationResult.success
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
              {registrationResult.success ? (
                <CheckCircleIcon className="size-5 flex-shrink-0" />
              ) : (
                <AlertCircleIcon className="size-5 flex-shrink-0" />
              )}
              <p className="text-sm">{registrationResult.message}</p>
            </div>
          )}
        </div>

        {/* Footer with Register Button */}
        {isStudent && (
          <DialogFooter className="mt-6">
            <Button
              onClick={handleRegister}
              disabled={isRegistering || registrationResult?.success}
              className="w-full sm:w-auto"
            >
              {isRegistering ? (
                <>
                  <Loader2Icon className="size-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : registrationResult?.success ? (
                <>
                  <CheckCircleIcon className="size-4 mr-2" />
                  Registered
                </>
              ) : (
                'Register for Course'
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

