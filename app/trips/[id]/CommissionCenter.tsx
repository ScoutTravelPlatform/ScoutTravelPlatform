"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addCommissionAction, deleteCommissionAction, setCommissionReceiptAction, updateCommissionAction } from "../../actions/trip-workspace";

type Commission = {
  id: string;
  trip_id: string;
  supplier: string | null;
  commission_percent: number | string | null;
  expected_commission: number | string | null;
  commission_received: number | string | null;
  expected_pay_date: string | null;
  received_date: string | null;
  status: string | null;
  notes: string | null;
};

type CommissionCenterProps = {
  tripId: string;
  tripValue: number;
  defaultSupplier?: string | null;
  initialCommissions: Commission[];
};

export default function CommissionCenter({
  tripId,
  tripValue,
  defaultSupplier,
  initialCommissions,
}: CommissionCenterProps) {
  const router = useRouter();

  const [commissions, setCommissions] = useState<Commission[]>(
    initialCommissions.map((commission) => ({
      ...commission,
      commission_percent: Number(commission.commission_percent || 0),
      expected_commission: Number(commission.expected_commission || 0),
      commission_received: Number(commission.commission_received || 0),
    }))
  );

  const [supplier, setSupplier] = useState(defaultSupplier ?? "");
  const [commissionPercent, setCommissionPercent] = useState("");
  const [expectedPayDate, setExpectedPayDate] = useState("");
  const [notes, setNotes] = useState("");

  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSupplier, setEditSupplier] = useState("");
  const [editPercent, setEditPercent] = useState("");
  const [editExpectedPayDate, setEditExpectedPayDate] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const calculatedExpectedCommission = useMemo(() => {
    const percentage = Number(commissionPercent || 0);

    if (tripValue <= 0 || percentage <= 0) {
      return 0;
    }

    return tripValue * (percentage / 100);
  }, [commissionPercent, tripValue]);

  const totalExpected = useMemo(() => {
    return commissions.reduce((total, commission) => {
      return total + Number(commission.expected_commission || 0);
    }, 0);
  }, [commissions]);

  const totalReceived = useMemo(() => {
    return commissions.reduce((total, commission) => {
      return total + Number(commission.commission_received || 0);
    }, 0);
  }, [commissions]);

  const totalOutstanding = Math.max(totalExpected - totalReceived, 0);

  const receivedPercentage =
    totalExpected > 0
      ? Math.min(
          Math.round((totalReceived / totalExpected) * 100),
          100
        )
      : 0;

  const progressColor =
    receivedPercentage >= 100
      ? "bg-emerald-500"
      : receivedPercentage > 0
        ? "bg-amber-400"
        : "bg-red-500";

  const progressTextColor =
    receivedPercentage >= 100
      ? "text-emerald-400"
      : receivedPercentage > 0
        ? "text-amber-400"
        : "text-red-400";

  function formatMoney(value: number) {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  }

  function formatDate(value: string | null) {
    if (!value) {
      return "No date added";
    }

    return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function todayDateString() {
    return new Date().toISOString().split("T")[0];
  }

  function getCommissionStatus(commission: Commission) {
    const expected = Number(commission.expected_commission || 0);
    const received = Number(commission.commission_received || 0);

    if (expected > 0 && received >= expected) {
      return "Received";
    }

    if (
      commission.expected_pay_date &&
      commission.expected_pay_date < todayDateString()
    ) {
      return "Overdue";
    }

    if (received > 0) {
      return "Partially Received";
    }

    return commission.status || "Waiting";
  }

  function getStatusClasses(status: string) {
    if (status === "Received") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (status === "Overdue") {
      return "border-red-200 bg-red-50 text-red-700";
    }

    if (status === "Partially Received") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  async function addCommission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");

    const numericPercent = Number(commissionPercent);

    if (!supplier.trim()) {
      setMessage("Enter the supplier name.");
      return;
    }

    if (!numericPercent || numericPercent <= 0) {
      setMessage("Enter a valid commission percentage.");
      return;
    }

    if (tripValue <= 0) {
      setMessage(
        "Add a package value to the booking before calculating commission."
      );
      return;
    }

    setIsSubmitting(true);

    const expectedCommission = Number(
      calculatedExpectedCommission.toFixed(2)
    );

    const { data, error } = await addCommissionAction({
      tripId,
      supplier,
      commissionPercent: numericPercent,
      expectedCommission,
      expectedPayDate,
      notes,
    });

    setIsSubmitting(false);

    if (error || !data) {
      setMessage(error ?? "Scout could not add that commission.");
      return;
    }

    const newCommission: Commission = {
      ...data,
      commission_percent: Number(data.commission_percent || 0),
      expected_commission: Number(data.expected_commission || 0),
      commission_received: Number(data.commission_received || 0),
    };

    setCommissions((currentCommissions) => [
      ...currentCommissions,
      newCommission,
    ]);

    setSupplier(defaultSupplier ?? "");
    setCommissionPercent("");
    setExpectedPayDate("");
    setNotes("");
    setMessage("Commission record added.");

    router.refresh();
  }

  async function markReceived(commission: Commission) {
    setMessage("");
    setUpdatingId(commission.id);

    const expectedCommission = Number(
      commission.expected_commission || 0
    );

    const { data, error } = await setCommissionReceiptAction(
      tripId, commission.id, true, expectedCommission, todayDateString()
    );

    setUpdatingId(null);

    if (error || !data) {
      setMessage(error ?? "Scout could not update that commission.");
      return;
    }

    setCommissions((currentCommissions) =>
      currentCommissions.map((currentCommission) =>
        currentCommission.id === commission.id
          ? {
              ...data,
              commission_percent: Number(
                data.commission_percent || 0
              ),
              expected_commission: Number(
                data.expected_commission || 0
              ),
              commission_received: Number(
                data.commission_received || 0
              ),
            }
          : currentCommission
      )
    );

    setMessage("Commission marked as received.");

    router.refresh();
  }

  async function markWaiting(commission: Commission) {
    setMessage("");
    setUpdatingId(commission.id);

    const { data, error } = await setCommissionReceiptAction(
      tripId, commission.id, false, 0, null
    );

    setUpdatingId(null);

    if (error || !data) {
      setMessage(error ?? "Scout could not update that commission.");
      return;
    }

    setCommissions((currentCommissions) =>
      currentCommissions.map((currentCommission) =>
        currentCommission.id === commission.id
          ? {
              ...data,
              commission_percent: Number(
                data.commission_percent || 0
              ),
              expected_commission: Number(
                data.expected_commission || 0
              ),
              commission_received: Number(
                data.commission_received || 0
              ),
            }
          : currentCommission
      )
    );

    setMessage("Commission marked as waiting.");

    router.refresh();
  }

  function startEditing(commission: Commission) {
    setEditingId(commission.id);
    setEditSupplier(commission.supplier ?? "");
    setEditPercent(String(commission.commission_percent ?? ""));
    setEditExpectedPayDate(commission.expected_pay_date ?? "");
    setEditNotes(commission.notes ?? "");
    setMessage("");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditSupplier("");
    setEditPercent("");
    setEditExpectedPayDate("");
    setEditNotes("");
  }

  async function saveCommission(commission: Commission) {
    setMessage("");

    const numericPercent = Number(editPercent);

    if (!editSupplier.trim()) {
      setMessage("Enter the supplier name.");
      return;
    }

    if (!numericPercent || numericPercent <= 0) {
      setMessage("Enter a valid commission percentage.");
      return;
    }

    setUpdatingId(commission.id);

    const newExpectedCommission = Number(
      (tripValue * (numericPercent / 100)).toFixed(2)
    );

    const currentReceived = Number(
      commission.commission_received || 0
    );

    const { data, error } = await updateCommissionAction(
      commission.id,
      {
        tripId,
        supplier: editSupplier,
        commissionPercent: numericPercent,
        expectedCommission: newExpectedCommission,
        expectedPayDate: editExpectedPayDate,
        notes: editNotes,
      },
      currentReceived
    );

    setUpdatingId(null);

    if (error || !data) {
      setMessage(error ?? "Scout could not update that commission.");
      return;
    }

    setCommissions((currentCommissions) =>
      currentCommissions.map((currentCommission) =>
        currentCommission.id === commission.id
          ? {
              ...data,
              commission_percent: Number(
                data.commission_percent || 0
              ),
              expected_commission: Number(
                data.expected_commission || 0
              ),
              commission_received: Number(
                data.commission_received || 0
              ),
            }
          : currentCommission
      )
    );

    cancelEditing();
    setMessage("Commission record updated.");

    router.refresh();
  }

  async function deleteCommission(commission: Commission) {
    const confirmed = window.confirm(
      `Delete the commission record for "${
        commission.supplier || "this supplier"
      }"?`
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setDeletingId(commission.id);

    const { error } = await deleteCommissionAction(tripId, commission.id);

    setDeletingId(null);

    if (error) {
      setMessage(error);
      return;
    }

    setCommissions((currentCommissions) =>
      currentCommissions.filter(
        (currentCommission) =>
          currentCommission.id !== commission.id
      )
    );

    setMessage("Commission record deleted.");

    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-purple-400">
          Advisor Earnings
        </p>

        <h2 className="mt-2 text-2xl font-bold">
          Commission Center
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Track expected, received, and outstanding commissions.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-[#f6f8f7] p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-slate-600">
              Commission collection progress
            </p>

            <p className={`mt-1 text-lg font-bold ${progressTextColor}`}>
              {receivedPercentage >= 100
                ? "Commission Received"
                : totalReceived > 0
                  ? "Partially Received"
                  : "Waiting on Supplier"}
            </p>
          </div>

          <p className={`text-3xl font-bold ${progressTextColor}`}>
            {receivedPercentage}%
          </p>
        </div>

        <div className="mt-5 h-5 overflow-hidden rounded-full bg-[#edf3f2]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={{
              width: `${
                receivedPercentage === 0 ? 2 : receivedPercentage
              }%`,
            }}
          />
        </div>

        <div className="mt-3 flex justify-between text-xs text-slate-500">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-[#f6f8f7] p-4">
          <p className="text-sm text-slate-600">Trip Value</p>

          <p className="mt-1 text-xl font-bold">
            {formatMoney(tripValue)}
          </p>
        </div>

        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
          <p className="text-sm text-purple-700">
            Expected Commission
          </p>

          <p className="mt-1 text-xl font-bold text-purple-700">
            {formatMoney(totalExpected)}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-700">
            Commission Received
          </p>

          <p className="mt-1 text-xl font-bold text-emerald-400">
            {formatMoney(totalReceived)}
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-700">Outstanding</p>

          <p className="mt-1 text-xl font-bold text-amber-400">
            {formatMoney(totalOutstanding)}
          </p>
        </div>
      </div>

      <form
        onSubmit={addCommission}
        className="mt-8 rounded-2xl border border-slate-200 bg-[#f6f8f7] p-5"
      >
        <h3 className="font-bold">Add Commission Record</h3>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            type="text"
            placeholder="Supplier"
            value={supplier}
            onChange={(event) => setSupplier(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-purple-500"
          />

          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Commission percentage"
            value={commissionPercent}
            onChange={(event) =>
              setCommissionPercent(event.target.value)
            }
            className="rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-purple-500"
          />

          <input
            type="date"
            value={expectedPayDate}
            onChange={(event) =>
              setExpectedPayDate(event.target.value)
            }
            className="rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-purple-500"
          />

          <input
            type="text"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-purple-500"
          />
        </div>

        <div className="mt-4 flex flex-col justify-between gap-3 rounded-xl border border-purple-200 bg-purple-50 p-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-slate-600">
              Calculated expected commission
            </p>

            <p className="mt-1 text-2xl font-bold text-purple-700">
              {formatMoney(calculatedExpectedCommission)}
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-purple-600 px-5 py-3 font-semibold text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Adding..." : "Add Commission"}
          </button>
        </div>
      </form>

      {message && (
        <p className="mt-4 rounded-lg border border-purple-200 bg-purple-50 p-3 text-sm text-purple-800">
          {message}
        </p>
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Commission Records</h3>

          <span className="text-sm text-slate-600">
            {commissions.length} record
            {commissions.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mt-4 space-y-4">
          {commissions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-[#f6f8f7] p-8 text-center">
              <p className="font-semibold">
                No commission records added
              </p>

              <p className="mt-1 text-sm text-slate-600">
                Add a supplier and commission percentage above.
              </p>
            </div>
          ) : (
            commissions.map((commission) => {
              const status = getCommissionStatus(commission);
              const isEditing = editingId === commission.id;

              return (
                <div
                  key={commission.id}
                  className={`rounded-2xl border p-5 ${getStatusClasses(
                    status
                  )}`}
                >
                  {isEditing ? (
                    <div>
                      <h4 className="font-bold">Edit Commission</h4>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <input
                          type="text"
                          value={editSupplier}
                          onChange={(event) =>
                            setEditSupplier(event.target.value)
                          }
                          className="rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 text-slate-900 outline-none focus:border-purple-500"
                        />

                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={editPercent}
                          onChange={(event) =>
                            setEditPercent(event.target.value)
                          }
                          className="rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 text-slate-900 outline-none focus:border-purple-500"
                        />

                        <input
                          type="date"
                          value={editExpectedPayDate}
                          onChange={(event) =>
                            setEditExpectedPayDate(event.target.value)
                          }
                          className="rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 text-slate-900 outline-none focus:border-purple-500"
                        />

                        <input
                          type="text"
                          value={editNotes}
                          placeholder="Notes"
                          onChange={(event) =>
                            setEditNotes(event.target.value)
                          }
                          className="rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 text-slate-900 outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={updatingId === commission.id}
                          onClick={() => saveCommission(commission)}
                          className="rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
                        >
                          {updatingId === commission.id
                            ? "Saving..."
                            : "Save Changes"}
                        </button>

                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="rounded-lg border border-slate-300 bg-[#edf3f2] px-4 py-2 font-semibold text-slate-900 hover:bg-slate-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-lg font-bold text-slate-900">
                            {commission.supplier || "Supplier"}
                          </h4>

                          <span className="rounded-full bg-[#f6f8f7]/60 px-3 py-1 text-xs font-semibold">
                            {status}
                          </span>
                        </div>

                        <p className="mt-3 text-2xl font-bold text-slate-900">
                          {formatMoney(
                            Number(
                              commission.expected_commission || 0
                            )
                          )}
                        </p>

                        <div className="mt-2 space-y-1 text-sm text-slate-700">
                          <p>
                            Rate:{" "}
                            {Number(
                              commission.commission_percent || 0
                            )}
                            %
                          </p>

                          <p>
                            Received:{" "}
                            {formatMoney(
                              Number(
                                commission.commission_received || 0
                              )
                            )}
                          </p>

                          <p>
                            Expected pay date:{" "}
                            {formatDate(
                              commission.expected_pay_date
                            )}
                          </p>

                          {commission.received_date && (
                            <p className="text-emerald-700">
                              Received:{" "}
                              {formatDate(commission.received_date)}
                            </p>
                          )}

                          {commission.notes && (
                            <p>Notes: {commission.notes}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {status === "Received" ? (
                          <button
                            type="button"
                            disabled={updatingId === commission.id}
                            onClick={() => markWaiting(commission)}
                            className="rounded-lg border border-slate-300 bg-[#edf3f2] px-4 py-2 font-semibold text-slate-900 hover:bg-slate-200 disabled:opacity-50"
                          >
                            {updatingId === commission.id
                              ? "Updating..."
                              : "Mark Waiting"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={updatingId === commission.id}
                            onClick={() => markReceived(commission)}
                            className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                          >
                            {updatingId === commission.id
                              ? "Updating..."
                              : "Mark Received"}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => startEditing(commission)}
                          className="rounded-lg border border-slate-300 bg-[#edf3f2] px-4 py-2 font-semibold text-slate-900 hover:bg-slate-200"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          disabled={deletingId === commission.id}
                          onClick={() => deleteCommission(commission)}
                          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          {deletingId === commission.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
