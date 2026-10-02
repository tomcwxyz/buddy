import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { ReadingCompanion } from "@/components/ReadingCompanion";

export default function ReadPage() {
  return (
    <div className="app-shell read-page-shell">
      <header className="topbar">
        <Link href="/" className="wordmark">buddy</Link>
        <div className="topbar-note">Read with me</div>
      </header>
      <main className="main">
        <ReadingCompanion />
      </main>
      <BottomNav />
    </div>
  );
}
