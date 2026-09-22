import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { BottomNav } from "@/components/BottomNav";
import { SpellingImport } from "@/components/SpellingImport";

export default function AddSpellingsPage() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="wordmark" href="/practice"><ArrowLeft size={18} /> buddy</Link>
        <div className="topbar-note">Turn a school list into something useful.</div>
      </header>
      <main className="main">
        <SpellingImport />
      </main>
      <BottomNav />
    </div>
  );
}
