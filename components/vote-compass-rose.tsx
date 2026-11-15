/**
 * Decorative compass rose that sits behind a presenter's cut-out on the vote
 * cards: two rings, 32 ticks and a slim north/south needle, drawn as inline SVG
 * so it stays crisp at any card size and inherits the accent colour in both
 * themes.
 *
 * Purely ornamental — aria-hidden, no text, no interaction. Remove this file,
 * the <VoteCompassRose /> in vote-page-content.tsx and the .vote-card-compass
 * rules in globals.css to take it away again.
 */
const TICKS = Array.from({ length: 32 }, (_, index) => {
  const angle = index * 11.25;
  // Longest at the four cardinals (every 90°), medium at the four corners
  // (every 45°), short everywhere else.
  const length = index % 8 === 0 ? 16 : index % 4 === 0 ? 10 : 5;
  return { angle, length };
});

export function VoteCompassRose() {
  return (
    <svg
      className="vote-card-compass"
      viewBox="0 0 200 200"
      aria-hidden="true"
      focusable="false"
    >
      {/* Rings */}
      <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="0.9" />
      <circle cx="100" cy="100" r="78" fill="none" stroke="currentColor" strokeWidth="0.5" />
      <circle
        cx="100"
        cy="100"
        r="46"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeDasharray="1.5 4"
        opacity="0.8"
      />

      {/* Ticks, drawn from the outer ring inwards */}
      <g stroke="currentColor" strokeWidth="0.7" strokeLinecap="butt">
        {TICKS.map(({ angle, length }) => (
          <line
            key={angle}
            x1="100"
            y1="10"
            x2="100"
            y2={10 + length}
            transform={`rotate(${angle} 100 100)`}
            opacity={length > 10 ? 1 : 0.7}
          />
        ))}
      </g>

      {/* Needle: solid north, outlined south, so it reads as a compass even at
          the low opacity the card uses. */}
      <path d="M100 26 L105.5 100 L94.5 100 Z" fill="currentColor" />
      <path
        d="M100 174 L105.5 100 L94.5 100 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <circle cx="100" cy="100" r="3" fill="none" stroke="currentColor" strokeWidth="0.9" />
    </svg>
  );
}