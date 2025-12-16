import Navbar from "@/components/Navbar";
import { ADMIN_LINKS } from "@/config/navLinks";
import CalendarMainView from "@/components/CalendarMainView";

const FacilityCalendar = () => (
  <div className="flex flex-col min-h-screen">
    <Navbar links={ADMIN_LINKS} />
    <main className="flex-grow bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Facility Calendar</h1>
          <p className="text-muted-foreground mt-1">View facility bookings and availability</p>
        </div>
        <CalendarMainView />
      </div>
    </main>
  </div>
);

export default FacilityCalendar;
