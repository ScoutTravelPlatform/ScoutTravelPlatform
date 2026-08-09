import { z } from "zod";

const requiredText = (label: string, max = 200) =>
  z.string().trim().min(1, `${label} is required.`).max(max);

const optionalText = (max = 2_000) =>
  z.string().trim().max(max).optional().nullable();

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

const optionalDate = z.union([isoDate, z.literal(""), z.null()]).optional();

export const clientInputSchema = z.object({
  firstName: requiredText("First name", 100),
  lastName: requiredText("Last name", 100),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address.")),
  phone: z.string().trim().max(30).optional().nullable().refine(
    (value) => !value || normalizePhoneE164(value) !== null,
    "Enter a valid mobile number.",
  ),
  smsConsent: z.boolean().optional(),
});

export const tripInputSchema = z
  .object({
    clientId: z.uuid(),
    tripName: requiredText("Trip name"),
    destination: requiredText("Destination"),
    supplier: optionalText(200),
    resortHotel: optionalText(200),
    bookingNumber: optionalText(200),
    startDate: isoDate,
    endDate: isoDate,
    finalPaymentDate: optionalDate,
    packagePrice: z.number().nonnegative().nullable(),
    commissionAmount: z.number().nonnegative().nullable(),
    adults: z.number().int().nonnegative(),
    children: z.number().int().nonnegative(),
    status: requiredText("Status", 50),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: "The end date cannot be before the start date.",
    path: ["endDate"],
  });

export const taskInputSchema = z.object({
  tripId: z.uuid(),
  title: requiredText("Task name"),
  dueDate: optionalDate,
  assigneeId: z.union([z.uuid(), z.literal(""), z.null()]).optional(),
});

export const quoteInputSchema = z.object({
  tripId: z.uuid(),
  title: requiredText("Quote name"),
  supplier: requiredText("Supplier"),
  totalAmount: z.number().nonnegative("Quote amount cannot be negative."),
  depositAmount: z.number().nonnegative("Deposit amount cannot be negative.").nullable(),
  expiresOn: optionalDate,
  notes: optionalText(),
});

export const paymentInputSchema = z.object({
  tripId: z.uuid(),
  paymentName: requiredText("Payment name"),
  amount: z.number().positive("Payment amount must be greater than zero."),
  dueDate: optionalDate,
});

export const commissionInputSchema = z.object({
  tripId: z.uuid(),
  supplier: requiredText("Supplier"),
  commissionPercent: z.number().positive().max(100),
  expectedCommission: z.number().nonnegative(),
  expectedPayDate: optionalDate,
  notes: optionalText(),
});

export const timelineEventInputSchema = z.object({
  tripId: z.uuid(),
  eventType: requiredText("Event type", 50),
  title: requiredText("Event title"),
  description: optionalText(),
  eventDate: optionalDate,
  status: z.enum(["Upcoming", "Completed", "Canceled"]),
});

export const itineraryItemInputSchema = z.object({
  tripId: z.uuid(),
  itemDate: isoDate,
  startTime: z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), z.literal(""), z.null()]).optional(),
  category: z.enum(["Park", "Dining", "Activity", "Travel", "Resort", "Other"]),
  title: requiredText("Plan title"),
  location: optionalText(200),
  confirmationNumber: optionalText(200),
  notes: optionalText(),
  clientVisible: z.boolean().default(true),
});

const relationshipEnum = z.enum(["self", "spouse", "partner", "child", "parent", "other"]);
const favoriteListSchema = z.array(z.string().trim().min(1).max(200)).max(20).default([]);

export const clientIntakeContactSchema = z.object({
  firstName: requiredText("First name", 100),
  lastName: requiredText("Last name", 100),
  email: z.string().trim().toLowerCase().pipe(z.email()).optional(),
  phone: z.string().trim().max(30).optional().nullable().refine(
    (value) => !value || normalizePhoneE164(value) !== null,
    "Enter a valid mobile number.",
  ),
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  city: optionalText(100),
  stateProvince: optionalText(100),
  postalCode: optionalText(30),
  country: optionalText(100),
});

export const clientInviteSchema = z.object({
  contact: requiredText("Email or phone number", 200),
});

export const clientIntakePreferencesSchema = z.object({
  travelStyle: optionalText(500),
  roomPreferences: optionalText(1_000),
  favoriteResorts: favoriteListSchema,
  favoriteCruiseLines: favoriteListSchema,
  favoriteAirlines: favoriteListSchema,
});

export const clientIntakeTravelerSchema = z.object({
  travelerId: z.uuid().optional().nullable(),
  fullName: requiredText("Traveler name", 200),
  dateOfBirth: optionalDate,
  relationship: z.union([relationshipEnum, z.literal(""), z.null()]).optional(),
  passportNumber: optionalText(50),
  passportCountry: optionalText(100),
  passportExpiration: optionalDate,
  tsaPrecheckNumber: optionalText(50),
  globalEntryNumber: optionalText(50),
  dietaryRestrictions: optionalText(1_000),
  accessibilityNeeds: optionalText(1_000),
  needsStroller: z.boolean().optional(),
});

export const clientIntakeCelebrationSchema = z.object({
  celebrationId: z.uuid().optional().nullable(),
  occasion: requiredText("Occasion", 200),
  occasionDate: optionalDate,
  recurringAnnually: z.boolean().optional(),
  notes: optionalText(1_000),
});

export const clientIntakeLoyaltyProgramSchema = z.object({
  programId: z.uuid().optional().nullable(),
  travelerId: z.uuid(),
  programType: z.enum(["hotel", "airline", "cruise", "car", "other"]),
  programName: requiredText("Program name", 200),
  memberNumber: requiredText("Member number", 100),
});

export const clientPaymentCredentialSchema = z.object({
  clientId: z.uuid(),
  tripId: z.uuid(),
  cardNumber: z.string().regex(/^[0-9]{13,19}$/, "Enter a valid card number."),
  cvc: z.string().regex(/^\d{3,4}$/, "Enter a valid security code."),
  expirationMonth: z.number().int().min(1).max(12),
  expirationYear: z.number().int().min(new Date().getFullYear()).max(2200),
  label: requiredText("Card label", 100),
  supplier: requiredText("Supplier", 150),
  purpose: requiredText("Authorized purpose", 500),
  maximumAmount: z.number().positive().max(10_000_000).nullable(),
});

export function nullableValue(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function nullableDate(value: string | null | undefined) {
  return value || null;
}

export function normalizePhoneE164(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (trimmed.startsWith("+") && digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }
  return null;
}
