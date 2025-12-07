interface ScoreBadgeProps {
  score: number;
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  const getColor = (score: number) => {
    if (score >= 80) return "text-teal-700";
    if (score >= 60) return "text-yellow-700";
    return "text-amber-700";
  };

  const getBgColor = (score: number) => {
    if (score >= 80) return "bg-teal-100";
    if (score >= 60) return "bg-yellow-100";
    return "bg-amber-100";
  };

  return (
    <div
      className={`flex items-center justify-center w-16 h-16 rounded-full ${getBgColor(
        score
      )} border-2 border-current ${getColor(score)}`}
    >
      <div className="text-center">
        <div className="text-xl font-bold">{score}%</div>
        <div className="text-xs font-medium">Fit</div>
      </div>
    </div>
  );
}
