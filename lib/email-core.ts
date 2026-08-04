export type EmailDeliveryResult = { status: "sent" | "failed"; providerReference: string | null; errorCode: string | null };

export async function deliverClientEmail(input: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  category: "transactional" | "automation";
  idempotencyKey: string;
  request?: typeof fetch;
}): Promise<EmailDeliveryResult> {
  const response = await (input.request ?? fetch)("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.apiKey}`,
      "content-type": "application/json",
      "idempotency-key": input.idempotencyKey,
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      subject: input.subject,
      html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#0f172a;line-height:1.65">${linkify(escapeHtml(input.text)).replace(/\n/g, "<br>")}</div>`,
      text: input.text,
      tags: [{ name: "category", value: input.category }],
    }),
  });
  const body = await response.json().catch(() => null) as { id?: string; name?: string } | null;
  if (!response.ok || !body?.id) {
    return {
      status: "failed",
      providerReference: null,
      errorCode: body?.name || `http_${response.status}`,
    };
  }
  return { status: "sent", providerReference: body.id, errorCode: null };
}

export async function deliverTeamInvitationEmail(input: { apiKey:string; from:string; appUrl:string; to:string; organizationName:string; role:string; invitationToken:string; request?:typeof fetch }): Promise<EmailDeliveryResult> {
  const joinUrl = `${input.appUrl.replace(/\/$/, "")}/join/${input.invitationToken}`;
  const organization = escapeHtml(input.organizationName);
  const role = escapeHtml(input.role.replace("_", " "));
  const response = await (input.request ?? fetch)("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${input.apiKey}`, "content-type": "application/json", "idempotency-key": `team-invite-${input.invitationToken.slice(0, 32)}` },
    body: JSON.stringify({ from:input.from, to:[input.to], subject:`Join ${input.organizationName} in Scout`, html:`<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#0f172a"><h1>You’re invited to ${organization}</h1><p>You have been invited to join the team as <strong>${role}</strong>.</p><p><a href="${escapeHtml(joinUrl)}" style="display:inline-block;background:#0369a1;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Accept invitation</a></p><p>This private link expires in seven days and works only with the invited email address.</p></div>`, text:`You’re invited to join ${input.organizationName} in Scout as ${input.role.replace("_", " ")}. Accept within seven days: ${joinUrl}`, tags:[{name:"category",value:"team_invitation"}] }),
  });
  const body=await response.json().catch(()=>null) as {id?:string;name?:string}|null;
  if(!response.ok||!body?.id)return {status:"failed",providerReference:null,errorCode:body?.name||`http_${response.status}`};
  return {status:"sent",providerReference:body.id,errorCode:null};
}

function escapeHtml(value:string){return value.replace(/[&<>'"]/g,(character)=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[character]??character);}

// Runs on already-escaped text, so matched URLs are safe to drop straight
// into both the href and the link text without re-escaping.
function linkify(escapedText:string){return escapedText.replace(/https?:\/\/[^\s<]+/g,(url)=>`<a href="${url}" style="color:#0369a1">${url}</a>`);}
