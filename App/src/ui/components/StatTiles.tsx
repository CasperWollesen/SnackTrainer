export interface Stat {
  label: string;
  value: string;
  tone?: 'accent' | 'time' | 'plain';
}

export function StatTiles({ stats }: { stats: Stat[] }) {
  return (
    <div className={`stats${stats.length === 4 ? ' stats--4' : ''}`}>
      {stats.map((s) => (
        <div key={s.label} className={`stat${s.tone && s.tone !== 'plain' ? ` stat--${s.tone}` : ''}`}>
          <span className="stat__label">{s.label}</span>
          <span className="stat__value">{s.value}</span>
        </div>
      ))}
    </div>
  );
}
