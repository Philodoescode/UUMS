import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { XIcon, CheckIcon, ChevronsUpDownIcon, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Course {
  id: string;
  courseCode: string;
  name: string;
}

interface PrerequisiteSelectorProps {
  availableCourses: Course[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  excludeCourseId?: string; // Exclude the current course being edited
  disabled?: boolean;
}

export function PrerequisiteSelector({
  availableCourses,
  selectedIds,
  onChange,
  excludeCourseId,
  disabled = false,
}: PrerequisiteSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter out the course being edited and apply search
  const filteredCourses = useMemo(() => {
    let courses = availableCourses.filter((c) => c.id !== excludeCourseId);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      courses = courses.filter(
        (c) =>
          c.courseCode.toLowerCase().includes(query) ||
          c.name.toLowerCase().includes(query)
      );
    }
    
    return courses;
  }, [availableCourses, excludeCourseId, searchQuery]);

  // Get selected course objects
  const selectedCourses = useMemo(() => {
    return availableCourses.filter((c) => selectedIds.includes(c.id));
  }, [availableCourses, selectedIds]);

  const toggleCourse = (courseId: string) => {
    if (selectedIds.includes(courseId)) {
      onChange(selectedIds.filter((id) => id !== courseId));
    } else {
      onChange([...selectedIds, courseId]);
    }
  };

  const removeCourse = (courseId: string) => {
    onChange(selectedIds.filter((id) => id !== courseId));
  };

  return (
    <div className="space-y-2">
      {/* Selected chips */}
      {selectedCourses.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedCourses.map((course) => (
            <Badge
              key={course.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <span className="font-semibold">{course.courseCode}</span>
              <span className="text-muted-foreground">-</span>
              <span className="truncate max-w-32">{course.name}</span>
              <button
                type="button"
                onClick={() => removeCourse(course.id)}
                disabled={disabled}
                className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors disabled:opacity-50"
                aria-label={`Remove ${course.courseCode}`}
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Trigger button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
            type="button"
          >
            <span className="text-muted-foreground">
              {selectedCourses.length === 0
                ? "Select prerequisites..."
                : `${selectedCourses.length} prerequisite${selectedCourses.length !== 1 ? "s" : ""} selected`}
            </span>
            <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          {/* Search input */}
          <div className="flex items-center border-b px-3 py-2">
            <SearchIcon className="size-4 text-muted-foreground mr-2" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 h-8 px-0"
            />
          </div>

          {/* Course list */}
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {searchQuery ? "No courses found" : "No courses available"}
              </p>
            ) : (
              filteredCourses.map((course) => {
                const isSelected = selectedIds.includes(course.id);
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => toggleCourse(course.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm rounded-md transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent/50"
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-4 items-center justify-center rounded-sm border",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {isSelected && <CheckIcon className="size-3" />}
                    </div>
                    <span className="font-medium">{course.courseCode}</span>
                    <span className="text-muted-foreground truncate">
                      {course.name}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Clear all button */}
          {selectedCourses.length > 0 && (
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange([])}
                className="w-full text-muted-foreground"
                type="button"
              >
                Clear all
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
