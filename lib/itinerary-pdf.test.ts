import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { createItineraryPdf } from "./itinerary-pdf";

describe("createItineraryPdf", () => {
  it("creates a readable multipage itinerary for a long timeline", async () => {
    const bytes = await createItineraryPdf({
      tripName: "Brown Family Vacation",
      destination: "Walt Disney World",
      clientName: "Jim Brown",
      clientEmail: "jim@example.com",
      startDate: "2026-11-20",
      endDate: "2026-11-30",
      supplier: "Disney",
      resortHotel: "Example Resort",
      bookingNumber: "ABC123",
      items: Array.from({ length: 12 }, (_, index) => ({
        date: index < 6 ? "2026-11-20" : "2026-11-21",
        time: `${String(8 + (index % 6)).padStart(2, "0")}:00`,
        category: index % 2 ? "Dining" : "Park",
        title: `Milestone ${index + 1}`,
        location: "Walt Disney World",
        confirmationNumber: index % 2 ? "ABC123" : null,
        notes: "A client-visible daily plan with enough detail to exercise line wrapping and pagination.",
      })),
    });
    const document = await PDFDocument.load(bytes);
    expect(bytes.slice(0, 4)).toEqual(Uint8Array.from([37, 80, 68, 70]));
    expect(document.getPageCount()).toBeGreaterThan(1);
  });
});
