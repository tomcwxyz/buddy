import { BottomNav } from "@/components/BottomNav";
import { ReadingCompanion } from "@/components/ReadingCompanion";

export default function ReadPage() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="wordmark">buddy</div>
        <div className="topbar-note">Read with me</div>
      </header>
      <main className="main">
        <ReadingCompanion />
      </main>
      <BottomNav />
    </div>
  );
}
