import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";

interface FormData {
  title: string;
  body: string;
  type: "general" | "event" | "deadline" | "";
  date: string;
}

interface CreateAnnouncementFormProps {
  onSuccess?: () => void;
  className?: string;
}

export function CreateAnnouncementForm({
  onSuccess,
  className,
}: CreateAnnouncementFormProps) {
  const [formData, setFormData] = useState<FormData>({
    title: "",
    body: "",
    type: "",
    date: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    // Client-side validation
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.length > 255) {
      newErrors.title = "Title must be less than 255 characters";
    }

    if (!formData.body.trim()) {
      newErrors.body = "Body is required";
    } else if (formData.body.length > 5000) {
      newErrors.body = "Body must be less than 5000 characters";
    }

    if (!formData.type) {
      newErrors.type = "Type is required";
    }

    if (!formData.date) {
      newErrors.date = "Date is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      await api.post("/university-announcements", {
        title: formData.title.trim(),
        body: formData.body.trim(),
        type: formData.type,
        date: formData.date,
      });

      toast.success("Announcement created successfully!");

      // Reset form
      setFormData({
        title: "",
        body: "",
        type: "",
        date: "",
      });

      // Call optional success callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("Error creating announcement:", err);

      if (err.response?.status === 403) {
        toast.error("You don't have permission to create announcements");
      } else if (err.response?.status === 400) {
        const message = err.response?.data?.message || "Please check your input";
        toast.error(message);
      } else {
        toast.error("Failed to create announcement. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input
            id="title"
            type="text"
            placeholder="Enter announcement title"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            aria-invalid={!!errors.title}
          />
          {errors.title && (
            <p className="text-destructive text-sm mt-1">{errors.title}</p>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="body">Body</FieldLabel>
          <Textarea
            id="body"
            placeholder="Enter announcement details"
            rows={6}
            value={formData.body}
            onChange={(e) =>
              setFormData({ ...formData, body: e.target.value })
            }
            aria-invalid={!!errors.body}
          />
          {errors.body && (
            <p className="text-destructive text-sm mt-1">{errors.body}</p>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="type">Type</FieldLabel>
          <Select
            value={formData.type}
            onValueChange={(value: "general" | "event" | "deadline") =>
              setFormData({ ...formData, type: value })
            }
          >
            <SelectTrigger id="type">
              <SelectValue placeholder="Select announcement type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General Announcement</SelectItem>
              <SelectItem value="event">Event</SelectItem>
              <SelectItem value="deadline">Deadline</SelectItem>
            </SelectContent>
          </Select>
          {errors.type && (
            <p className="text-destructive text-sm mt-1">{errors.type}</p>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="date">Date</FieldLabel>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) =>
              setFormData({ ...formData, date: e.target.value })
            }
            aria-invalid={!!errors.date}
          />
          {errors.date && (
            <p className="text-destructive text-sm mt-1">{errors.date}</p>
          )}
        </Field>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Creating..." : "Create Announcement"}
        </Button>
      </FieldGroup>
    </form>
  );
}
