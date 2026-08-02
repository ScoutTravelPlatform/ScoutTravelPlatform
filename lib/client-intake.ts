import { z } from "zod";

const nullableText = z.string().nullable();

export const clientIntakeProfileSchema = z.object({
  client: z.object({
    id: z.uuid(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    phone_e164: nullableText,
    address_line1: nullableText,
    address_line2: nullableText,
    city: nullableText,
    state_province: nullableText,
    postal_code: nullableText,
    country: nullableText,
    travel_style: nullableText,
    room_preferences: nullableText,
    favorite_resorts: z.array(z.string()),
    favorite_cruise_lines: z.array(z.string()),
    favorite_airlines: z.array(z.string()),
  }),
  travelers: z.array(z.object({
    id: z.uuid(),
    full_name: z.string(),
    date_of_birth: nullableText,
    relationship: nullableText,
    passport_number: nullableText,
    passport_country: nullableText,
    passport_expiration: nullableText,
    tsa_precheck_number: nullableText,
    global_entry_number: nullableText,
    dietary_restrictions: nullableText,
    accessibility_needs: nullableText,
    needs_stroller: z.boolean(),
    notes: nullableText,
    loyalty_programs: z.array(z.object({
      id: z.uuid(),
      program_type: z.string(),
      program_name: z.string(),
      member_number: z.string(),
    })),
  })),
  celebrations: z.array(z.object({
    id: z.uuid(),
    occasion: z.string(),
    occasion_date: nullableText,
    recurring_annually: z.boolean(),
    notes: nullableText,
  })),
});

export type ClientIntakeProfile = z.infer<typeof clientIntakeProfileSchema>;
