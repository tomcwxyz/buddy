import Link from "next/link";

export default function NotFound() {
  return (
    <main className="main">
      <section className="hero-panel compact-hero">
        <div className="hero-copy">
          <p className="eyebrow">Hmm.</p>
          <h1 className="page-title">I can't find that bit.</h1>
          <p className="hero-subtitle">Nothing you did wrong. Let's go back to Buddy.</p>
          <p><Link className="text-button" href="/">Back home</Link></p>
        </div>
      </section>
    </main>
  );
}
