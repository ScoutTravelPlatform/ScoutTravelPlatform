import { createClient } from "@/lib/supabase/server";
import { clientPortalSchema } from "@/lib/client-portal";
import { createItineraryPdf } from "@/lib/itinerary-pdf";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return new Response("Not found", { status: 404 });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_client_portal", { portal_token: token });
  const parsed = clientPortalSchema.safeParse(data);
  if (error || !parsed.success) return new Response("Not found", { status: 404 });
  const portal = parsed.data;
  const bytes = await createItineraryPdf({
    tripName: portal.trip.trip_name, destination: portal.trip.destination, clientName: portal.trip.client_name,
    clientEmail: null, startDate: portal.trip.start_date, endDate: portal.trip.end_date, supplier: portal.trip.supplier,
    resortHotel: portal.trip.resort_hotel, bookingNumber: portal.trip.booking_number,
    items: portal.itinerary_items.map((item) => ({ date: item.item_date, time: item.start_time, category: item.category, title: item.title, location: item.location, confirmationNumber: item.confirmation_number, notes: item.notes })),
  });
  return new Response(bytes as BodyInit, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${slug(portal.trip.trip_name)}-itinerary.pdf"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } });
}

function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "trip"; }
