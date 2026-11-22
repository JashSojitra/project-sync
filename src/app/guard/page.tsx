import type { Metadata } from "next";
import { GuardPortal } from "@/features/guard-portal/GuardPortal";

export const metadata: Metadata = { title: "SYNC · Guard preview" };

export default function GuardPage() {
  return <GuardPortal />;
}
