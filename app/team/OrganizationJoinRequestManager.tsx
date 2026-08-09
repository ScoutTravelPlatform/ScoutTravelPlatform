"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveOrganizationJoinRequestAction, denyOrganizationJoinRequestAction } from "@/app/actions/team";
type Role = "owner"|"admin"|"advisor"|"assistant"|"finance"|"read_only";
type Request = { request_id:string; requester_email:string; created_at:string };
export default function OrganizationJoinRequestManager({ requests }: { requests:Request[] }) {
  const router=useRouter(); const [roles,setRoles]=useState<Record<string,Role>>({}); const [message,setMessage]=useState(""); const [pendingId,setPendingId]=useState("");
  function roleFor(id:string){ return roles[id] ?? "advisor"; }
  async function approve(id:string){ setPendingId(id); setMessage(""); const result=await approveOrganizationJoinRequestAction({ requestId:id, role:roleFor(id) }); setPendingId(""); setMessage(result.error??"Join request approved."); router.refresh(); }
  async function deny(id:string){ setPendingId(id); setMessage(""); const result=await denyOrganizationJoinRequestAction(id); setPendingId(""); setMessage(result.error??"Join request denied."); router.refresh(); }
  if (!requests.length) return null;
  return <section className="mt-8 rounded-2xl border border-sky-200 bg-sky-50 p-6"><h2 className="text-xl font-bold">Pending join requests</h2><p className="mt-2 text-sm text-slate-600">Someone outside your team asked to join this agency. Choose their role to approve, or deny the request.</p>
    {message && <p role="status" className="mt-4 text-sm font-semibold text-slate-700">{message}</p>}
    <div className="mt-5 space-y-2">{requests.map(r=><div key={r.request_id} className="flex flex-col gap-3 rounded-xl bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{r.requester_email}</p><p className="text-xs text-slate-500">Requested {new Date(r.created_at).toLocaleDateString()}</p></div><div className="flex items-center gap-2"><select aria-label="Role" value={roleFor(r.request_id)} onChange={e=>setRoles(current=>({...current,[r.request_id]:e.target.value as Role}))} className="rounded-lg border border-slate-300 bg-white p-2 text-sm">{(["owner","admin","advisor","assistant","finance","read_only"] as Role[]).map(role=><option key={role} value={role}>{role.replace("_"," ")}</option>)}</select><button type="button" disabled={pendingId===r.request_id} onClick={()=>approve(r.request_id)} className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Approve</button><button type="button" disabled={pendingId===r.request_id} onClick={()=>deny(r.request_id)} className="text-sm font-semibold text-rose-700">Deny</button></div></div>)}</div>
  </section>;
}
