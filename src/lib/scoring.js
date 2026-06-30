const PTS = { major_servicing: 15, major: 5, minor: 2 };

export function calcDeductions(responses, items) {
  return items.reduce((acc, item) => {
    if (responses[item.id]?.result !== 'fail') return acc;
    return acc + PTS[item.cls];
  }, 0);
}

export function calcScore(responses, items) {
  return Math.max(0, 100 - calcDeductions(responses, items));
}

export function calcKpi(score) {
  return parseFloat((score * 0.3).toFixed(1));
}

export function itemDeduction(cls) {
  return PTS[cls] ?? 0;
}
