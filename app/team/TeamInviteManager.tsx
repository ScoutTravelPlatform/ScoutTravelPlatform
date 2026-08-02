"use client";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createTeamInvitationAction, revokeTeamInvitationAction } from "@/app/actions/team";
type Role = "owner"|"admin"|"advisor"|"assistant"|"finance"|"read_only";
type Invite = { invitation_id:string; email:string; role:Role; expires_at:string; created_at:string };
export default function TeamInviteManager({ organizationId, invitations, emailDeliveryConfigured }: { organizationId:string; invitations:Invite[]; emailDeliveryConfigured:boolean }) {
  const linkInput = useRef<HTMLInputElement>(null);
  const router=useRouter(); const [email,setEmail]=useState(""); const [role,setRole]=useState<Role>("advisor"); const [message,setMessage]=useState(""); const [link,setLink]=useState(""); const [pending,setPending]=useState(false);
  async function create(event:FormEvent){event.preventDefault();setPending(true);setMessage("");setLink("");const result=await createTeamInvitationAction({organizationId,email,role});setPending(false);if(result.error)return setMessage(result.error);setEmail("");setLink(`${window.location.origin}/join/${result.token}`);setMessage(result.emailStatus==="sent"?"Invitation email sent. The manual link is also available below until you leave this page.":result.emailStatus==="failed"?"The invitation was created, but email delivery failed. Copy and send the link below.":"Invitation created. Email delivery is not configured yet, so copy and send the link below.");router.refresh();}
  async function revoke(id:string){setMessage("");const result=await revokeTeamInvitationAction(id);setMessage(result.error??"Invitation revoked.");router.refresh();}
  async function copyLink() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(link);
      setMessage("Invitation link copied.");
    } catch {
      linkInput.current?.focus();
      linkInput.current?.select();
      const copied = document.execCommand("copy");
      setMessage(copied ? "Invitation link copied." : "Your browser blocked automatic copying. The full link is selected—press Command+C (Mac) or Ctrl+C (Windows).");
    }
  }
  return <section className="mt-8 rounded-2xl border border-sky-200 bg-sky-50 p-6"><h2 className="text-xl font-bold">Invite an advisor or teammate</h2><p className="mt-2 text-sm text-slate-600">Invitation links expire after seven days and work only for the invited email.</p>{emailDeliveryConfigured?<p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">Email delivery is connected. Scout will email the invitation and also provide a manual link as a backup.</p>:<p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">Email delivery is not connected yet. Create the link, copy it, and send it to the invited person yourself.</p>}<form onSubmit={create} className="mt-5 grid gap-3 md:grid-cols-[1fr_180px_auto]"><input aria-label="Invite email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="advisor@example.com" className="rounded-lg border border-slate-300 bg-white p-3"/><select aria-label="Invitation role" value={role} onChange={e=>setRole(e.target.value as Role)} className="rounded-lg border border-slate-300 bg-white p-3">{(["owner","admin","advisor","assistant","finance","read_only"] as Role[]).map(r=><option key={r} value={r}>{r.replace("_"," ")}</option>)}</select><button disabled={pending} className="rounded-lg bg-sky-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{pending?"Creating…":"Create invite"}</button></form>{message&&<p role="status" className="mt-4 text-sm font-semibold text-slate-700">{message}</p>}{link&&<div className="mt-3 flex gap-2"><input ref={linkInput} aria-label="Invitation link" readOnly value={link} onFocus={event=>event.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border border-sky-300 bg-white p-3 text-sm"/><button type="button" onClick={copyLink} className="rounded-lg border border-sky-300 bg-white px-4 font-semibold text-sky-800">Copy link</button></div>}{invitations.length>0&&<div className="mt-6 border-t border-sky-200 pt-5"><h3 className="font-bold">Pending invitations</h3><div className="mt-3 space-y-2">{invitations.map(i=><div key={i.invitation_id} className="flex flex-col gap-2 rounded-xl bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{i.email}</p><p className="text-xs text-slate-500">{i.role.replace("_"," ")} · expires {new Date(i.expires_at).toLocaleDateString()}</p></div><button type="button" onClick={()=>revoke(i.invitation_id)} className="text-sm font-semibold text-rose-700">Revoke</button></div>)}</div></div>}</section>;
}
