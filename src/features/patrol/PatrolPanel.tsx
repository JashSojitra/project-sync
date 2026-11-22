"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Button, Chip } from "@/components/ui/primitives";
import { CHECKPOINTS } from "@/lib/demo/patrol";
import { demo, useDemo } from "@/lib/demo/store";
import type { PatrolRun, VerificationMethod } from "@/lib/demo/types";
import { clockLabel, shiftDateLabel } from "@/lib/time";

export function PatrolPanel({ initialShift }: { initialShift: string | null }) {
  const state = useDemo((s) => s);
  const assignments = state.shifts.filter((shift) => shift.guardId === state.portalGuardId && shift.status === "scheduled");
  const [selected, setSelected] = useState(initialShift ?? assignments[0]?.id ?? "");
  const patrol = state.patrols.find((p) => p.status === "active") ?? state.patrols.find((p) => p.shiftId === selected);
  const site = state.sites.find((s) => s.id === patrol?.siteId);
  return (
    <section className="space-y-4 px-5 pt-5">
      <header>
        <h1 className="display text-[1.75rem] text-ink">SYNC Patrol</h1>
        <p className="text-sm text-ink-3">Fictional building walkthrough</p>
      </header>
      {patrol?.status !== "active" && assignments.length > 0 &&
        <label className="block text-sm text-ink-2">Confirmed assignment
          <select value={selected} onChange={(e) => setSelected(e.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-line bg-surface p-2 text-ink">
            {assignments.map((shift) => <option key={shift.id} value={shift.id}>{shiftDateLabel(shift.startMin)} · {state.sites.find((s) => s.id === shift.siteId)?.name}</option>)}
          </select>
        </label>}
      {patrol && site ? <PatrolRunView key={patrol.id} patrol={patrol} siteName={site.name} /> :
        <div className="rounded-2xl border border-line bg-surface p-4">
          {assignments.length > 0 ? <>
            <p className="mb-3 text-sm text-ink-2">Rehearse the five-checkpoint route for your assignment. Patrol events use the demo clock.</p>
            <Button icon="route" className="w-full" onClick={() => demo.startPatrol(selected)}>Start demo patrol</Button>
          </> : <p className="text-sm text-ink-2">Patrol becomes available after a manager confirms an assignment.</p>}
        </div>}
    </section>
  );
}

function PatrolRunView({ patrol, siteName }: { patrol: PatrolRun; siteName: string }) {
  const [mode, setMode] = useState<"guided" | "quick">("guided");
  const completed = patrol.verifications.length;
  const checkpoint = CHECKPOINTS[completed];
  const next = CHECKPOINTS[completed + 1];
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="title text-ink">{siteName}</h2>
        <Chip tone="blue">{completed}/{CHECKPOINTS.length} verified</Chip>
      </div>
      <div role="progressbar" aria-label="Patrol progress" aria-valuemin={0} aria-valuemax={CHECKPOINTS.length} aria-valuenow={completed} className="h-2 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full bg-blue motion-safe:transition-[width]" style={{ width: `${completed / CHECKPOINTS.length * 100}%` }} />
      </div>
      {patrol.status === "complete" ? <p role="status" className="flex items-center gap-2 rounded-xl border border-blue/40 bg-blue-wash p-4 text-blue-ink"><Icon name="check" />Patrol complete</p> : <>
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface p-1" aria-label="Patrol mode">
          {(["guided", "quick"] as const).map((id) => <button type="button" key={id} aria-pressed={mode === id} onClick={() => setMode(id)} className={`min-h-11 rounded-lg text-sm ${mode === id ? "bg-blue text-midnight" : "text-ink-2"}`}>{id === "guided" ? "Guided patrol" : "Quick tap"}</button>)}
        </div>
        {mode === "guided" && <FloorPlan completed={completed} />}
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-xs text-blue-ink">Checkpoint {completed + 1} of {CHECKPOINTS.length}</p>
          <h3 className="title mt-1 text-lg text-ink">{checkpoint.name}</h3>
          <p className="mt-1 text-sm text-ink-2">{checkpoint.instruction}</p>
          {next && <p className="mt-2 text-xs text-ink-3">Next · {next.name}</p>}
          <CheckpointScanner key={checkpoint.id} patrolId={patrol.id} checkpointId={checkpoint.id} />
        </div>
      </>}
      {(mode === "guided" || patrol.status === "complete") && <PatrolActivity patrol={patrol} />}
    </>
  );
}

export function FloorPlan({ completed = 0 }: { completed?: number }) {
  const arrow = useId();
  const [inspected, setInspected] = useState<number | null>(null);
  const selected = inspected === null ? null : CHECKPOINTS[inspected];
  return (
    <figure className="rounded-2xl border border-line bg-surface p-3">
      <svg viewBox="0 0 300 200" className="w-full" role="img" aria-label="Fictional floor plan showing the five checkpoint walking route">
        <defs><marker id={arrow} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="#D8F2FF" /></marker></defs>
        <rect x="20" y="18" width="260" height="167" rx="4" fill="#0C1820" stroke="#426070" strokeWidth="2" />
        <path d="M20 73H227M263 73H280M20 132H39M75 132H280M102 18V73M196 18V73M102 132V185M196 132V185" stroke="#426070" strokeWidth="2" fill="none" />
        <path d="M57 168V103H245V40" stroke="#0297DE" strokeWidth="4" fill="none" />
        <path d="M57 153V132M95 103H120M186 103H210M245 81V62" markerEnd={`url(#${arrow})`} stroke="#D8F2FF" strokeWidth="1.25" fill="none" />
        {CHECKPOINTS.map((point, index) => <g key={point.id}>
          <circle cx={point.x} cy={point.y} r={index === completed ? 15 : 11} fill={index < completed ? "#0297DE" : index === completed ? "#FC734D" : "#02070A"} stroke="#A7C9DC" />
          <text x={point.x} y={point.y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={index <= completed ? "#02070A" : "#EEF3F6"}>{index + 1}</text>
        </g>)}
      </svg>
      <figcaption>
        <div className="grid grid-cols-5 gap-1" aria-label="Inspect checkpoints">
          {CHECKPOINTS.map((checkpoint, index) => <button key={checkpoint.id} type="button" aria-label={checkpoint.name} aria-pressed={inspected === index} onClick={() => setInspected(inspected === index ? null : index)} className="min-h-11 rounded-xl border border-line text-sm text-ink aria-pressed:border-blue">{index + 1}</button>)}
        </div>
        {selected && <p className="mt-2 text-sm text-ink-2">{selected.name} · {selected.instruction}</p>}
      </figcaption>
    </figure>
  );
}

export function PatrolActivity({ patrol }: { patrol: PatrolRun }) {
  return (
    <ol className="divide-y divide-line text-sm">
      {CHECKPOINTS.map((checkpoint) => {
        const verification = patrol.verifications.find((v) => v.checkpointId === checkpoint.id);
        return <li key={checkpoint.id} className="flex flex-wrap items-center justify-between gap-x-3 py-2">
          <span className="flex items-center gap-2 text-ink"><Icon name={verification ? "check" : "pin"} size={15} className={verification ? "text-blue-ink" : "text-ink-3"} />{checkpoint.name}</span>
          <span className="text-xs text-ink-3">{verification ? `${clockLabel(verification.atMin, true)} · ${verification.method === "demo" ? "Simulated" : verification.method.toUpperCase()}` : "Remaining"}</span>
        </li>;
      })}
    </ol>
  );
}

type NfcReader = EventTarget & { scan(options: { signal: AbortSignal }): Promise<void> };
type NfcReadingEvent = Event & { message: { records: { recordType: string; data?: DataView; encoding?: string }[] } };

function CheckpointScanner({ patrolId, checkpointId }: { patrolId: string; checkpointId: string }) {
  const [message, setMessage] = useState("");
  const scan = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const [supportsNfc, setSupportsNfc] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; scan.current?.abort(); };
  }, []);
  const verify = (method: VerificationMethod, payload: string) => {
    if (!mounted.current) return;
    const result = demo.verifyCheckpoint(patrolId, checkpointId, method, payload);
    if (!result.ok) setMessage(result.reason);
  };
  // Evaluate capability after hydration so the server and initial render agree.
  useEffect(() => {
    const timer = setTimeout(() => setSupportsNfc("NDEFReader" in window), 0);
    return () => clearTimeout(timer);
  }, []);

  async function scanQr(file: File) {
    setMessage("Reading QR image…");
    try {
      const { default: jsQR } = await import("jsqr");
      const url = URL.createObjectURL(file);
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas unavailable");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const code = jsQR(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
        if (code) verify("qr", code.data);
        else if (mounted.current) setMessage("No QR code found. Frame the whole code and try again.");
      } finally { URL.revokeObjectURL(url); }
    } catch {
      if (mounted.current) setMessage("Could not read that image. Try a QR photo or use the simulated check.");
    }
  }

  async function scanNfc() {
    const Reader = (window as Window & { NDEFReader?: new () => NfcReader }).NDEFReader;
    if (!Reader) return;
    scan.current?.abort();
    const controller = new AbortController();
    scan.current = controller;
    const reader = new Reader();
    reader.addEventListener("reading", (event) => {
      if (controller.signal.aborted) return;
      const record = (event as NfcReadingEvent).message.records.find((r) => r.recordType === "text" && r.data);
      if (record) verify("nfc", new TextDecoder(record.encoding || "utf-8").decode(record.data));
      else setMessage("No text checkpoint code on this tag.");
    }, { signal: controller.signal });
    reader.addEventListener("readingerror", () => setMessage("Could not read this NFC tag."), { signal: controller.signal });
    try {
      await reader.scan({ signal: controller.signal });
      if (!controller.signal.aborted) setMessage("Hold the phone near the checkpoint’s demo NFC tag.");
    } catch {
      if (!controller.signal.aborted) setMessage("NFC unavailable. Use QR or the simulated check.");
    }
  }

  return (
    <div className="mt-4 space-y-2">
      <Button tone="primary" icon="check" className="w-full" onClick={() => verify("demo", `SYNC:${checkpointId}`)}>Simulate checkpoint</Button>
      <label className="block text-xs text-ink-2">Scan QR from a camera photo or image
        <input type="file" accept="image/*" capture="environment" className="mt-1 block min-h-11 w-full text-xs file:mr-2 file:min-h-11 file:rounded-lg file:border-0 file:bg-surface-3 file:px-3 file:text-ink" onChange={(e) => { const file = e.target.files?.[0]; if (file) void scanQr(file); e.target.value = ""; }} />
      </label>
      <a className="inline-flex min-h-11 items-center text-sm text-blue-ink underline" href={`/checkpoints/${checkpointId}.svg`} target="_blank" rel="noreferrer">Open printable QR for this checkpoint</a>
      {supportsNfc && <Button icon="radio" className="w-full" onClick={() => void scanNfc()}>Read demo NFC tag</Button>}
      {message && <p role="status" className="text-sm text-ink-2">{message}</p>}
    </div>
  );
}
