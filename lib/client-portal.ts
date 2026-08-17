import { z } from "zod";

const nullableText = z.string().nullable();
export const clientPortalSchema = z.object({
  trip: z.object({
    id: z.uuid(),
    trip_name: z.string(),
    destination: z.string(),
    start_date: z.string(),
    end_date: z.string(),
    supplier: nullableText,
    resort_hotel: nullableText,
    booking_number: nullableText,
    client_name: z.string(),
    organization_name: z.string(),
  }),
  itinerary_items: z.array(z.object({
    item_date: z.string(), start_time: nullableText, category: z.string(), title: z.string(),
    location: nullableText, confirmation_number: nullableText, notes: nullableText,
  })),
  important_dates: z.array(z.object({
    event_date: nullableText, event_type: z.string(), title: z.string(), description: nullableText,
  })),
  quotes: z.array(z.object({
    id: z.uuid(),
    title: z.string(),
    supplier: z.string(),
    total_amount: z.coerce.number().nonnegative(),
    deposit_amount: z.coerce.number().nonnegative().nullable(),
    expires_on: nullableText,
    status: z.enum(["Draft", "Sent", "Accepted", "Declined", "Expired"]),
    notes: nullableText,
    options: z.array(z.object({
      id: z.uuid(),
      title: z.string(),
      supplier: z.string(),
      resort_name: nullableText,
      image_url: nullableText,
      total_amount: z.coerce.number().nonnegative(),
      deposit_amount: z.coerce.number().nonnegative().nullable(),
      is_recommended: z.boolean(),
      notes: nullableText,
    })).default([]),
  })),
  payment_credentials: z.array(z.object({
    id: z.uuid(),
    display_label: z.string(),
    brand: nullableText,
    last_four: nullableText,
    expiration_month: z.number().nullable(),
    expiration_year: z.number().nullable(),
  })).default([]),
});

export type ClientPortalData = z.infer<typeof clientPortalSchema>;

export function groupPortalItinerary(items: ClientPortalData["itinerary_items"]) {
  const groups = new Map<string, ClientPortalData["itinerary_items"]>();
  for (const item of items) { const group = groups.get(item.item_date) ?? []; group.push(item); groups.set(item.item_date, group); }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}
