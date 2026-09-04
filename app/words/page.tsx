import { BottomNav } from "@/components/BottomNav";

const words = [
  { word: "extraordinary", note: "A long one we broke into two useful parts." },
  { word: "because", note: "One worth seeing again in a few different sentences." },
  { word: "through", note: "A sneaky spelling. Hearing it first seemed useful." },
  { word: "adventure", note: "You knew what it meant before you wanted help reading it." },
];

export default function WordsPage() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="wordmark">buddy</div>
        <div className="topbar-note">Words we've met</div>
      </header>
      <main className="main">
        <header className="page-header">
          <p className="eyebrow">My words</p>
          <h1 className="page-title">Words we've met.</h1>
          <p>Not mistakes. Just interesting words worth another look sometimes.</p>
        </header>

        <section className="word-grid" aria-label="Words Buddy remembers">
          {words.map((item) => (
            <article className="word-panel" key={item.word}>
              <strong>{item.word}</strong>
              <span>{item.note}</span>
            </article>
          ))}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
