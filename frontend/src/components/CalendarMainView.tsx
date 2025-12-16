"use client";


import { addDays, endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

import type { Booking, CalendarEvent, CalendarView, Facility } from "@/components/types";
import { EventCalendar } from "@/components/event-calendar";
import { AgendaDaysToShow } from "@/components/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface CalendarMainViewProps {
  onRefreshReady?: (refreshFn: () => void) => void;
}

export default function CalendarMainView({ onRefreshReady }: CalendarMainViewProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(false);
  
  // View State
  const [view, setView] = useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Filters
  const [selectedBuilding, setSelectedBuilding] = useState<string>("all");
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("all");

  // Derived unique buildings for filter
  const buildings = Array.from(new Set(facilities.map(f => f.building).filter(Boolean))) as string[];

  // Fetch Facilities on mount
  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        // Assuming there's an endpoint to get all facilities, mostly for the dropdown
        // Pagination might be an issue if there are many, but for dropdown we usually want a list.
        // We can use the existing getAllFacilities or a simplified list.
        // Using existing endpoint with large limit for now.
        const res = await fetch('http://localhost:3000/api/facilities?limit=1000', {
            credentials: 'include'
        });
        if (res.ok) {
           const data = await res.json();
           setFacilities(data.facilities || []);
        }
      } catch (err) {
        console.error("Failed to fetch facilities", err);
      }
    };
    fetchFacilities();
  }, []);

  // Fetch Bookings
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      // Calculate start/end date based on view
      let start = new Date();
      let end = new Date();

      switch (view) {
        case "month":
          start = startOfMonth(currentDate);
          end = endOfMonth(currentDate);
          break;
        case "week":
          start = startOfWeek(currentDate);
          end = endOfWeek(currentDate);
          break;
        case "day":
          start = startOfDay(currentDate);
          end = endOfDay(currentDate);
          break;
        case "agenda":
          start = startOfDay(currentDate);
          end = addDays(currentDate, AgendaDaysToShow);
          break;
      }

      // Build Query params
      const params = new URLSearchParams({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });

      if (selectedFacilityId && selectedFacilityId !== 'all') {
        params.append('facilityId', selectedFacilityId);
      }
      
      if (selectedBuilding && selectedBuilding !== 'all') {
        params.append('building', selectedBuilding);
      }

      const res = await fetch(`http://localhost:3000/api/facilities/bookings?${params.toString()}`, {
          credentials: 'include'
      });

      if (res.ok) {
        const data: Booking[] = await res.json();
        setBookings(data);
      } else {
        console.error("Failed to fetch bookings");
      }
    } catch (err) {
      console.error("Error fetching bookings", err);
    } finally {
      setLoading(false);
    }
  }, [currentDate, view, selectedBuilding, selectedFacilityId]);

  // Fetch when dependencies change
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Pass the fetchBookings callback to parent for external refresh
  useEffect(() => {
    if (onRefreshReady) {
      onRefreshReady(fetchBookings);
    }
  }, [onRefreshReady, fetchBookings]);

  // Map bookings to CalendarEvents
  const events: CalendarEvent[] = bookings.map(b => ({
    id: b.id,
    title: b.title || b.course?.courseCode || 'Booked',
    description: b.description,
    start: new Date(b.startTime),
    end: new Date(b.endTime),
    location: b.facility ? `${b.facility.name} (${b.facility.code})` : undefined,
    color: "sky", // Default color, could be dynamic
    facilityId: b.facilityId,
    facilityName: b.facility?.name,
    courseCode: b.course?.courseCode,
    bookedBy: b.bookedBy ? b.bookedBy.fullName : 'Unknown'
  }));

  // Handle building change -> reset facility selection if not in building? 
  // For simplicity, just filter.
  // We can filter the facility dropdown based on selected building.
  const filteredFacilities = selectedBuilding === 'all' 
     ? facilities 
     : facilities.filter(f => f.building === selectedBuilding);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4 items-end p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
         <div className="flex flex-col gap-1.5 w-[200px]">
            <Label htmlFor="building-filter">Building</Label>
            <Select value={selectedBuilding} onValueChange={(val) => {
                setSelectedBuilding(val);
                setSelectedFacilityId('all'); // Reset facility when building changes
            }}>
                <SelectTrigger id="building-filter">
                    <SelectValue placeholder="All Buildings" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Buildings</SelectItem>
                    {buildings.map(b => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
         </div>

         <div className="flex flex-col gap-1.5 w-[200px]">
            <Label htmlFor="facility-filter">Facility</Label>
             <Select value={selectedFacilityId} onValueChange={setSelectedFacilityId}>
                <SelectTrigger id="facility-filter">
                    <SelectValue placeholder="All Facilities" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Facilities</SelectItem>
                    {filteredFacilities.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.name} ({f.code})</SelectItem>
                    ))}
                </SelectContent>
            </Select>
         </div>
         {loading && (
             <div className="flex items-center justify-center p-2 mb-1">
                 <Loader2 className="animate-spin h-6 w-6 text-primary" />
             </div>
         )}
      </div>

      <EventCalendar
        events={events}
        currentDate={currentDate}
        view={view}
        onNavigate={setCurrentDate}
        onViewChange={setView}
        readOnly={true} // Read-only as per requirements
      />
    </div>
  );
}
