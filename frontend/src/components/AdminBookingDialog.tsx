"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  createBooking,
  getAllFacilities,
  type Facility,
  type BookingRequest,
} from "@/lib/facilityService";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

interface Course {
  id: string;
  courseCode: string;
  name: string;
}

interface AdminBookingDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onBookingCreated?: () => void;
}

export default function AdminBookingDialog({
  open: controlledOpen,
  onOpenChange,
  onBookingCreated,
}: AdminBookingDialogProps) {
  // Support both controlled and uncontrolled modes
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) setInternalOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Data for dropdowns
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    facilityId: "",
    startTime: "",
    endTime: "",
    title: "",
    description: "",
    courseId: "",
  });

  // Fetch facilities and courses on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        // Fetch facilities
        const facilityData = await getAllFacilities({ limit: 500 });
        // Filter to only active facilities
        setFacilities(facilityData.facilities.filter((f) => f.status === "Active"));

        // Fetch courses
        try {
          const res = await axios.get(`${API_BASE_URL}/api/courses?limit=500`, {
            withCredentials: true,
          });
          setCourses(res.data.courses || res.data || []);
        } catch (err) {
          console.error("Failed to fetch courses:", err);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = (): string | null => {
    if (!formData.facilityId) return "Please select a facility";
    if (!formData.startTime) return "Please select a start time";
    if (!formData.endTime) return "Please select an end time";
    if (!formData.title.trim()) return "Please enter a title/reason";

    const start = new Date(formData.startTime);
    const end = new Date(formData.endTime);
    if (start >= end) return "End time must be after start time";

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const bookingData: BookingRequest = {
        facilityId: formData.facilityId,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        courseId: formData.courseId || undefined,
      };

      await createBooking(bookingData);

      toast.success("Booking created successfully!");

      // Reset form
      setFormData({
        facilityId: "",
        startTime: "",
        endTime: "",
        title: "",
        description: "",
        courseId: "",
      });

      handleOpenChange(false);
      onBookingCreated?.();
    } catch (err: any) {
      console.error("Booking error:", err);

      // Handle 409 conflict specifically
      if (err.response?.status === 409) {
        const conflict = err.response.data.conflict;
        let msg = "Facility is already booked for this time slot.";
        if (conflict) {
          const conflictStart = new Date(conflict.startTime).toLocaleString();
          const conflictEnd = new Date(conflict.endTime).toLocaleString();
          msg += ` Conflict: ${conflict.title} (${conflictStart} - ${conflictEnd})`;
        }
        setError(msg);
        toast.error("Booking conflict detected", { description: msg });
      } else {
        const msg = err.response?.data?.message || err.message || "Failed to create booking";
        setError(msg);
        toast.error("Failed to create booking", { description: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <CalendarPlus className="size-4" />
          New Booking
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Booking</DialogTitle>
          <DialogDescription>
            Reserve a facility for a specific time slot.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          {/* Facility Selection */}
          <div className="space-y-2">
            <Label htmlFor="facility">Facility *</Label>
            <Select
              value={formData.facilityId}
              onValueChange={(val) => handleSelectChange("facilityId", val)}
              disabled={loadingData}
            >
              <SelectTrigger id="facility">
                <SelectValue placeholder={loadingData ? "Loading..." : "Select a facility"} />
              </SelectTrigger>
              <SelectContent>
                {facilities.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name} ({f.code}) - {f.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date/Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                name="startTime"
                type="datetime-local"
                value={formData.startTime}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                name="endTime"
                type="datetime-local"
                value={formData.endTime}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title / Reason *</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., CS101 Lecture, Department Meeting"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Additional notes about this booking..."
              rows={2}
            />
          </div>

          {/* Course Selection (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="course">Link to Course (Optional)</Label>
            <Select
              value={formData.courseId}
              onValueChange={(val) => handleSelectChange("courseId", val === "none" ? "" : val)}
              disabled={loadingData}
            >
              <SelectTrigger id="course">
                <SelectValue placeholder={loadingData ? "Loading..." : "None"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.courseCode} - {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || loadingData}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Create Booking
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
