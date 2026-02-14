import { Sparkles } from 'lucide-react';

interface PotentialBadgeProps {
  score: number | null;
}

export default function PotentialBadge({ score }: PotentialBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-400">
      <Sparkles className="h-3 w-3" />
      AI 유망주 {score !== null && `${score}점`}
    </span>
  );
}
