import { useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import { ADMIN_LINKS } from "@/config/navLinks";
import CalendarMainView from "@/components/CalendarMainView";
import AdminBookingDialog from "@/components/AdminBookingDialog";

const FacilityCalendar = () => {
  const refreshCalendarRef = useRef<(() => void) | null>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);

  const handleBookingCreated = () => {
    setIsBookingDialogOpen(false);
    // Trigger calendar refresh
    refreshCalendarRef.current?.();
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar links={ADMIN_LINKS} />
      <main className="flex-grow bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Facility Calendar</h1>
              <p className="text-muted-foreground mt-1">View facility bookings and availability</p>
            </div>
            <AdminBookingDialog
              open={isBookingDialogOpen}
              onOpenChange={setIsBookingDialogOpen}
              onBookingCreated={handleBookingCreated}
            />
          </div>
          <CalendarMainView 
            onRefreshReady={(fn) => { refreshCalendarRef.current = fn; }}
          />
        </div>
      </main>
    </div>
  );
};

export default FacilityCalendar;

