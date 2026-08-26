import type {
  CompetitionDivision,
  Participant,
} from "../types";
import {
  participantContextLabel,
  participantNumberLabel,
} from "../lib/participantPresentation.ts";

export type ParticipantIdentityDensity = "lead" | "row" | "compact";
export type ParticipantNumberPosition = "start" | "end";

export function ParticipantIdentity({
  participant,
  participantCount,
  division,
  density = "row",
  numberPosition = "end",
  className = "",
}: {
  participant: Participant;
  participantCount: number;
  division?: CompetitionDivision;
  density?: ParticipantIdentityDensity;
  numberPosition?: ParticipantNumberPosition;
  className?: string;
}) {
  const context = participantContextLabel(participant, division);

  return (
    <span
      className={`participant-identity is-${density} number-${numberPosition} ${className}`.trim()}
    >
      <span className="participant-identity-copy">
        <strong>{participant.name || "Unnamed"}</strong>
        {context && <small>{context}</small>}
      </span>
      <span className="participant-reference" aria-label={`Participant ${participantNumberLabel(participant.number, participantCount)}`}>
        {participantNumberLabel(participant.number, participantCount)}
      </span>
    </span>
  );
}
