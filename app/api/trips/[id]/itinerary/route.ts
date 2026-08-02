import { createAuthorizedClient } from "@/lib/auth";
import { createItineraryPdf } from "@/lib/itinerary-pdf";
import { z } from "zod";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const parsed = z.uuid().safeParse((await context.params).id);
  if (!parsed.success) return new Response("Not found", { status: 404 });

  const supabase = await createAuthorizedClient();
  const [tripResult, itineraryResult] = await Promise.all([
    supabase.from("trips").select("trip_name,destination,start_date,end_date,supplier,resort_hotel,booking_number,clients(first_name,last_name,email)").eq("id", parsed.data).maybeSingle(),
    supabase.from("itinerary_items").select("item_date,start_time,category,title,location,confirmation_number,notes").eq("trip_id", parsed.data).eq("client_visible", true).order("item_date", { ascending: true }).order("start_time", { ascending: true }),
  ]);
  const trip = tripResult.data;
  if (tripResult.error || !trip) return new Response("Not found", { status: 404 });
  if (itineraryResult.error) return new Response("Could not prepare itinerary", { status: 500 });

  const tripName = trip.trip_name ?? "Trip";
  const bytes = await createItineraryPdf({
    tripName,
    destination: trip.destination ?? "",
    clientName: `${trip.clients.first_name} ${trip.clients.last_name}`,
    clientEmail: trip.clients.email,
    startDate: trip.start_date ?? "",
    endDate: trip.end_date ?? "",
    supplier: trip.supplier,
    resortHotel: trip.resort_hotel,
    bookingNumber: trip.booking_number,
    items: (itineraryResult.data ?? []).map((item) => ({ date: item.item_date, time: item.start_time, category: item.category, title: item.title, location: item.location, confirmationNumber: item.confirmation_number, notes: item.notes })),
  });
  const filename = `${slug(tripName)}-itinerary.pdf`;
  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "trip"; }
