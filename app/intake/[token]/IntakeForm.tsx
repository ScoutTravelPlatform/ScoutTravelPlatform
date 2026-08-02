"use client";

import { FormEvent, useState } from "react";
import {
  deleteClientIntakeCelebrationAction,
  deleteClientIntakeLoyaltyProgramAction,
  deleteClientIntakeTravelerAction,
  submitClientIntakeContactAction,
  submitClientIntakePreferencesAction,
  upsertClientIntakeCelebrationAction,
  upsertClientIntakeLoyaltyProgramAction,
  upsertClientIntakeTravelerAction,
} from "@/app/actions/client-intake";
import type { ClientIntakeProfile } from "@/lib/client-intake";

type Traveler = ClientIntakeProfile["travelers"][number];
type Celebration = ClientIntakeProfile["celebrations"][number];

const relationships = [
  { value: "self", label: "Myself" },
  { value: "spouse", label: "Spouse" },
  { value: "partner", label: "Partner" },
  { value: "child", label: "Child" },
  { value: "parent", label: "Parent" },
  { value: "other", label: "Other" },
];

const emptyTravelerForm = {
  fullName: "", dateOfBirth: "", relationship: "", passportNumber: "", passportCountry: "",
  passportExpiration: "", tsaPrecheckNumber: "", globalEntryNumber: "", dietaryRestrictions: "",
  accessibilityNeeds: "", needsStroller: false,
};
type TravelerForm = typeof emptyTravelerForm;

const emptyLoyaltyForm = { programType: "airline", programName: "", memberNumber: "" };
type LoyaltyForm = typeof emptyLoyaltyForm;

const emptyCelebrationForm = { occasion: "", occasionDate: "", recurringAnnually: true, notes: "" };
type CelebrationForm = typeof emptyCelebrationForm;

export default function IntakeForm({ token, initialProfile }: { token: string; initialProfile: ClientIntakeProfile }) {
  return (
    <div className="space-y-8">
      <ContactSection token={token} initialClient={initialProfile.client} />
      <TravelersSection token={token} initialTravelers={initialProfile.travelers} />
      <PreferencesSection token={token} initialClient={initialProfile.client} />
      <CelebrationsSection token={token} initialCelebrations={initialProfile.celebrations} />
    </div>
  );
}

function Card({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#0f6d78]">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-[#243c57]">{title}</h2>
      <p className="mt-2 max-w-2xl leading-6 text-slate-600">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ContactSection({ token, initialClient }: { token: string; initialClient: ClientIntakeProfile["client"] }) {
  const [form, setForm] = useState({
    firstName: initialClient.first_name,
    lastName: initialClient.last_name,
    phone: initialClient.phone_e164 ?? "",
    addressLine1: initialClient.address_line1 ?? "",
    addressLine2: initialClient.address_line2 ?? "",
    city: initialClient.city ?? "",
    stateProvince: initialClient.state_province ?? "",
    postalCode: initialClient.postal_code ?? "",
    country: initialClient.country ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const result = await submitClientIntakeContactAction(token, form);
    setSaving(false);
    setMessage(result.ok ? "Saved." : result.error ?? "Scout could not save your information.");
  }

  return (
    <Card eyebrow="Step 1" title="You and how to reach you" description="This is already filled in from what your advisor has on file — just confirm or correct it.">
      <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
        <Field label="First name"><input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} className={inputClasses} required /></Field>
        <Field label="Last name"><input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} className={inputClasses} required /></Field>
        <Field label="Mobile phone"><input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(555) 555-1234" className={inputClasses} /></Field>
        <Field label="Email"><input value={initialClient.email} disabled className={`${inputClasses} bg-slate-100 text-slate-500`} /></Field>
        <label className="md:col-span-2 text-sm font-semibold text-slate-700"><span>Address line 1</span><input value={form.addressLine1} onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))} className={`${inputClasses} mt-2 w-full`} /></label>
        <label className="md:col-span-2 text-sm font-semibold text-slate-700"><span>Address line 2</span><input value={form.addressLine2} onChange={(e) => setForm((f) => ({ ...f, addressLine2: e.target.value }))} className={`${inputClasses} mt-2 w-full`} /></label>
        <Field label="City"><input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className={inputClasses} /></Field>
        <Field label="State / Province"><input value={form.stateProvince} onChange={(e) => setForm((f) => ({ ...f, stateProvince: e.target.value }))} className={inputClasses} /></Field>
        <Field label="Postal code"><input value={form.postalCode} onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))} className={inputClasses} /></Field>
        <Field label="Country"><input value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} className={inputClasses} /></Field>
        {message && <p role="status" className="md:col-span-2 rounded-lg border border-[#b8dfe1] bg-[#edf7f7] p-3 text-sm font-semibold text-[#0f6d78]">{message}</p>}
        <div className="md:col-span-2 flex justify-end"><button disabled={saving} className="rounded-xl bg-[#0f6d78] px-6 py-3 font-bold text-white hover:bg-[#0c5963] disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving…" : "Save"}</button></div>
      </form>
    </Card>
  );
}

function computeAge(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age;
}

function TravelersSection({ token, initialTravelers }: { token: string; initialTravelers: Traveler[] }) {
  const [travelers, setTravelers] = useState(initialTravelers);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TravelerForm>(emptyTravelerForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function openAdd() {
    setEditingId(null);
    setForm(emptyTravelerForm);
    setFormOpen(true);
    setMessage("");
  }
  function openEdit(traveler: Traveler) {
    setEditingId(traveler.id);
    setForm({
      fullName: traveler.full_name,
      dateOfBirth: traveler.date_of_birth ?? "",
      relationship: traveler.relationship ?? "",
      passportNumber: traveler.passport_number ?? "",
      passportCountry: traveler.passport_country ?? "",
      passportExpiration: traveler.passport_expiration ?? "",
      tsaPrecheckNumber: traveler.tsa_precheck_number ?? "",
      globalEntryNumber: traveler.global_entry_number ?? "",
      dietaryRestrictions: traveler.dietary_restrictions ?? "",
      accessibilityNeeds: traveler.accessibility_needs ?? "",
      needsStroller: traveler.needs_stroller,
    });
    setFormOpen(true);
    setMessage("");
  }
  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyTravelerForm);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.fullName.trim()) return setMessage("Enter a name for this traveler.");
    setSaving(true);
    setMessage("");
    const result = await upsertClientIntakeTravelerAction(token, { ...form, travelerId: editingId });
    setSaving(false);
    if (!result.data) return setMessage(result.error ?? "Scout could not save that traveler.");
    const saved: Traveler = {
      id: result.data.id,
      full_name: form.fullName,
      date_of_birth: form.dateOfBirth || null,
      relationship: form.relationship || null,
      passport_number: form.passportNumber || null,
      passport_country: form.passportCountry || null,
      passport_expiration: form.passportExpiration || null,
      tsa_precheck_number: form.tsaPrecheckNumber || null,
      global_entry_number: form.globalEntryNumber || null,
      dietary_restrictions: form.dietaryRestrictions || null,
      accessibility_needs: form.accessibilityNeeds || null,
      needs_stroller: form.needsStroller,
      notes: null,
      loyalty_programs: travelers.find((t) => t.id === editingId)?.loyalty_programs ?? [],
    };
    setTravelers((current) => editingId ? current.map((t) => t.id === editingId ? saved : t) : [...current, saved]);
    closeForm();
  }

  async function remove(travelerId: string) {
    if (!window.confirm("Remove this traveler from your profile?")) return;
    const result = await deleteClientIntakeTravelerAction(token, travelerId);
    if (!result.ok) return setMessage(result.error ?? "Scout could not remove that traveler.");
    setTravelers((current) => current.filter((t) => t.id !== travelerId));
  }

  function updateTravelerLoyalty(travelerId: string, loyaltyPrograms: Traveler["loyalty_programs"]) {
    setTravelers((current) => current.map((t) => t.id === travelerId ? { ...t, loyalty_programs: loyaltyPrograms } : t));
  }

  const age = computeAge(form.dateOfBirth);

  return (
    <Card eyebrow="Step 2" title="Who's traveling" description="Add everyone in your party — this helps your advisor plan for kids, documents, and special needs.">
      <div className="space-y-3">
        {travelers.map((traveler) => (
          <div key={traveler.id} className="rounded-xl border border-slate-200 bg-[#f7faf9] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-[#243c57]">{traveler.full_name}{traveler.needs_stroller && <span className="ml-2 rounded-full bg-[#dceff0] px-2 py-0.5 text-xs font-semibold text-[#0f6d78]">Stroller</span>}</p>
                <p className="mt-1 text-sm text-slate-500">{relationships.find((r) => r.value === traveler.relationship)?.label ?? "Traveler"}{traveler.date_of_birth ? ` · born ${traveler.date_of_birth}` : ""}</p>
              </div>
              <div className="flex gap-2 text-sm font-semibold">
                <button type="button" onClick={() => openEdit(traveler)} className="text-[#0f6d78] hover:underline">Edit</button>
                <button type="button" onClick={() => remove(traveler.id)} className="text-slate-500 hover:text-rose-700 hover:underline">Remove</button>
              </div>
            </div>
            <LoyaltyPrograms token={token} traveler={traveler} onChange={(programs) => updateTravelerLoyalty(traveler.id, programs)} />
          </div>
        ))}
        {!travelers.length && <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">No travelers added yet.</p>}
      </div>

      {!formOpen && <button type="button" onClick={openAdd} className="mt-4 rounded-lg bg-[#0f6d78] px-4 py-2 text-sm font-semibold text-white">Add a traveler</button>}

      {formOpen && (
        <form onSubmit={save} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2">
          <p className="text-sm font-semibold text-[#243c57] md:col-span-2">{editingId ? "Edit traveler" : "Add a traveler"}</p>
          <Field label="Full name"><input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} className={inputClasses} required /></Field>
          <Field label="Relationship">
            <select value={form.relationship} onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))} className={inputClasses}>
              <option value="">Choose one</option>
              {relationships.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </Field>
          <Field label="Date of birth"><input type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} className={inputClasses} /></Field>
          {age !== null && age <= 5 && (
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={form.needsStroller} onChange={(e) => setForm((f) => ({ ...f, needsStroller: e.target.checked }))} className="h-4 w-4 rounded border-slate-300" />
              Needs a stroller?
            </label>
          )}
          <Field label="Passport number"><input value={form.passportNumber} onChange={(e) => setForm((f) => ({ ...f, passportNumber: e.target.value }))} className={inputClasses} /></Field>
          <Field label="Passport country"><input value={form.passportCountry} onChange={(e) => setForm((f) => ({ ...f, passportCountry: e.target.value }))} className={inputClasses} /></Field>
          <Field label="Passport expiration"><input type="date" value={form.passportExpiration} onChange={(e) => setForm((f) => ({ ...f, passportExpiration: e.target.value }))} className={inputClasses} /></Field>
          <Field label="TSA PreCheck number"><input value={form.tsaPrecheckNumber} onChange={(e) => setForm((f) => ({ ...f, tsaPrecheckNumber: e.target.value }))} className={inputClasses} /></Field>
          <Field label="Global Entry number"><input value={form.globalEntryNumber} onChange={(e) => setForm((f) => ({ ...f, globalEntryNumber: e.target.value }))} className={inputClasses} /></Field>
          <label className="md:col-span-2 text-sm font-semibold text-slate-700"><span>Dietary restrictions or food allergies</span><textarea value={form.dietaryRestrictions} onChange={(e) => setForm((f) => ({ ...f, dietaryRestrictions: e.target.value }))} rows={2} className={`${inputClasses} mt-2 w-full resize-y`} /></label>
          <label className="md:col-span-2 text-sm font-semibold text-slate-700"><span>Accessibility needs</span><textarea value={form.accessibilityNeeds} onChange={(e) => setForm((f) => ({ ...f, accessibilityNeeds: e.target.value }))} rows={2} className={`${inputClasses} mt-2 w-full resize-y`} /></label>
          {message && <p role="status" className="md:col-span-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{message}</p>}
          <div className="md:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={closeForm} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
            <button disabled={saving} className="rounded-lg bg-[#0f6d78] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : editingId ? "Save changes" : "Add traveler"}</button>
          </div>
        </form>
      )}
      {!formOpen && message && <p role="status" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{message}</p>}
    </Card>
  );
}

function LoyaltyPrograms({ token, traveler, onChange }: { token: string; traveler: Traveler; onChange: (programs: Traveler["loyalty_programs"]) => void }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LoyaltyForm>(emptyLoyaltyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function openAdd() { setEditingId(null); setForm(emptyLoyaltyForm); setFormOpen(true); setMessage(""); }
  function openEdit(program: Traveler["loyalty_programs"][number]) {
    setEditingId(program.id);
    setForm({ programType: program.program_type, programName: program.program_name, memberNumber: program.member_number });
    setFormOpen(true);
    setMessage("");
  }
  function closeForm() { setFormOpen(false); setEditingId(null); setForm(emptyLoyaltyForm); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.programName.trim() || !form.memberNumber.trim()) return setMessage("Enter the program name and member number.");
    setSaving(true);
    setMessage("");
    const result = await upsertClientIntakeLoyaltyProgramAction(token, { ...form, travelerId: traveler.id, programId: editingId });
    setSaving(false);
    if (!result.data) return setMessage(result.error ?? "Scout could not save that loyalty program.");
    const saved = { id: result.data.id, program_type: form.programType, program_name: form.programName, member_number: form.memberNumber };
    const next = editingId ? traveler.loyalty_programs.map((p) => p.id === editingId ? saved : p) : [...traveler.loyalty_programs, saved];
    onChange(next);
    closeForm();
  }

  async function remove(programId: string) {
    const result = await deleteClientIntakeLoyaltyProgramAction(token, programId);
    if (!result.ok) return setMessage(result.error ?? "Scout could not remove that loyalty program.");
    onChange(traveler.loyalty_programs.filter((p) => p.id !== programId));
  }

  return (
    <div className="mt-3 border-t border-slate-200 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Loyalty programs</p>
        {!formOpen && <button type="button" onClick={openAdd} className="text-xs font-semibold text-[#0f6d78] hover:underline">Add loyalty program</button>}
      </div>
      {traveler.loyalty_programs.length > 0 && (
        <ul className="mt-2 space-y-1">
          {traveler.loyalty_programs.map((program) => (
            <li key={program.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
              <span><span className="font-semibold text-[#243c57]">{program.program_name}</span> ({program.program_type}) — {program.member_number}</span>
              <span className="flex gap-2 text-xs font-semibold">
                <button type="button" onClick={() => openEdit(program)} className="text-[#0f6d78] hover:underline">Edit</button>
                <button type="button" onClick={() => remove(program.id)} className="text-slate-500 hover:text-rose-700 hover:underline">Remove</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {formOpen && (
        <form onSubmit={save} className="mt-2 grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-3">
          <select value={form.programType} onChange={(e) => setForm((f) => ({ ...f, programType: e.target.value }))} className={`${inputClasses} text-sm`}>
            {["airline", "hotel", "cruise", "car", "other"].map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <input value={form.programName} onChange={(e) => setForm((f) => ({ ...f, programName: e.target.value }))} placeholder="Program name" className={`${inputClasses} text-sm`} required />
          <input value={form.memberNumber} onChange={(e) => setForm((f) => ({ ...f, memberNumber: e.target.value }))} placeholder="Member number" className={`${inputClasses} text-sm`} required />
          {message && <p role="status" className="sm:col-span-3 text-xs font-semibold text-rose-700">{message}</p>}
          <div className="sm:col-span-3 flex justify-end gap-2">
            <button type="button" onClick={closeForm} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600">Cancel</button>
            <button disabled={saving} className="rounded-lg bg-[#0f6d78] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      )}
    </div>
  );
}

function PreferencesSection({ token, initialClient }: { token: string; initialClient: ClientIntakeProfile["client"] }) {
  const [form, setForm] = useState({
    travelStyle: initialClient.travel_style ?? "",
    roomPreferences: initialClient.room_preferences ?? "",
    favoriteResorts: initialClient.favorite_resorts.join(", "),
    favoriteCruiseLines: initialClient.favorite_cruise_lines.join(", "),
    favoriteAirlines: initialClient.favorite_airlines.join(", "),
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function toList(value: string) { return value.split(",").map((item) => item.trim()).filter(Boolean); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const result = await submitClientIntakePreferencesAction(token, {
      travelStyle: form.travelStyle,
      roomPreferences: form.roomPreferences,
      favoriteResorts: toList(form.favoriteResorts),
      favoriteCruiseLines: toList(form.favoriteCruiseLines),
      favoriteAirlines: toList(form.favoriteAirlines),
    });
    setSaving(false);
    setMessage(result.ok ? "Saved." : result.error ?? "Scout could not save your preferences.");
  }

  return (
    <Card eyebrow="Step 3" title="Your travel preferences" description="Help your advisor tailor recommendations to how you like to travel.">
      <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
        <label className="md:col-span-2 text-sm font-semibold text-slate-700"><span>Travel style</span><input value={form.travelStyle} onChange={(e) => setForm((f) => ({ ...f, travelStyle: e.target.value }))} placeholder="Relaxed, adventurous, luxury, budget-conscious…" className={`${inputClasses} mt-2 w-full`} /></label>
        <label className="md:col-span-2 text-sm font-semibold text-slate-700"><span>Room preferences</span><textarea value={form.roomPreferences} onChange={(e) => setForm((f) => ({ ...f, roomPreferences: e.target.value }))} rows={2} placeholder="Two queen beds, high floor, connecting rooms…" className={`${inputClasses} mt-2 w-full resize-y`} /></label>
        <label className="md:col-span-2 text-sm font-semibold text-slate-700"><span>Favorite resorts (comma-separated)</span><input value={form.favoriteResorts} onChange={(e) => setForm((f) => ({ ...f, favoriteResorts: e.target.value }))} className={`${inputClasses} mt-2 w-full`} /></label>
        <label className="md:col-span-2 text-sm font-semibold text-slate-700"><span>Favorite cruise lines (comma-separated)</span><input value={form.favoriteCruiseLines} onChange={(e) => setForm((f) => ({ ...f, favoriteCruiseLines: e.target.value }))} className={`${inputClasses} mt-2 w-full`} /></label>
        <label className="md:col-span-2 text-sm font-semibold text-slate-700"><span>Airline preferences (comma-separated)</span><input value={form.favoriteAirlines} onChange={(e) => setForm((f) => ({ ...f, favoriteAirlines: e.target.value }))} className={`${inputClasses} mt-2 w-full`} /></label>
        {message && <p role="status" className="md:col-span-2 rounded-lg border border-[#b8dfe1] bg-[#edf7f7] p-3 text-sm font-semibold text-[#0f6d78]">{message}</p>}
        <div className="md:col-span-2 flex justify-end"><button disabled={saving} className="rounded-xl bg-[#0f6d78] px-6 py-3 font-bold text-white hover:bg-[#0c5963] disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving…" : "Save"}</button></div>
      </form>
    </Card>
  );
}

function CelebrationsSection({ token, initialCelebrations }: { token: string; initialCelebrations: Celebration[] }) {
  const [celebrations, setCelebrations] = useState(initialCelebrations);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CelebrationForm>(emptyCelebrationForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function openAdd() { setEditingId(null); setForm(emptyCelebrationForm); setFormOpen(true); setMessage(""); }
  function openEdit(celebration: Celebration) {
    setEditingId(celebration.id);
    setForm({ occasion: celebration.occasion, occasionDate: celebration.occasion_date ?? "", recurringAnnually: celebration.recurring_annually, notes: celebration.notes ?? "" });
    setFormOpen(true);
    setMessage("");
  }
  function closeForm() { setFormOpen(false); setEditingId(null); setForm(emptyCelebrationForm); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.occasion.trim()) return setMessage("Enter what you're celebrating.");
    setSaving(true);
    setMessage("");
    const result = await upsertClientIntakeCelebrationAction(token, { ...form, celebrationId: editingId });
    setSaving(false);
    if (!result.data) return setMessage(result.error ?? "Scout could not save that celebration.");
    const saved: Celebration = { id: result.data.id, occasion: form.occasion, occasion_date: form.occasionDate || null, recurring_annually: form.recurringAnnually, notes: form.notes || null };
    setCelebrations((current) => editingId ? current.map((c) => c.id === editingId ? saved : c) : [...current, saved]);
    closeForm();
  }

  async function remove(celebrationId: string) {
    const result = await deleteClientIntakeCelebrationAction(token, celebrationId);
    if (!result.ok) return setMessage(result.error ?? "Scout could not remove that celebration.");
    setCelebrations((current) => current.filter((c) => c.id !== celebrationId));
  }

  return (
    <Card eyebrow="Step 4" title="Special occasions" description="Birthdays, anniversaries, honeymoons — anything worth celebrating on your trip.">
      <div className="space-y-2">
        {celebrations.map((celebration) => (
          <div key={celebration.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-[#f7faf9] p-4">
            <div>
              <p className="font-semibold text-[#243c57]">{celebration.occasion}</p>
              <p className="mt-1 text-sm text-slate-500">{celebration.occasion_date ?? "No date given"}{celebration.recurring_annually ? " · every year" : ""}</p>
            </div>
            <div className="flex gap-2 text-sm font-semibold">
              <button type="button" onClick={() => openEdit(celebration)} className="text-[#0f6d78] hover:underline">Edit</button>
              <button type="button" onClick={() => remove(celebration.id)} className="text-slate-500 hover:text-rose-700 hover:underline">Remove</button>
            </div>
          </div>
        ))}
        {!celebrations.length && <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">No special occasions added yet.</p>}
      </div>

      {!formOpen && <button type="button" onClick={openAdd} className="mt-4 rounded-lg bg-[#0f6d78] px-4 py-2 text-sm font-semibold text-white">Add an occasion</button>}

      {formOpen && (
        <form onSubmit={save} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2">
          <Field label="Occasion"><input value={form.occasion} onChange={(e) => setForm((f) => ({ ...f, occasion: e.target.value }))} placeholder="Anniversary, birthday, honeymoon…" className={inputClasses} required /></Field>
          <Field label="Date"><input type="date" value={form.occasionDate} onChange={(e) => setForm((f) => ({ ...f, occasionDate: e.target.value }))} className={inputClasses} /></Field>
          <label className="md:col-span-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.recurringAnnually} onChange={(e) => setForm((f) => ({ ...f, recurringAnnually: e.target.checked }))} className="h-4 w-4 rounded border-slate-300" /> This happens every year</label>
          <label className="md:col-span-2 text-sm font-semibold text-slate-700"><span>Notes</span><textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className={`${inputClasses} mt-2 w-full resize-y`} /></label>
          {message && <p role="status" className="md:col-span-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{message}</p>}
          <div className="md:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={closeForm} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
            <button disabled={saving} className="rounded-lg bg-[#0f6d78] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : editingId ? "Save changes" : "Add occasion"}</button>
          </div>
        </form>
      )}
      {!formOpen && message && <p role="status" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{message}</p>}
    </Card>
  );
}

const inputClasses = "mt-2 w-full rounded-xl border border-slate-300 bg-[#f7faf9] px-4 py-3 outline-none focus:border-[#0f6d78]";
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="text-sm font-semibold text-slate-700">{label}</span>{children}</label>; }
