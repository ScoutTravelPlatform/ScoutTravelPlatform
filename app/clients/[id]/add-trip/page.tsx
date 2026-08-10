"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createTripAction } from "../../../actions/bookings";
import { findOrCreateSupplierAction, findOrCreateSupplierPropertyAction, findOrCreateSupplierRoomOptionAction, searchSupplierPropertiesAction, searchSupplierRoomOptionsAction, searchSuppliersAction } from "../../../actions/suppliers";
import CatalogCombobox, { type CatalogOption } from "../../../components/CatalogCombobox";

export default function AddTripPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const clientId = params.id;

  const [tripName, setTripName] = useState("");
  const [destination, setDestination] = useState("");
  const [supplier, setSupplier] = useState("");
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [resortHotel, setResortHotel] = useState("");
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [roomOption, setRoomOption] = useState("");
  const [bookingNumber, setBookingNumber] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [finalPaymentDate, setFinalPaymentDate] = useState("");
  const [packagePrice, setPackagePrice] = useState("");
  const [commissionAmount, setCommissionAmount] = useState("");
  const [adults, setAdults] = useState("1");
  const [children, setChildren] = useState("0");
  const [status, setStatus] = useState("Planning");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function saveTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    if (endDate < startDate) {
      setMessage("The end date cannot be before the start date.");
      setSaving(false);
      return;
    }

    const result = await createTripAction({
      clientId,
      tripName,
      destination,
      supplier,
      resortHotel,
      roomOption,
      bookingNumber,
      startDate,
      endDate,
      finalPaymentDate,
      packagePrice: packagePrice ? Number(packagePrice) : null,
      commissionAmount: commissionAmount ? Number(commissionAmount) : null,
      adults: Number(adults),
      children: Number(children),
      status,
    });

    if (!result.ok) {
      setMessage(result.error);
      setSaving(false);
      return;
    }

    router.refresh();
    router.push(`/clients/${clientId}`);
  }

  return (
    <main className="min-h-screen bg-[#f6f8f7] p-8 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-medium text-sky-700 hover:text-sky-700"
        >
          ← Back to Client
        </button>

        <h1 className="mt-6 text-4xl font-bold">Add Trip</h1>

        <p className="mt-2 text-slate-600">
          Create a complete travel booking for this client.
        </p>

        <form onSubmit={saveTrip} className="mt-8 space-y-8">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold">Trip Information</h2>

            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block font-medium">Trip Name</label>
                <input
                  required
                  value={tripName}
                  onChange={(event) => setTripName(event.target.value)}
                  placeholder="Smith Family Disney Vacation"
                  className="w-full rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">Destination</label>
                <input
                  required
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  placeholder="Walt Disney World"
                  className="w-full rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <CatalogCombobox
                  label="Supplier"
                  value={supplier}
                  placeholder="Disney Destinations"
                  onTextChange={(text) => setSupplier(text)}
                  onSelect={(option: CatalogOption) => {
                    if (option.id !== supplierId) {
                      setResortHotel("");
                      setPropertyId(null);
                      setRoomOption("");
                    }
                    setSupplier(option.name);
                    setSupplierId(option.id);
                  }}
                  search={(query) => searchSuppliersAction(query)}
                  create={(name) => findOrCreateSupplierAction(name)}
                />

                <CatalogCombobox
                  label="Resort or Hotel"
                  value={resortHotel}
                  disabled={!supplierId}
                  placeholder={supplierId ? "Disney's Polynesian Village Resort" : "Choose a supplier first"}
                  onTextChange={(text) => setResortHotel(text)}
                  onSelect={(option: CatalogOption) => {
                    if (option.id !== propertyId) setRoomOption("");
                    setResortHotel(option.name);
                    setPropertyId(option.id);
                  }}
                  search={(query) => searchSupplierPropertiesAction({ supplierId: supplierId ?? "", query })}
                  create={(name) => findOrCreateSupplierPropertyAction({ supplierId: supplierId ?? "", name })}
                />

                <CatalogCombobox
                  label="Room Option"
                  value={roomOption}
                  disabled={!propertyId}
                  placeholder={propertyId ? "Deluxe Studio" : "Choose a resort or hotel first"}
                  onTextChange={(text) => setRoomOption(text)}
                  onSelect={(option: CatalogOption) => setRoomOption(option.name)}
                  search={(query) => searchSupplierRoomOptionsAction({ propertyId: propertyId ?? "", query })}
                  create={(name) => findOrCreateSupplierRoomOptionAction({ propertyId: propertyId ?? "", name })}
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">
                  Booking Number
                </label>
                <input
                  value={bookingNumber}
                  onChange={(event) => setBookingNumber(event.target.value)}
                  placeholder="ABC123456"
                  className="w-full rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold">Travel Dates</h2>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <div>
                <label className="mb-2 block font-medium">Start Date</label>
                <input
                  required
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">End Date</label>
                <input
                  required
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">
                  Final Payment Due
                </label>
                <input
                  type="date"
                  value={finalPaymentDate}
                  onChange={(event) =>
                    setFinalPaymentDate(event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold">Travelers</h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block font-medium">Adults</label>
                <input
                  required
                  min="0"
                  type="number"
                  value={adults}
                  onChange={(event) => setAdults(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">Children</label>
                <input
                  required
                  min="0"
                  type="number"
                  value={children}
                  onChange={(event) => setChildren(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold">Financial Details</h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block font-medium">
                  Package Price
                </label>
                <input
                  min="0"
                  step="0.01"
                  type="number"
                  value={packagePrice}
                  onChange={(event) => setPackagePrice(event.target.value)}
                  placeholder="5874.00"
                  className="w-full rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">
                  Commission Amount
                </label>
                <input
                  min="0"
                  step="0.01"
                  type="number"
                  value={commissionAmount}
                  onChange={(event) =>
                    setCommissionAmount(event.target.value)
                  }
                  placeholder="705.00"
                  className="w-full rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <label className="mb-2 block font-medium">Trip Status</label>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 outline-none focus:border-sky-500"
            >
              <option value="Planning">Planning</option>
              <option value="Booked">Booked</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </section>

          {message && <p className="text-red-400">{message}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-sky-500 px-6 py-4 font-semibold text-white hover:bg-sky-400 disabled:opacity-50"
          >
            {saving ? "Saving Trip..." : "Save Trip"}
          </button>
        </form>
      </div>
    </main>
  );
}
