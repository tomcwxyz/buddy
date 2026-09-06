import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { RecentWordRegressionPack } from "@/components/RecentWordRegressionPack";
import { SoundReviewLab } from "@/components/SoundReviewLab";
import { WordCoverageLab } from "@/components/WordCoverageLab";
import { WordEvaluationLab } from "@/components/WordEvaluationLab";

export default function WordLabPage() {
  return (
    <div className="app-shell word-lab-page">
      <header className="topbar">
        <div className="wordmark">buddy</div>
        <Link href="/" className="word-lab-home">
          <ArrowLeft size={17} /> Back to Buddy
        </Link>
      </header>
      <main className="main">
        <WordEvaluationLab />
        <SoundReviewLab />
        <RecentWordRegressionPack />
        <WordCoverageLab />
      </main>
    </div>
  );
}
