"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Button, Chip } from "@/components/ui/primitives";
import { CERT_LABEL } from "@/lib/demo/selectors";
import type { LngLat, ShiftOpportunity, Site } from "@/lib/demo/types";
import { etaMinutes } from "@/lib/geo";
import { spring } from "@/lib/motion";
import { rangeLabel } from "@/lib/time";

type OfferProps = { offer: ShiftOpportunity; site: Site; position: LngLat };

export function OfferAlert({ offer, site, position, onReview, onDecline }: OfferProps & { onReview: () => void; onDecline: () => void }) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      aria-label="Incoming shift offer"
      initial={{ opacity: 0, y: reduce ? 0 : -32 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduce ? 0 : -16 }}
      transition={spring.ui}
      className="panel absolute inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40 mx-auto max-w-md rounded-2xl border-t-2 border-t-orange p-4 shadow-[var(--shadow-float)] sm:inset-x-6"
    >
      <div role="status">
        <p className="flex items-center gap-2 text-sm font-semibold text-orange-ink"><Icon name="urgent" size={16} /> Incoming shift offer</p>
        <h2 className="title mt-1 text-lg text-ink">{site.name}</h2>
        <p className="text-sm text-ink-2">{offer.role}</p>
        <p className="tnum mt-2 text-sm text-ink-2">{rangeLabel(offer.startMin, offer.endMin)} · Est. {etaMinutes(position, site.position)} min away</p>
        <p className="mt-1 text-sm text-ink-2">{offer.requiredCertifications.map((cert) => CERT_LABEL[cert]).join(", ") || "Standard shift requirements"}</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button onClick={onDecline}>Decline</Button>
        <Button tone="primary" onClick={onReview}>Review</Button>
      </div>
    </motion.section>
  );
}

export function OfferDetails({ offer, site, position, canRespond, onClose, onRespond }: OfferProps & {
  canRespond: boolean;
  onClose: () => void;
  onRespond: (status: "interested" | "passed") => string | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog ref={dialog} aria-labelledby="offer-title" onCancel={onClose}
      className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border border-line bg-surface text-ink backdrop:bg-black/65 sm:inset-0 sm:m-auto sm:w-[min(100%-2rem,32rem)] sm:rounded-2xl">
      <motion.div initial={{ y: reduce ? 0 : 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={spring.ui}
        className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={offer.urgent ? "text-sm text-orange-ink" : "text-sm text-blue-ink"}>{offer.urgent ? "Urgent shift offer" : "Shift opportunity"}</p>
            <h2 id="offer-title" className="title mt-1 text-2xl">{site.name}</h2>
          </div>
          <Button tone="ghost" size="sm" aria-label="Close offer details" onClick={onClose}><Icon name="close" size={18} /></Button>
        </div>
        <p className="mt-2 text-ink-2">{offer.role} · {site.address}</p>
        <dl className="tnum mt-5 grid grid-cols-2 gap-3 border-y border-line py-3 text-sm">
          <div><dt className="text-ink-2">Shift time</dt><dd>{offer.dayLabel} · {rangeLabel(offer.startMin, offer.endMin)}</dd></div>
          <div><dt className="text-ink-2">Travel estimate</dt><dd>{etaMinutes(position, site.position)} min</dd></div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip>Valid licence</Chip>
          {offer.requiredCertifications.map((cert) => <Chip key={cert}>{CERT_LABEL[cert]}</Chip>)}
        </div>
        <p className="mt-4 text-sm text-ink-2">{canRespond ? "The shift is confirmed after manager approval." : "You must be online and available to respond."}</p>
        {error && <p role="alert" className="mt-2 text-sm text-orange-ink">{error}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button disabled={!canRespond} onClick={() => setError(onRespond("passed"))}>Decline</Button>
          <Button disabled={!canRespond} tone="primary" onClick={() => setError(onRespond("interested"))}>Accept offer</Button>
        </div>
      </motion.div>
    </dialog>
  );
}
