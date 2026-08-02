export type TimelineAnchor = "start_date" | "end_date" | "final_payment_date";

export type DisneyTimelineRule = {
  key: string;
  version: number;
  title: string;
  description: string;
  eventType: string;
  anchor: TimelineAnchor;
  offsetDays: number;
  clientVisible: boolean;
  sourceUrl: string | null;
};

export type TripTimelineDates = Record<TimelineAnchor, string | null>;

export function isDisneyTrip(values: Array<string | null | undefined>) {
  return values.some((value) => /\b(disney|wdw|walt disney world)\b/i.test(value ?? ""));
}

export const DISNEY_TIMELINE_RULES: readonly DisneyTimelineRule[] = [
  {
    key: "wdw.account-linking",
    version: 1,
    title: "Confirm My Disney Experience plans are linked",
    description: "Scout preparation reminder: verify the resort reservation, tickets, travel party, and shared plans are visible in My Disney Experience before reservation windows open.",
    eventType: "Booking",
    anchor: "start_date",
    offsetDays: -75,
    clientVisible: false,
    sourceUrl: "https://disneyworld.disney.go.com/guest-services/manage-plans/",
  },
  {
    key: "wdw.dining-priorities",
    version: 1,
    title: "Confirm dining and Enchanting Extras priorities",
    description: "Scout preparation reminder: finalize the client's preferred experiences before the official booking window opens.",
    eventType: "Dining",
    anchor: "start_date",
    offsetDays: -67,
    clientVisible: false,
    sourceUrl: null,
  },
  {
    key: "wdw.dining-window",
    version: 1,
    title: "Disney dining and Enchanting Extras window opens",
    description: "Reservations generally open at approximately 6:00 AM Eastern, 60 days before arrival. Eligible Disney Resort Hotel guests may book the length of stay, up to 10 nights.",
    eventType: "Dining",
    anchor: "start_date",
    offsetDays: -60,
    clientVisible: true,
    sourceUrl: "https://disneyworld.disney.go.com/faq/dining-reservations/advance-reservations/",
  },
  {
    key: "wdw.online-check-in",
    version: 1,
    title: "Online resort check-in opens",
    description: "Disney Resort online check-in is available beginning 60 days before the stay.",
    eventType: "Booking",
    anchor: "start_date",
    offsetDays: -60,
    clientVisible: true,
    sourceUrl: "https://disneyworld.disney.go.com/resorts/polynesian-villas-bungalows/amenities/",
  },
  {
    key: "wdw.admission-check",
    version: 1,
    title: "Verify tickets and park reservation requirements",
    description: "Scout review reminder: date-based tickets generally do not require park reservations, while some other admission types may.",
    eventType: "Reminder",
    anchor: "start_date",
    offsetDays: -45,
    clientVisible: false,
    sourceUrl: "https://disneyworld.disney.go.com/experience-updates/park-reservations/",
  },
  {
    key: "trip.final-payment",
    version: 1,
    title: "Final payment due",
    description: "Confirm the client's final balance is paid and documented.",
    eventType: "Payment",
    anchor: "final_payment_date",
    offsetDays: 0,
    clientVisible: true,
    sourceUrl: null,
  },
  {
    key: "trip.documents",
    version: 1,
    title: "Prepare final travel documents",
    description: "Scout workflow reminder: assemble the final itinerary, confirmations, and client travel documents.",
    eventType: "Documents",
    anchor: "start_date",
    offsetDays: -14,
    clientVisible: false,
    sourceUrl: null,
  },
  {
    key: "wdw.app-readiness",
    version: 1,
    title: "Review My Disney Experience and mobile access",
    description: "Confirm the travel party can access plans, tickets, reservations, and the current My Disney Experience app before travel.",
    eventType: "Documents",
    anchor: "start_date",
    offsetDays: -30,
    clientVisible: true,
    sourceUrl: "https://disneyworld.disney.go.com/guest-services/manage-plans/",
  },
  {
    key: "wdw.lightning-lane-planning",
    version: 1,
    title: "Review Lightning Lane purchase eligibility",
    description: "Advisor review: eligible Disney Resort and select hotel guests may purchase beginning 7 days before their stay; other guests generally begin 3 days before their park visit. Confirm the client's eligibility and park-day strategy.",
    eventType: "Booking",
    anchor: "start_date",
    offsetDays: -10,
    clientVisible: false,
    sourceUrl: "https://disneyworld.disney.go.com/lightning-lane-passes/",
  },
  {
    key: "wdw.memory-maker",
    version: 1,
    title: "Decide on Memory Maker advance purchase",
    description: "Review whether the client wants Memory Maker. At the advance-purchase price, photos taken within 3 days of purchase are not included, so complete the decision before that waiting period reaches arrival day.",
    eventType: "Reminder",
    anchor: "start_date",
    offsetDays: -4,
    clientVisible: true,
    sourceUrl: "https://disneyworld.disney.go.com/memory-maker/",
  },
  {
    key: "trip.predeparture",
    version: 1,
    title: "Send pre-departure check-in",
    description: "Scout workflow reminder: confirm final details and answer last-minute client questions.",
    eventType: "Reminder",
    anchor: "start_date",
    offsetDays: -7,
    clientVisible: false,
    sourceUrl: null,
  },
  {
    key: "trip.travel-begins",
    version: 1,
    title: "Travel begins",
    description: "The client's vacation begins today.",
    eventType: "Travel",
    anchor: "start_date",
    offsetDays: 0,
    clientVisible: true,
    sourceUrl: null,
  },
  {
    key: "trip.welcome-home",
    version: 1,
    title: "Welcome home follow-up",
    description: "Scout workflow reminder: welcome the client home, request feedback, and note future travel interests.",
    eventType: "Reminder",
    anchor: "end_date",
    offsetDays: 1,
    clientVisible: false,
    sourceUrl: null,
  },
  {
    key: "wdw.photopass-download",
    version: 1,
    title: "Remind client to download PhotoPass media",
    description: "Disney PhotoPass photos and videos generally expire 45 days after they are taken. Send a reminder while the vacation media should still be available.",
    eventType: "Reminder",
    anchor: "end_date",
    offsetDays: 35,
    clientVisible: true,
    sourceUrl: "https://disneyworld.disney.go.com/memory-maker/",
  },
  {
    key: "trip.commission-follow-up",
    version: 1,
    title: "Review outstanding supplier commission",
    description: "Scout workflow reminder: confirm the supplier commission has been received or begin follow-up.",
    eventType: "Commission",
    anchor: "end_date",
    offsetDays: 30,
    clientVisible: false,
    sourceUrl: null,
  },
] as const;

function shiftIsoDate(value: string, offsetDays: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function generateDisneyTimeline(dates: TripTimelineDates) {
  return DISNEY_TIMELINE_RULES.flatMap((rule) => {
    const anchorDate = dates[rule.anchor];
    if (!anchorDate) return [];

    return [{
      rule_key: rule.key,
      rule_version: rule.version,
      generation_source: "scout" as const,
      anchor_type: rule.anchor,
      offset_days: rule.offsetDays,
      event_type: rule.eventType,
      title: rule.title,
      description: rule.description,
      event_date: shiftIsoDate(anchorDate, rule.offsetDays),
      status: "Upcoming",
      client_visible: rule.clientVisible,
      source_url: rule.sourceUrl,
    }];
  });
}
