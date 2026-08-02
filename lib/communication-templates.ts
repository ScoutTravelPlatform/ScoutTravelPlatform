export type CommunicationMessageType =
  | "general"
  | "payment_reminder"
  | "trip_reminder"
  | "document_reminder"
  | "welcome_home";

export type CommunicationTemplateContext = {
  channel: "email" | "sms";
  messageType: CommunicationMessageType;
  clientFirstName: string;
  tripName: string;
  destination: string;
  startDate: string;
  endDate: string;
  finalPaymentDate: string | null;
  nextPayment: {
    name: string;
    amount: number;
    dueDate: string | null;
  } | null;
};

export function buildCommunicationTemplate(context: CommunicationTemplateContext) {
  const tripDates = `${formatDate(context.startDate)}–${formatDate(context.endDate)}`;
  const greeting = `Hi ${context.clientFirstName},`;
  const signoff = "Warmly,\nYour travel advisor";

  const templates: Record<CommunicationMessageType, { subject: string; body: string }> = {
    general: {
      subject: `An update about ${context.tripName}`,
      body: `${greeting}\n\nI’m checking in with an update about your ${context.destination} trip. Please reply if you have any questions or if there is anything you would like me to review.\n\n${signoff}`,
    },
    payment_reminder: {
      subject: `Payment reminder for ${context.tripName}`,
      body: context.nextPayment
        ? `${greeting}\n\nA friendly reminder that ${context.nextPayment.name} in the amount of ${formatMoney(context.nextPayment.amount)}${context.nextPayment.dueDate ? ` is due ${formatDate(context.nextPayment.dueDate)}` : " is coming due"} for your ${context.tripName} reservation.\n\nPlease let me know when you’re ready, or if you have any questions before the payment is completed.\n\n${signoff}`
        : `${greeting}\n\nA friendly reminder that the final payment for your ${context.tripName} reservation${context.finalPaymentDate ? ` is due ${formatDate(context.finalPaymentDate)}` : " is coming due"}.\n\nPlease let me know if you have any questions.\n\n${signoff}`,
    },
    trip_reminder: {
      subject: `Your ${context.destination} trip is getting closer`,
      body: `${greeting}\n\nYour ${context.tripName} vacation to ${context.destination} is coming up ${tripDates}. I’m reviewing the final details now and will keep you updated as we get closer to departure.\n\nPlease send me any last-minute questions or updates.\n\n${signoff}`,
    },
    document_reminder: {
      subject: `Travel document reminder for ${context.tripName}`,
      body: `${greeting}\n\nAs your ${context.destination} trip approaches, please take a moment to confirm that every traveler has the required identification and travel documents. Keep them somewhere secure and easy to reach on travel day.\n\nReply if you would like help reviewing what is needed.\n\n${signoff}`,
    },
    welcome_home: {
      subject: `Welcome home from ${context.destination}`,
      body: `${greeting}\n\nWelcome home! I hope you had a wonderful time on your ${context.destination} vacation. When you have a moment, I’d love to hear about your favorite parts of the trip and anything that could make your next vacation even better.\n\n${signoff}`,
    },
  };

  const selected = templates[context.messageType];
  if (context.channel === "email") return selected;
  return {
    subject: "",
    body: `Scout Travel: ${selected.body
      .replace(`${greeting}\n\n`, `${greeting} `)
      .replace(/\n\nWarmly,\nYour travel advisor$/, " — Your travel advisor")
      .replace(/\n\n/g, " ")} Reply STOP to opt out.`,
  };
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}
