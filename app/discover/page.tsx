import { BottomNav } from "@/components/BottomNav";
import { DiscoverPlayground } from "@/components/discover/DiscoverPlayground";
import "./discover.css";

export default function DiscoverPage() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="wordmark">buddy</div>
        <div className="topbar-note">Explore something</div>
      </header>
      <main className="main discover-main">
        <DiscoverPlayground />
      </main>
      <BottomNav />
    </div>
  );
}
