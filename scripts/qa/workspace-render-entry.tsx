import { renderToStaticMarkup } from "react-dom/server";
import { ParticipantReviewWorkspace } from "../../src/components/ParticipantReviewWorkspace";
export function renderWorkspace(props: Parameters<typeof ParticipantReviewWorkspace>[0]) {
  return renderToStaticMarkup(<ParticipantReviewWorkspace {...props}/>);
}
