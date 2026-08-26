const OPEN_AGE_GROUP = /\b(open|all ages?|adult|adults)\b/i;

function ageNumbers(label: string): number[] {
  return [...label.matchAll(/\d+(?:\.\d+)?/g)]
    .map((match) => Number(match[0]))
    .filter(Number.isFinite);
}

/**
 * Competition age labels are organizer-authored strings. This comparator keeps
 * the original labels intact while placing numeric youth groups from youngest
 * to oldest. Non-numeric/open groups follow the numeric groups deterministically.
 */
export function compareAgeGroups(left: string, right: string): number {
  const leftLabel = left.trim();
  const rightLabel = right.trim();
  const leftNumbers = ageNumbers(leftLabel);
  const rightNumbers = ageNumbers(rightLabel);
  const leftOpen = OPEN_AGE_GROUP.test(leftLabel);
  const rightOpen = OPEN_AGE_GROUP.test(rightLabel);

  if (leftNumbers.length && rightNumbers.length) {
    const length = Math.max(leftNumbers.length, rightNumbers.length);
    const leftFallback = leftNumbers[leftNumbers.length - 1] ?? 0;
    const rightFallback = rightNumbers[rightNumbers.length - 1] ?? 0;
    for (let index = 0; index < length; index += 1) {
      const difference = (leftNumbers[index] ?? leftFallback) -
        (rightNumbers[index] ?? rightFallback);
      if (difference) return difference;
    }
  } else if (leftNumbers.length !== rightNumbers.length) {
    return leftNumbers.length ? -1 : 1;
  }

  if (leftOpen !== rightOpen) return leftOpen ? 1 : -1;
  return leftLabel.localeCompare(rightLabel, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}
