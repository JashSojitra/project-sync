import type { Metadata } from "next";
import { CommandCenter } from "@/features/command-center/CommandCenter";

export const metadata: Metadata = { title: "SYNC · Dispatch" };

export default function DispatchPage() {
  return <CommandCenter />;
}
