// One stroke-icon set for the whole UI, so every component draws the same way.
const PATHS = {
  edit: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'],
  clock: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 'M12 7v5l3 2'],
  sparkles: [
    'M12 3l1.8 4.9 4.9 1.8-4.9 1.8L12 16.4l-1.8-4.9-4.9-1.8 4.9-1.8Z',
    'M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z',
  ],
  globe: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 'M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18'],
  mic: ['M9 6a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0Z', 'M5 11a7 7 0 0 0 14 0M12 18v3'],
  volume: ['M11 5 6 9H2v6h4l5 4z', 'M15.5 8.5a5 5 0 0 1 0 7', 'M18.5 5.5a9 9 0 0 1 0 13'],
  download: ['M12 3v12M7 10l5 5 5-5M5 21h14'],
  refresh: ['M3 12a9 9 0 1 0 3-6.7L3 8', 'M3 3v5h5'],
  history: ['M3 12a9 9 0 1 0 3-6.7L3 8', 'M3 3v5h5', 'M12 7v5l3 2'],
  check: ['M5 12l5 5 9-10'],
  translate: ['M4 5h8M8 3v2M6 5c0 4 2.5 7 6 8M10 5c-.5 3-2.5 6-6 8', 'M13 21l4-9 4 9M14.5 18h5'],
  sun: [
    'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  ],
  moon: ['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z'],
  clipboard: ['M9 3h6v4H9Z', 'M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2'],
  text: ['M4 6h16M4 12h10M4 18h7'],
  user: ['M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z', 'M5 21a7 7 0 0 1 14 0'],
  swap: ['M7 7h13l-3-3M17 17H4l3 3'],
  chevron: ['M6 9l6 6 6-6'],
  alert: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 'M12 7.5v5.5M12 16.2v.2'],
};

const FILLED = {
  play: 'M8 5v14l11-7z',
  pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
};

export default function Icon({ name, size = 16, className, strokeWidth = 2 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    className,
    'aria-hidden': true,
    focusable: false,
  };

  if (FILLED[name]) {
    return (
      <svg {...common} fill="currentColor">
        <path d={FILLED[name]} />
      </svg>
    );
  }

  return (
    <svg {...common} fill="none" stroke="currentColor" strokeWidth={strokeWidth}
         strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}
