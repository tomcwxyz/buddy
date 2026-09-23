import { BottomNav } from "@/components/BottomNav";
import { CoasterBuilder } from "@/components/CoasterBuilder";

export default function CoasterPage() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="wordmark">buddy</div>
        <div className="topbar-note">Build something from the words.</div>
      </header>
      <main className="main coaster-main">
        <CoasterBuilder />
      </main>
      <BottomNav />
    </div>
  );
}
