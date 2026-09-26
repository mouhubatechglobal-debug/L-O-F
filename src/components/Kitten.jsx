export function Kitten({
  mode = "sit",
  covering = false,
  lookX = 0,
  lookY = 0,
  hop = 0,
  dir = 1,
  className = "",
  style,
}) {
  const walking = mode === "walk";
  const pupil = `translate(${lookX * 2.4}px, ${lookY * 1.8}px)`;
  return (
    <div
      className={`kitten ${walking ? "walking" : "sitting"} ${covering ? "covering" : "blink"} ${mode === "wave" ? "waving" : ""} ${className}`}
      style={style}
      aria-hidden
    >
      <div key={hop} className={hop ? "hop" : ""}>
        <svg viewBox="0 0 200 214" width="108" height="116" style={{ transform: `scaleX(${dir})`, transformOrigin: "center" }}>
          <ellipse className="ground" cx="100" cy="202" rx="36" ry="7" fill="#3A1020" opacity="0.12" />
          {walking ? <WalkBody /> : <SitBody pupil={pupil} wave={mode === "wave"} />}
        </svg>
      </div>
    </div>
  );
}

function SitBody({ pupil, wave }) {
  return (
    <g>
      <path className="tail" d="M146 132c28-4 36-32 16-44" fill="none" stroke="#E7C9A4" strokeWidth="10" strokeLinecap="round" />
      <path className="tail" d="M146 132c28-4 36-32 16-44" fill="none" stroke="#3A1020" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="100" cy="158" rx="42" ry="28" fill="#F8E7D2" stroke="#3A1020" strokeWidth="3" />
      <path d="M58 78 70 36l28 36z" fill="#F8E7D2" stroke="#3A1020" strokeWidth="3" strokeLinejoin="round" />
      <path d="M142 78 130 36 102 72z" fill="#F8E7D2" stroke="#3A1020" strokeWidth="3" strokeLinejoin="round" />
      <path d="M66 64 74 42l16 18z" fill="#F4A8BE" />
      <path d="M134 64 126 42l-16 18z" fill="#F4A8BE" />
      <circle cx="100" cy="96" r="50" fill="#F8E7D2" stroke="#3A1020" strokeWidth="3" />
      <g className="eye-open" style={{ transformOrigin: "80px 92px" }}>
        <ellipse cx="80" cy="92" rx="10" ry="12" fill="#fff" stroke="#3A1020" strokeWidth="2.4" />
        <g style={{ transform: pupil }}>
          <circle cx="82" cy="95" r="5.2" fill="#2A1218" />
          <circle cx="84.5" cy="92" r="1.8" fill="#fff" />
        </g>
      </g>
      <g className="eye-open" style={{ transformOrigin: "120px 92px" }}>
        <ellipse cx="120" cy="92" rx="10" ry="12" fill="#fff" stroke="#3A1020" strokeWidth="2.4" />
        <g style={{ transform: pupil }}>
          <circle cx="122" cy="95" r="5.2" fill="#2A1218" />
          <circle cx="124.5" cy="92" r="1.8" fill="#fff" />
        </g>
      </g>
      <path className="eye-shut" d="M68 94c8 8 16 8 24 0" fill="none" stroke="#3A1020" strokeWidth="3" strokeLinecap="round" />
      <path className="eye-shut" d="M108 94c8 8 16 8 24 0" fill="none" stroke="#3A1020" strokeWidth="3" strokeLinecap="round" />
      <path d="M94 106c3 4 9 4 12 0" fill="none" stroke="#3A1020" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M78 118c10 14 34 14 44 0" fill="none" stroke="#3A1020" strokeWidth="3" strokeLinecap="round" />
      <path d="M92 124c5 5 11 5 16 0" fill="#E23B62" />
      <ellipse cx="62" cy="112" rx="10" ry="6" fill="#F3A0B5" />
      <ellipse cx="138" cy="112" rx="10" ry="6" fill="#F3A0B5" />
      <path d="M48 100h-16M152 100h16M50 110h-12M150 110h12" stroke="#3A1020" strokeWidth="2" strokeLinecap="round" />
      <circle cx="100" cy="146" r="8" fill="#C42B58" stroke="#3A1020" strokeWidth="2" />
      <path d="M100 142c1-1.4 2.6-2 3.8-.6 1 .9.8 2.4 0 4-1.6 2.2-3.2 3-3.8 3s-2.2-.8-3.8-3c-.8-1.6 0-3.1 0-4 1.2-1.4 2.8-.8 3.8.6z" fill="#fff" />
      <ellipse cx="74" cy="178" rx="14" ry="8" fill="#F8E7D2" stroke="#3A1020" strokeWidth="2.6" />
      <ellipse cx="126" cy="178" rx="14" ry="8" fill="#F8E7D2" stroke="#3A1020" strokeWidth="2.6" />
      <g className="cover-paws">
        <ellipse cx="78" cy="92" rx="18" ry="13" fill="#F8E7D2" stroke="#3A1020" strokeWidth="2.6" />
        <ellipse cx="122" cy="92" rx="18" ry="13" fill="#F8E7D2" stroke="#3A1020" strokeWidth="2.6" />
        <circle cx="70" cy="90" r="2.2" fill="#F4A8BE" />
        <circle cx="78" cy="87" r="2.2" fill="#F4A8BE" />
        <circle cx="86" cy="90" r="2.2" fill="#F4A8BE" />
        <circle cx="114" cy="90" r="2.2" fill="#F4A8BE" />
        <circle cx="122" cy="87" r="2.2" fill="#F4A8BE" />
        <circle cx="130" cy="90" r="2.2" fill="#F4A8BE" />
      </g>
      {wave && (
        <g className="wave-paw">
          <ellipse cx="156" cy="128" rx="12" ry="8" fill="#F8E7D2" stroke="#3A1020" strokeWidth="2.4" transform="rotate(-28 156 128)" />
        </g>
      )}
    </g>
  );
}

function WalkBody() {
  return (
    <g>
      <path className="tail" d="M42 104c-22 6-28 28-8 36" fill="none" stroke="#E7C9A4" strokeWidth="10" strokeLinecap="round" />
      <path className="tail" d="M42 104c-22 6-28 28-8 36" fill="none" stroke="#3A1020" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="96" cy="124" rx="46" ry="28" fill="#F8E7D2" stroke="#3A1020" strokeWidth="3" />
      <g className="leg leg-a">
        <rect x="70" y="140" width="12" height="28" rx="6" fill="#F8E7D2" stroke="#3A1020" strokeWidth="2.6" />
      </g>
      <g className="leg leg-b">
        <rect x="108" y="140" width="12" height="28" rx="6" fill="#F8E7D2" stroke="#3A1020" strokeWidth="2.6" />
      </g>
      <circle cx="148" cy="96" r="32" fill="#F8E7D2" stroke="#3A1020" strokeWidth="3" />
      <path d="M128 74 138 48l22 24z" fill="#F8E7D2" stroke="#3A1020" strokeWidth="2.8" strokeLinejoin="round" />
      <path d="M136 66 142 52l12 12z" fill="#F4A8BE" />
      <ellipse cx="160" cy="94" rx="6.5" ry="8" fill="#fff" stroke="#3A1020" strokeWidth="2.2" />
      <circle cx="162" cy="96" r="3.2" fill="#2A1218" />
      <circle cx="163.4" cy="94.4" r="1.2" fill="#fff" />
      <path d="M150 110c8 8 18 5 22-2" fill="none" stroke="#3A1020" strokeWidth="2.8" strokeLinecap="round" />
      <ellipse cx="142" cy="106" rx="6" ry="4" fill="#F3A0B5" />
    </g>
  );
}

export function Petals() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 10 }).map((_, i) => (
        <span
          key={i}
          className="petal"
          style={{
            left: `${8 + ((i * 9) % 84)}%`,
            animationDelay: `${i * 0.35}s`,
            background: i % 2 ? "var(--leaf)" : "var(--rose)",
            opacity: 0.55,
          }}
        />
      ))}
    </div>
  );
}
