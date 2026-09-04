import { BottomNav } from "@/components/BottomNav";
import { BuddyPresence } from "@/components/BuddyPresence";

export default function HelpPage() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="wordmark">buddy</div>
        <div className="topbar-note">Help me with something</div>
      </header>
      <main className="main">
        <section className="hero-panel compact-hero">
          <div className="hero-copy">
            <p className="eyebrow">Show me or tell me.</p>
            <h1 className="page-title">What's tricky?</h1>
            <p className="hero-subtitle">Take a photo, say what you're stuck on, or just start talking it through.</p>
          </div>
          <div className="buddy-stage">
            <BuddyPresence state="listening" label="I'm listening." />
          </div>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
