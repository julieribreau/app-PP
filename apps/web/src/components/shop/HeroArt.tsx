/** Composition de la vitrine (blocs et formes de la piste B) : décorative, masquée aux lecteurs d'écran. */
export function HeroArt() {
  return (
    <div aria-hidden="true" className="relative h-[440px]">
      <div className="bg-primary absolute top-6 left-0 h-[360px] w-[58%] rounded-[24px]" />
      <div className="bg-secondary absolute top-0 right-0 aspect-square w-[38%] rounded-full" />
      <div className="bg-straw absolute right-[8%] bottom-0 h-[200px] w-[26%] rounded-full" />
      <svg viewBox="0 0 320 160" className="absolute top-[150px] left-[10%] w-[72%]">
        <rect x="10" y="40" width="300" height="80" rx="24" style={{ fill: "var(--cacao)" }} />
        <rect x="10" y="40" width="300" height="26" rx="13" style={{ fill: "var(--peach)" }} />
        {[70, 130, 190, 250].map((cx, i) => (
          <circle
            key={cx}
            cx={cx}
            cy={i % 2 ? 100 : 90}
            r={i % 2 ? 6 : 8}
            style={{ fill: "var(--straw)" }}
          />
        ))}
      </svg>
    </div>
  );
}
