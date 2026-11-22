import { GuardApp } from "./GuardApp";

export function GuardPortal() {
  return (
    <main className="fixed inset-0 overflow-hidden bg-midnight">
      <GuardApp />
    </main>
  );
}
