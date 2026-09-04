import { BottomNav } from "@/components/BottomNav";

const quests = [
  { title: "Three ways across", body: "Can you find three different routes through the same map?" },
  { title: "Fix this playground", body: "Spot what is not working, then redesign it your way." },
  { title: "Teach Buddy something", body: "Pick something you know well and explain how it works." },
];

export default function DiscoverPage() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="wordmark">buddy</div>
        <div className="topbar-note">Explore something</div>
      </header>
      <main className="main">
        <header className="page-header">
          <p className="eyebrow">Brain quests</p>
          <h1 className="page-title">Let's find out what you like.</h1>
          <p>No scores. These are just different ways to think, make, explain and explore.</p>
        </header>

        <section className="word-grid" aria-label="Brain quests">
          {quests.map((quest) => (
            <article className="word-panel" key={quest.title}>
              <strong>{quest.title}</strong>
              <span>{quest.body}</span>
            </article>
          ))}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
