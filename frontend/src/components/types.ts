export type CalendarView = "month" | "week" | "day" | "agenda";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  color?: EventColor;
  location?: string;
  // Extended properties for display
  facilityId?: string;
  facilityName?: string;
  courseCode?: string;
  bookedBy?: string;
}

export type EventColor =
  | "sky"
  | "amber"
  | "violet"
  | "rose"
  | "emerald"
  | "orange";

export interface Facility {
  id: string;
  name: string;
  code: string;
  type: 'Classroom' | 'Laboratory';
  capacity: number;
  status: 'Active' | 'Maintenance';
  building?: string;
}

export interface Booking {
  id: string;
  facilityId: string;
  courseId?: string;
  title: string;
  description?: string;
  startTime: string; // ISO string from API
  endTime: string; // ISO string from API
  bookedById: string;
  facility: Facility;
  course?: {
    id: string;
    courseCode: string;
    name: string;
  };
  bookedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}
