export function localExplanation(question, given, correct) {
  const lines = [];
  if (correct) lines.push(`Correct — the answer is ${question.answer}.`);
  else if (!given) lines.push(`The correct answer is ${question.answer}.`);
  else lines.push(`You answered "${given}", but the correct answer is ${question.answer}.`);
  if (question.steps && question.steps.length) lines.push(...question.steps);
  else lines.push('Work through the problem one operation at a time to see where the difference appears.');
  return lines;
}
