import { BottomNav } from "@/components/BottomNav";

const memories = [
  {
    title: "Talking first might help you start writing.",
    body: "A few times, you've chosen to talk through an idea before trying to write it down.",
  },
  {
    title: "Hearing a new word first sometimes helps.",
    body: "When a word is unfamiliar, you've often asked Buddy to say it before trying it yourself.",
  },
  {
    title: "You seem to like making stories.",
    body: "Story-shaped activities have led to some of your longest answers so far.",
  },
];

export default function MePage() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="wordmark">buddy</div>
        <div className="topbar-note">What helps you</div>
      </header>
      <main className="main">
        <header className="page-header">
          <p className="eyebrow">Me</p>
          <h1 className="page-title">Things we're figuring out.</h1>
          <p>Buddy can notice things, but you get to say whether they actually sound like you.</p>
        </header>

        <section className="memory-grid" aria-label="Things Buddy has noticed">
          {memories.map((memory) => (
            <article className="memory-card" key={memory.title}>
              <p className="eyebrow">Buddy has noticed</p>
              <h2>{memory.title}</h2>
              <p>{memory.body}</p>
              <div className="memory-actions">
                <button className="pill-button" type="button">Yes, remember that</button>
                <button className="pill-button" type="button">Not really</button>
                <button className="pill-button" type="button">Not sure yet</button>
              </div>
            </article>
          ))}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
