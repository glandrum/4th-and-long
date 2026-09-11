interface GoalpostMarkProps {
  className?: string;
}

export function GoalpostMark({ className }: GoalpostMarkProps) {
  return (
    <svg
      viewBox="0 0 28 42"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Left upright */}
      <line x1="5" y1="2" x2="5" y2="24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Right upright */}
      <line x1="23" y1="2" x2="23" y2="24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Crossbar */}
      <line x1="5" y1="16" x2="23" y2="16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Post down */}
      <line x1="14" y1="16" x2="14" y2="40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
