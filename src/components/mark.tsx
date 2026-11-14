/** Pearl, black diamond, or a gold-rimmed pearl with a ruby heart. Decorative; the name is beside it. */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <g className="mark-pearl">
        <defs>
          <radialGradient id="pearl-fill" cx="38%" cy="32%" r="70%">
            <stop offset="0%" stopColor="#fffdf8" />
            <stop offset="42%" stopColor="#f4d5e4" />
            <stop offset="70%" stopColor="#d7f0e6" />
            <stop offset="100%" stopColor="#e4d4f6" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="22" fill="url(#pearl-fill)" />
        <ellipse cx="24" cy="22" rx="8" ry="5" fill="#fff" opacity="0.85" />
      </g>
      <g className="mark-diamond">
        <polygon points="32,6 54,26 32,58 10,26" fill="#0c0a16" stroke="#efe7ff" strokeWidth="1.4" />
        <polygon points="32,6 54,26 32,28 10,26" fill="#1a1430" />
        <polygon points="32,6 32,28 18,26" fill="#f4edff" opacity="0.85" />
        <polygon points="32,28 54,26 32,58" fill="#6d5cff" opacity="0.55" />
        <polygon points="10,26 32,28 32,58" fill="#9ecbff" opacity="0.35" />
      </g>
      <g className="mark-garden">
        <circle cx="32" cy="34" r="20" fill="#fff6ea" stroke="#c4a15a" strokeWidth="2.2" />
        <path d="M32 44s-8-5-8-10a4.6 4.6 0 0 1 8-2.4 4.6 4.6 0 0 1 8 2.4c0 5-8 10-8 10z" fill="#9d1c34" />
        <ellipse cx="26" cy="26" rx="6" ry="3.5" fill="#fff" opacity="0.8" />
      </g>
    </svg>
  );
}
