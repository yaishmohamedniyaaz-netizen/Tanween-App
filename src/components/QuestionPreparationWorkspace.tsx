import { useJudging } from "../state/store";
import { Icon } from "./Icon";
import { QuestionBuilder } from "./QuestionBuilder";
import { SampleBadge } from "./SampleBadge";

export function QuestionPreparationWorkspace({ onBack }: { onBack: () => void }) {
  const { state } = useJudging();
  const editable = state.competition.status === "draft" && !state.sessionActive && !state.preparedRecitation;
  const count = state.questionDrafts.filter((draft) => draft.competitionId === state.competition.id).length;
  return (
    <main className="question-preparation-page">
      <header className="question-preparation-head">
        <button type="button" className="btn-ghost" onClick={onBack}><Icon name="back" size={15} /> Back to competition setup</button>
        <div><span>Question set</span><h1>Prepare draft questions {state.competition.isSample && <SampleBadge compact />}</h1><p>Work on exact ayah-first passages with the full Mushaf width. Drafts remain separate from official delivery.</p></div>
        <span className="question-preparation-count"><strong>{count}</strong><small>draft{count === 1 ? "" : "s"}</small></span>
      </header>
      <section className="question-preparation-surface">
        <QuestionBuilder editable={editable} />
      </section>
    </main>
  );
}
