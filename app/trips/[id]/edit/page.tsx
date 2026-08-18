"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";
import { updateTripAction } from "../../../actions/bookings";
import { findOrCreateDestinationAction, findOrCreateSupplierAction, findOrCreateSupplierByDestinationAction, findOrCreateSupplierPropertyAction, findOrCreateSupplierRoomOptionAction, searchDestinationsAction, searchSupplierPropertiesAction, searchSupplierRoomOptionsAction, searchSuppliersAction, searchSuppliersByDestinationAction } from "../../../actions/suppliers";
import CatalogCombobox, { type CatalogOption } from "../../../components/CatalogCombobox";

const supabase = createClient();

export default function EditTripPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const tripId = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [tripName, setTripName] = useState("");
  const [destination, setDestination] = useState("");
  const [destinationId, setDestinationId] = useState<string | null>(null);
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
  const [clientId, setClientId] = useState("");

  useEffect(() => {
    async function loadTrip() {
      setMessage("");

      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .single();

      if (error || !data) {
        setMessage(
          `Could not load trip: ${error?.message ?? "Trip not found."}`
        );
        setLoading(false);
        return;
      }

      setTripName(data.trip_name ?? "");
      setClientId(data.client_id);
      setDestination(data.destination ?? "");
      setSupplier(data.supplier ?? "");
      setResortHotel(data.resort_hotel ?? "");
      setRoomOption(data.room_option ?? "");
      setBookingNumber(data.booking_number ?? "");
      setStartDate(data.start_date ?? "");
      setEndDate(data.end_date ?? "");
      setFinalPaymentDate(data.final_payment_date ?? "");
      setPackagePrice(data.package_price?.toString() ?? "");
      setCommissionAmount(data.commission_amount?.toString() ?? "");
      setAdults((data.adults ?? 1).toString());
      setChildren((data.children ?? 0).toString());
      setStatus(data.status ?? "Planning");

      setLoading(false);
    }

    if (tripId) {
      loadTrip();
    }
  }, [tripId]);

  async function saveTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!tripName.trim() || !destination.trim()) {
      setMessage("Trip name and destination are required.");
      return;
    }

    if (startDate && endDate && endDate < startDate) {
      setMessage("The end date cannot be before the start date.");
      return;
    }

    setSaving(true);

    const result = await updateTripAction(tripId, {
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

    router.push(`/trips/${tripId}`);
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f8f7] text-slate-900">
        Loading trip...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8f7] p-8 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-medium text-sky-700 hover:text-sky-700"
        >
          ← Back to Trip
        </button>

        <h1 className="mt-6 text-4xl font-bold">Edit Trip</h1>

        <form onSubmit={saveTrip} className="mt-8 space-y-6">
          <div>
            <label className="mb-2 block font-medium">Trip Name</label>
            <input
              required
              value={tripName}
              onChange={(event) => setTripName(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-sky-500"
            />
          </div>

          <CatalogCombobox
            label="Destination"
            value={destination}
            onTextChange={(text) => setDestination(text)}
            onSelect={(option: CatalogOption) => {
              if (option.id !== destinationId) {
                setSupplier("");
                setSupplierId(null);
                setResortHotel("");
                setPropertyId(null);
                setRoomOption("");
              }
              setDestination(option.name);
              setDestinationId(option.id);
            }}
            search={(query) => searchDestinationsAction(query)}
            create={(name) => findOrCreateDestinationAction(name)}
          />

          <div className="grid gap-5 md:grid-cols-3">
            <CatalogCombobox
              label="Supplier"
              value={supplier}
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
              search={(query) => destinationId ? searchSuppliersByDestinationAction({ destinationId, query }) : searchSuppliersAction(query)}
              create={(name) => destinationId ? findOrCreateSupplierByDestinationAction({ destinationId, name }) : findOrCreateSupplierAction(name)}
            />

            <CatalogCombobox
              label="Resort or Hotel"
              value={resortHotel}
              disabled={!supplierId && !resortHotel}
              placeholder={supplierId ? undefined : "Choose a supplier first"}
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
              disabled={!propertyId && !roomOption}
              placeholder={propertyId ? undefined : "Choose a resort or hotel first"}
              onTextChange={(text) => setRoomOption(text)}
              onSelect={(option: CatalogOption) => setRoomOption(option.name)}
              search={(query) => searchSupplierRoomOptionsAction({ propertyId: propertyId ?? "", query })}
              create={(name) => findOrCreateSupplierRoomOptionAction({ propertyId: propertyId ?? "", name })}
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">Booking Number</label>
            <input
              value={bookingNumber}
              onChange={(event) => setBookingNumber(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label className="mb-2 block font-medium">Start Date</label>
              <input
                required
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="mb-2 block font-medium">End Date</label>
              <input
                required
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-sky-500"
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
                className="w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-medium">Adults</label>
              <input
                min="0"
                type="number"
                value={adults}
                onChange={(event) => setAdults(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="mb-2 block font-medium">Children</label>
              <input
                min="0"
                type="number"
                value={children}
                onChange={(event) => setChildren(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-medium">Package Price</label>
              <input
                min="0"
                step="0.01"
                type="number"
                value={packagePrice}
                onChange={(event) => setPackagePrice(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="mb-2 block font-medium">Commission</label>
              <input
                min="0"
                step="0.01"
                type="number"
                value={commissionAmount}
                onChange={(event) =>
                  setCommissionAmount(event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block font-medium">Status</label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-sky-500"
            >
              <option value="Planning">Planning</option>
              <option value="Booked">Booked</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {message && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-sky-500 py-4 font-semibold text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </main>
  );
}
