import { BottomNav } from "@/components/BottomNav";
import { PlayNav } from "@/components/PlayNav";
import { PracticeSession } from "@/components/PracticeSession";

export default function PracticePage() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="wordmark">buddy</div>
        <div className="topbar-note">Play with words. Build with what you explore.</div>
      </header>
      <main className="main">
        <PlayNav />
        <PracticeSession />
      </main>
      <BottomNav />
    </div>
  );
}
