"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Button, Chip } from "@/components/ui/primitives";
import { demo, useDemo } from "@/lib/demo/store";

export function OnboardingPreview({ manager = false }: { manager?: boolean }) {
  const state = useDemo((s) => s);
  const application = state.application;
  const [provider, setProvider] = useState<"Google" | "Microsoft">("Google");
  return (
    <details className="rounded-2xl border border-line p-3.5">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium text-ink"><Icon name="chevronDown" size={16} />{manager ? "Guard onboarding review" : "Guard application preview"}</summary>
      <div className="space-y-3 text-sm text-ink-2">
        <p>Fictional applicant Riley West · simulated sign-in and verification</p>
        {application && <Chip tone={application.status === "approved" ? "blue" : "orange"}>{application.status === "pending" ? "Pending verification" : application.status === "approved" ? "Approved" : "Rejected"}</Chip>}
        {!manager && (!application || application.status === "rejected") &&
          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); demo.submitApplication(provider); }}>
            <label className="block">Sign-in concept
              <select value={provider} onChange={(e) => setProvider(e.target.value as typeof provider)} className="mt-1 block min-h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-ink"><option>Google</option><option>Microsoft</option></select>
            </label>
            <p className="text-xs text-ink-3">Riley applies for the guard role with fictional licence, patrol training and uniform details.</p>
            <Button tone="primary" className="w-full" type="submit">Submit demo application</Button>
          </form>}
        {manager && !application && <p>No application submitted.</p>}
        {manager && application?.status === "pending" && <>
          <p>{application.provider} concept · Demo licence ending 4812 · Patrol training · Standard uniform</p>
          <div className="flex flex-wrap gap-2">
            <Button tone="primary" onClick={() => demo.reviewApplication("approved")}>Approve applicant</Button>
            <Button onClick={() => demo.reviewApplication("rejected")}>Reject applicant</Button>
          </div>
        </>}
        {!manager && (application?.status === "approved" ? <div className="rounded-xl border border-blue/40 bg-blue-wash p-3">
          <p className="text-blue-ink">Orientation access granted</p>
          <p>Training Annex · Check in at the visitor desk with the demo training coordinator.</p>
          <p>Assignment Post Orders open in Mission Mode after a manager approves a shift.</p>
        </div> : <p className="flex items-center gap-2 text-ink-3"><Icon name="lock" size={16} />Applicant orientation is restricted until approval.</p>)}
      </div>
    </details>
  );
}
