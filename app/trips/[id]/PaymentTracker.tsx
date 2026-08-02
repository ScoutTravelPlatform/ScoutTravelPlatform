"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addPaymentAction, deletePaymentAction, setPaymentPaidAction, updatePaymentAction } from "../../actions/trip-workspace";

type Payment = {
  id: string;
  trip_id?: string;
  payment_name: string;
  amount: number | string;
  due_date: string | null;
  paid: boolean | null;
  paid_date: string | null;
  payment_method?: string | null;
  notes?: string | null;
};

type PaymentTrackerProps = {
  tripId: string;
  packagePrice: number;
  initialPayments: Payment[];
};

export default function PaymentTracker({
  tripId,
  packagePrice,
  initialPayments,
}: PaymentTrackerProps) {
  const router = useRouter();

  const [payments, setPayments] = useState<Payment[]>(
    initialPayments.map((payment) => ({
      ...payment,
      amount: Number(payment.amount),
      paid: payment.paid === true,
    }))
  );

  const [paymentName, setPaymentName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(
    null
  );
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(
    null
  );

  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(
    null
  );
  const [editPaymentName, setEditPaymentName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

  const tripTotal = Number(packagePrice || 0);

  const totalPaid = useMemo(() => {
    return payments
      .filter((payment) => payment.paid === true)
      .reduce((total, payment) => {
        return total + Number(payment.amount || 0);
      }, 0);
  }, [payments]);

  const totalScheduled = useMemo(() => {
    return payments.reduce((total, payment) => {
      return total + Number(payment.amount || 0);
    }, 0);
  }, [payments]);

  const remainingBalance = Math.max(tripTotal - totalPaid, 0);

  const paymentPercentage =
    tripTotal > 0
      ? Math.min(Math.round((totalPaid / tripTotal) * 100), 100)
      : 0;

  const progressBarColor =
    paymentPercentage >= 100
      ? "bg-emerald-500"
      : paymentPercentage >= 50
        ? "bg-amber-400"
        : "bg-red-500";

  const progressTextColor =
    paymentPercentage >= 100
      ? "text-emerald-400"
      : paymentPercentage >= 50
        ? "text-amber-400"
        : "text-red-400";

  const progressStatus =
    paymentPercentage >= 100
      ? "Fully Paid"
      : paymentPercentage >= 50
        ? "Payment Progressing"
        : "Balance Outstanding";

  function formatMoney(value: number) {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  }

  function formatDate(value: string | null) {
    if (!value) {
      return "No due date";
    }

    return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function getTodayDateString() {
    return new Date().toISOString().split("T")[0];
  }

  function isOverdue(payment: Payment) {
    if (payment.paid || !payment.due_date) {
      return false;
    }

    return payment.due_date < getTodayDateString();
  }

  async function addPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");

    const numericAmount = Number(amount);

    if (!paymentName.trim()) {
      setMessage("Enter a payment name.");
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      setMessage("Enter a valid payment amount.");
      return;
    }

    setIsSubmitting(true);

    const { data, error } = await addPaymentAction({ tripId, paymentName, amount: numericAmount, dueDate });

    setIsSubmitting(false);

    if (error || !data) {
      setMessage(error ?? "Scout could not add that payment.");
      return;
    }

    const newPayment: Payment = {
      ...data,
      payment_name: data.payment_name ?? "Payment",
      amount: Number(data.amount),
      paid: data.paid === true,
    };

    setPayments((currentPayments) =>
      [...currentPayments, newPayment].sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;

        return a.due_date.localeCompare(b.due_date);
      })
    );

    setPaymentName("");
    setAmount("");
    setDueDate("");
    setMessage("Payment added.");

    router.refresh();
  }

  async function togglePaid(payment: Payment) {
    setMessage("");
    setUpdatingPaymentId(payment.id);

    const newPaidStatus = payment.paid !== true;
    const newPaidDate = newPaidStatus ? getTodayDateString() : null;

    const { data, error } = await setPaymentPaidAction(tripId, payment.id, newPaidStatus, newPaidDate);

    setUpdatingPaymentId(null);

    if (error || !data) {
      setMessage(error ?? "Scout could not update that payment.");
      return;
    }

    setPayments((currentPayments) =>
      currentPayments.map((currentPayment) =>
        currentPayment.id === payment.id
          ? {
              ...data,
              payment_name: data.payment_name ?? "Payment",
              amount: Number(data.amount),
              paid: data.paid === true,
            }
          : currentPayment
      )
    );

    setMessage(
      newPaidStatus
        ? "Payment marked as paid."
        : "Payment marked as unpaid."
    );

    router.refresh();
  }

  function startEditing(payment: Payment) {
    setEditingPaymentId(payment.id);
    setEditPaymentName(payment.payment_name);
    setEditAmount(String(payment.amount));
    setEditDueDate(payment.due_date ?? "");
    setMessage("");
  }

  function cancelEditing() {
    setEditingPaymentId(null);
    setEditPaymentName("");
    setEditAmount("");
    setEditDueDate("");
  }

  async function savePayment(paymentId: string) {
    setMessage("");

    const numericAmount = Number(editAmount);

    if (!editPaymentName.trim()) {
      setMessage("Enter a payment name.");
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      setMessage("Enter a valid payment amount.");
      return;
    }

    setUpdatingPaymentId(paymentId);

    const { data, error } = await updatePaymentAction(paymentId, {
      tripId,
      paymentName: editPaymentName,
      amount: numericAmount,
      dueDate: editDueDate,
    });

    setUpdatingPaymentId(null);

    if (error || !data) {
      setMessage(error ?? "Scout could not update that payment.");
      return;
    }

    setPayments((currentPayments) =>
      currentPayments
        .map((currentPayment) =>
          currentPayment.id === paymentId
            ? {
                ...data,
                payment_name: data.payment_name ?? "Payment",
                amount: Number(data.amount),
                paid: data.paid === true,
              }
            : currentPayment
        )
        .sort((a, b) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;

          return a.due_date.localeCompare(b.due_date);
        })
    );

    cancelEditing();
    setMessage("Payment updated.");

    router.refresh();
  }

  async function deletePayment(payment: Payment) {
    const confirmed = window.confirm(
      `Delete the payment "${payment.payment_name}"?`
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setDeletingPaymentId(payment.id);

    const { error } = await deletePaymentAction(tripId, payment.id);

    setDeletingPaymentId(null);

    if (error) {
      setMessage(error);
      return;
    }

    setPayments((currentPayments) =>
      currentPayments.filter(
        (currentPayment) => currentPayment.id !== payment.id
      )
    );

    setMessage("Payment deleted.");

    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-sky-700">
          Booking Finances
        </p>

        <h2 className="mt-2 text-2xl font-bold">Payment Tracker</h2>

        <p className="mt-1 text-sm text-slate-600">
          Track deposits, installments, and final payments.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-[#f6f8f7] p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-slate-600">Payment progress</p>

            <p className={`mt-1 text-lg font-bold ${progressTextColor}`}>
              {progressStatus}
            </p>
          </div>

          <p className={`text-3xl font-bold ${progressTextColor}`}>
            {paymentPercentage}%
          </p>
        </div>

        <div className="mt-5 h-5 overflow-hidden rounded-full bg-[#edf3f2]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressBarColor}`}
            style={{
              width: `${paymentPercentage === 0 ? 2 : paymentPercentage}%`,
            }}
          />
        </div>

        <div className="mt-3 flex justify-between text-xs text-slate-500">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-[#f6f8f7] p-4">
          <p className="text-sm text-slate-600">Trip Total</p>

          <p className="mt-1 text-xl font-bold">
            {formatMoney(tripTotal)}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-700">Paid</p>

          <p className="mt-1 text-xl font-bold text-emerald-400">
            {formatMoney(totalPaid)}
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-700">Remaining</p>

          <p className="mt-1 text-xl font-bold text-amber-400">
            {formatMoney(remainingBalance)}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-[#f6f8f7] px-4 py-3">
        <div className="flex flex-col justify-between gap-1 text-sm sm:flex-row">
          <span className="text-slate-600">
            Payments scheduled
          </span>

          <span className="font-semibold">
            {formatMoney(totalScheduled)}
          </span>
        </div>
      </div>

      <form
        onSubmit={addPayment}
        className="mt-8 rounded-2xl border border-slate-200 bg-[#f6f8f7] p-5"
      >
        <h3 className="font-bold">Add Payment</h3>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            type="text"
            placeholder="Payment name"
            value={paymentName}
            onChange={(event) => setPaymentName(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-sky-500"
          />

          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-sky-500"
          />

          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-sky-500"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-sky-500 p-3 font-semibold text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Adding..." : "Add Payment"}
          </button>
        </div>
      </form>

      {message && (
        <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-700">
          {message}
        </p>
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Payment Schedule</h3>

          <span className="text-sm text-slate-600">
            {payments.length} payment
            {payments.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mt-4 space-y-4">
          {payments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-[#f6f8f7] p-8 text-center">
              <p className="font-semibold">No payments added</p>

              <p className="mt-1 text-sm text-slate-600">
                Add a deposit, installment, or final payment above.
              </p>
            </div>
          ) : (
            payments.map((payment) => {
              const overdue = isOverdue(payment);
              const isEditing = editingPaymentId === payment.id;

              return (
                <div
                  key={payment.id}
                  className={`rounded-2xl border p-5 ${
                    payment.paid
                      ? "border-emerald-200 bg-emerald-50"
                      : overdue
                        ? "border-red-200 bg-red-50"
                        : "border-amber-200 bg-amber-50"
                  }`}
                >
                  {isEditing ? (
                    <div>
                      <h4 className="font-bold">Edit Payment</h4>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <input
                          type="text"
                          value={editPaymentName}
                          onChange={(event) =>
                            setEditPaymentName(event.target.value)
                          }
                          className="rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 outline-none focus:border-sky-500"
                        />

                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={editAmount}
                          onChange={(event) =>
                            setEditAmount(event.target.value)
                          }
                          className="rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 outline-none focus:border-sky-500"
                        />

                        <input
                          type="date"
                          value={editDueDate}
                          onChange={(event) =>
                            setEditDueDate(event.target.value)
                          }
                          className="rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 outline-none focus:border-sky-500"
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={updatingPaymentId === payment.id}
                          onClick={() => savePayment(payment.id)}
                          className="rounded-lg bg-sky-500 px-4 py-2 font-semibold text-white hover:bg-sky-400 disabled:opacity-50"
                        >
                          {updatingPaymentId === payment.id
                            ? "Saving..."
                            : "Save Changes"}
                        </button>

                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="rounded-lg border border-slate-300 bg-[#edf3f2] px-4 py-2 font-semibold hover:bg-slate-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-lg font-bold">
                            {payment.payment_name}
                          </h4>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              payment.paid
                                ? "bg-emerald-100 text-emerald-800"
                                : overdue
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {payment.paid
                              ? "Paid"
                              : overdue
                                ? "Overdue"
                                : "Unpaid"}
                          </span>
                        </div>

                        <p className="mt-3 text-2xl font-bold">
                          {formatMoney(Number(payment.amount || 0))}
                        </p>

                        <p className="mt-1 text-sm text-slate-600">
                          Due: {formatDate(payment.due_date)}
                        </p>

                        {payment.paid_date && (
                          <p className="mt-1 text-sm text-emerald-400">
                            Paid: {formatDate(payment.paid_date)}
                          </p>
                        )}

                        {overdue && (
                          <p className="mt-2 text-sm font-semibold text-red-400">
                            This payment is past due.
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={updatingPaymentId === payment.id}
                          onClick={() => togglePaid(payment)}
                          className={`rounded-lg px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                            payment.paid
                              ? "border border-slate-300 bg-[#edf3f2] hover:bg-slate-200"
                              : "bg-emerald-600 hover:bg-emerald-500"
                          }`}
                        >
                          {updatingPaymentId === payment.id
                            ? "Updating..."
                            : payment.paid
                              ? "Mark Unpaid"
                              : "Mark Paid"}
                        </button>

                        <button
                          type="button"
                          onClick={() => startEditing(payment)}
                          className="rounded-lg border border-slate-300 bg-[#edf3f2] px-4 py-2 font-semibold hover:bg-slate-200"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          disabled={deletingPaymentId === payment.id}
                          onClick={() => deletePayment(payment)}
                          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          {deletingPaymentId === payment.id
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
