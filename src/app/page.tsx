import { currentDate } from "@/domain/time";
import { BookingPage } from "@/features/booking/components/booking-page";

/**
 * Rendered per request rather than prerendered: the initial date is "today", which is not
 * a build-time constant. Without this, Next would bake the build date into the page.
 */
export const dynamic = "force-dynamic";

/**
 * The initial date is resolved on the server so that the first client render agrees with
 * the markup it hydrates — and so the day the app opens on comes from the same clock that
 * decides which slots have passed.
 */
export default function Home() {
  const now = new Date();
  return (
    <BookingPage initialDate={currentDate(now)} initialServerNow={now.toISOString()} />
  );
}
