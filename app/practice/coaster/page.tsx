import { BottomNav } from "@/components/BottomNav";
import { PlayNav } from "@/components/PlayNav";
import { CoasterBuilder } from "@/components/CoasterBuilder";

export default function CoasterPage() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="wordmark">buddy</div>
        <div className="topbar-note">Your Play world.</div>
      </header>
      <main className="main coaster-main">
        <PlayNav />
        <CoasterBuilder />
      </main>
      <BottomNav />
    </div>
  );
}
