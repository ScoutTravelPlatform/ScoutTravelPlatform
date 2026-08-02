import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";

export type ItineraryData = {
  tripName: string;
  destination: string;
  clientName: string;
  clientEmail: string | null;
  startDate: string;
  endDate: string;
  supplier: string | null;
  resortHotel: string | null;
  bookingNumber: string | null;
  items: Array<{
    date: string;
    time: string | null;
    category: string;
    title: string;
    location: string | null;
    confirmationNumber: string | null;
    notes: string | null;
  }>;
};

const PAGE = { width: 612, height: 792, margin: 54 };
const palette = {
  navy: rgb(0.09, 0.16, 0.25),
  blue: rgb(0.07, 0.43, 0.66),
  paleBlue: rgb(0.88, 0.94, 0.97),
  mist: rgb(0.94, 0.96, 0.96),
  gray: rgb(0.35, 0.4, 0.46),
  line: rgb(0.81, 0.85, 0.87),
  white: rgb(1, 1, 1),
};

export async function createItineraryPdf(data: ItineraryData) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page = document.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - PAGE.margin;

  const addPage = () => {
    page = document.addPage([PAGE.width, PAGE.height]);
    y = PAGE.height - PAGE.margin;
    drawBrand(page, bold);
    y -= 38;
  };
  const ensure = (height: number) => { if (y - height < 54) addPage(); };
  const text = (value: string, size = 10, options?: { font?: PDFFont; color?: ReturnType<typeof rgb>; x?: number }) => {
    page.drawText(clean(value), { x: options?.x ?? PAGE.margin, y, size, font: options?.font ?? regular, color: options?.color ?? palette.navy });
    y -= size + 5;
  };
  const wrapped = (value: string, width: number, size = 10, color = palette.gray) => {
    const lines = wrapText(clean(value), regular, size, width);
    ensure(lines.length * (size + 4));
    for (const line of lines) text(line, size, { color });
  };
  const section = (title: string) => {
    ensure(40); y -= 12;
    page.drawText(title.toUpperCase(), { x: PAGE.margin, y, size: 9, font: bold, color: palette.blue });
    y -= 10; page.drawLine({ start: { x: PAGE.margin, y }, end: { x: PAGE.width - PAGE.margin, y }, thickness: 1, color: palette.line }); y -= 18;
  };
  const detail = (label: string, value: string) => {
    ensure(38); text(label.toUpperCase(), 7, { font: bold, color: palette.gray }); text(value, 11, { font: bold }); y -= 5;
  };

  page.drawRectangle({ x: 0, y: PAGE.height - 245, width: PAGE.width, height: 245, color: palette.paleBlue });
  drawBrand(page, bold);
  y = PAGE.height - 116;
  text("TRAVEL ITINERARY", 10, { font: bold, color: palette.blue });
  y -= 7;
  text(data.tripName, 27, { font: bold });
  wrapped(data.destination, PAGE.width - PAGE.margin * 2, 14, palette.gray);
  y -= 10;
  text(`${formatDate(data.startDate)} - ${formatDate(data.endDate)}`, 12, { font: bold });
  y = PAGE.height - 285;

  section("Traveler");
  detail("Prepared for", data.clientName);
  if (data.clientEmail) detail("Email", data.clientEmail);

  section("Reservation");
  detail("Destination", data.destination);
  detail("Supplier", data.supplier || "Not provided");
  detail("Resort or hotel", data.resortHotel || "Not provided");
  detail("Confirmation number", data.bookingNumber || "Not provided");

  section("Your day-by-day plans");
  const days = groupByDate(data.items);
  if (!days.length) {
    wrapped("Your travel advisor is still preparing your daily plans. Check back for parks, dining, activities, and reservation details.", PAGE.width - PAGE.margin * 2, 10);
    y -= 8;
  }
  for (const [date, items] of days) {
    ensure(42);
    page.drawRectangle({ x: PAGE.margin, y: y - 7, width: PAGE.width - PAGE.margin * 2, height: 28, color: palette.paleBlue });
    page.drawText(formatDay(date), { x: PAGE.margin + 12, y: y + 2, size: 11, font: bold, color: palette.navy });
    y -= 40;
    for (const item of items) {
      const meta = [item.location, item.confirmationNumber ? `Confirmation: ${item.confirmationNumber}` : null].filter(Boolean).join("  |  ");
      const noteLines = item.notes ? wrapText(clean(item.notes), regular, 9, 360) : [];
      ensure(46 + noteLines.length * 13);
      page.drawText(formatTime(item.time), { x: PAGE.margin, y, size: 9, font: bold, color: palette.blue });
      page.drawText(clean(item.category).toUpperCase(), { x: PAGE.width - PAGE.margin - 75, y, size: 8, font: bold, color: palette.gray });
      page.drawText(clean(item.title), { x: PAGE.margin + 82, y, size: 11, font: bold, color: palette.navy }); y -= 17;
      if (meta) { page.drawText(clean(meta), { x: PAGE.margin + 82, y, size: 9, font: regular, color: palette.gray }); y -= 13; }
      for (const line of noteLines) { page.drawText(line, { x: PAGE.margin + 82, y, size: 9, font: regular, color: palette.gray }); y -= 13; }
      y -= 12;
    }
    y -= 4;
  }

  const pages = document.getPages();
  pages.forEach((item, index) => {
    item.drawLine({ start: { x: PAGE.margin, y: 38 }, end: { x: PAGE.width - PAGE.margin, y: 38 }, thickness: 0.5, color: palette.line });
    item.drawText("Scout Travel", { x: PAGE.margin, y: 23, size: 8, font: bold, color: palette.blue });
    const label = `Page ${index + 1} of ${pages.length}`;
    item.drawText(label, { x: PAGE.width - PAGE.margin - regular.widthOfTextAtSize(label, 8), y: 23, size: 8, font: regular, color: palette.gray });
  });
  return document.save();
}

function drawBrand(page: PDFPage, font: PDFFont) {
  page.drawText("SCOUT TRAVEL", { x: PAGE.margin, y: PAGE.height - 62, size: 13, font, color: palette.blue });
}

function wrapText(value: string, font: PDFFont, size: number, maxWidth: number) {
  const words = value.split(/\s+/); const lines: string[] = []; let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
    else { if (line) lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function clean(value: string) { return value.replace(/[^\x20-\x7E]/g, "-").replace(/\s+/g, " ").trim(); }
function formatDate(value: string) { return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }); }
function formatDay(value: string) { return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }); }
function formatTime(value: string | null) { if (!value) return "Flexible"; const [hour, minute] = value.split(":").map(Number); const suffix = hour >= 12 ? "PM" : "AM"; return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`; }
function groupByDate(items: ItineraryData["items"]) {
  const groups = new Map<string, ItineraryData["items"]>();
  for (const item of items) { const group = groups.get(item.date) ?? []; group.push(item); groups.set(item.date, group); }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, plans]) => [date, plans.sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"))] as const);
}
