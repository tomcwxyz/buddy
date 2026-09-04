import Link from "next/link";
import { ArrowUpRight, BookOpenText, Camera, PuzzlePiece } from "@phosphor-icons/react/dist/ssr";
import { BottomNav } from "@/components/BottomNav";
import { BuddyPresence } from "@/components/BuddyPresence";

export default function HomePage() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="wordmark">buddy</div>
        <div className="topbar-note">A calm place to work things out.</div>
      </header>

      <main className="main">
        <section className="home-grid" aria-labelledby="home-title">
          <article className="hero-panel">
            <div className="hero-copy">
              <p className="eyebrow">Hi.</p>
              <h1 className="hero-title" id="home-title">What are we doing?</h1>
              <p className="hero-subtitle">
                You can read, ask me about something, or just work something out with me.
              </p>
            </div>

            <div className="buddy-stage">
              <BuddyPresence />
            </div>
          </article>

          <div className="action-stack">
            <Link href="/read" className="action-card read">
              <div className="action-copy">
                <h2>Read with me</h2>
                <p>Point Buddy at a book or page. Ask when you want help.</p>
              </div>
              <div className="action-icon" aria-hidden="true">
                <BookOpenText size={30} weight="regular" />
              </div>
            </Link>

            <Link href="/help" className="action-card help">
              <div className="action-copy">
                <h2>Help me with something</h2>
                <p>Show me something tricky, or talk it through.</p>
              </div>
              <div className="action-icon" aria-hidden="true">
                <Camera size={30} weight="regular" />
              </div>
            </Link>

            <Link href="/practice" className="action-card words">
              <div className="action-copy">
                <h2>Let's play with words</h2>
                <p>Just three words we've met before. Use whatever kind of help works.</p>
              </div>
              <div className="action-icon" aria-hidden="true">
                <PuzzlePiece size={30} weight="regular" />
              </div>
            </Link>
          </div>
        </section>

        <section className="secondary-row" aria-label="More things to explore">
          <Link href="/discover" className="small-card">
            <h3>Explore something <ArrowUpRight size={18} aria-hidden="true" /></h3>
            <p>Stories, puzzles, ideas and little brain quests.</p>
          </Link>
          <Link href="/me" className="small-card">
            <h3>Things that help me <ArrowUpRight size={18} aria-hidden="true" /></h3>
            <p>See what you've told Buddy and what you are figuring out together.</p>
          </Link>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
