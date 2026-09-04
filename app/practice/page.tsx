import { BottomNav } from "@/components/BottomNav";
import { PracticeSession } from "@/components/PracticeSession";

export default function PracticePage() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="wordmark">buddy</div>
        <div className="topbar-note">A tiny bit of practice.</div>
      </header>
      <main className="main">
        <PracticeSession />
      </main>
      <BottomNav />
    </div>
  );
}
