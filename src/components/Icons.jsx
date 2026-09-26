export function Icon({ name, size = 22 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  const paths = {
    home: <><path d="M4 11.5 12 4l8 7.5" /><path d="M7 10.5V20h10v-9.5" /></>,
    lock: <><rect x="6" y="11" width="12" height="8" rx="2" /><path d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11" /></>,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l5 5" /></>,
    users: <><path d="M16 20v-1.2A3.8 3.8 0 0 0 12.2 15H7.8A3.8 3.8 0 0 0 4 18.8V20" /><circle cx="10" cy="8" r="3" /><path d="M20 20v-1.2A3.5 3.5 0 0 0 17 15.2" /><path d="M16 5.2a3 3 0 0 1 0 5.6" /></>,
    heart: <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z" />,
    dots: <><circle cx="12" cy="5" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /><circle cx="12" cy="19" r="1.2" fill="currentColor" /></>,
    chat: <path d="M6 17.5 3.5 20V6.5A2.5 2.5 0 0 1 6 4h12a2.5 2.5 0 0 1 2.5 2.5v8A2.5 2.5 0 0 1 18 17H6z" />,
    user: <><circle cx="12" cy="8" r="3.2" /><path d="M5 19.5v-.8A5 5 0 0 1 10 13.7h4a5 5 0 0 1 5 5v.8" /></>,
    play: <path d="M8 5.5v13l11-6.5-11-6.5z" fill="currentColor" stroke="none" />,
    back: <path d="M15 5 8 12l7 7" />,
    bookmark: <path d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.2L6 20V5.5a1 1 0 0 1 1-1z" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    send: <path d="M4 12 20 4l-6 16-2.5-6.5L4 12z" />,
    pin: <path d="M9 4.5h6l-1 6 3 2v1.5H7V12.5l3-2-1-6zM12 14v5.5" />,
    clock: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4.5l3 2" /></>,
    copy: <><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M5 15.5V6.5A2 2 0 0 1 7 4.5h8" /></>,
    trash: <><path d="M5 7h14" /><path d="M9 7V5h6v2" /><path d="M7.5 7l.8 12h7.4l.8-12" /></>,
      forward: <><path d="M14 7h6v6" /><path d="M20 7l-8.5 8.5a5 5 0 0 1-7 0 5 5 0 0 1 0-7L8 5" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    dice: <><rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="9" cy="9" r="1" fill="currentColor" /><circle cx="15" cy="15" r="1" fill="currentColor" /><circle cx="15" cy="9" r="1" fill="currentColor" /><circle cx="9" cy="15" r="1" fill="currentColor" /></>,
    moon: <path d="M16 3.5A8 8 0 1 0 20.5 14 6.5 6.5 0 0 1 16 3.5z" />,
    sun: <><circle cx="12" cy="12" r="3.5" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4 5.2 18.8" /></>,
    image: <><rect x="4" y="5" width="16" height="14" rx="2" /><path d="m8 15 2.5-3 2 2.2L16 10l4 5" /><circle cx="9" cy="9" r="1" fill="currentColor" /></>,
    globe: <><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c2.2 2.4 3.3 5 3.3 8S14.2 17.6 12 20c-2.2-2.4-3.3-5-3.3-8S9.8 6.4 12 4z" /></>,
    star: <path d="m12 3.8 2.1 4.6 5 .6-3.7 3.4.9 5-4.3-2.4-4.3 2.4.9-5L4.9 9l5-.6L12 3.8z" />,
    check: <path d="m5 12 5 5 9-10" />,
    leaf: <path d="M5 19C5 10 12 5 20 4c0 9-5 15-15 15-1 0-2-.2-2-.2 1.2-1.4 2-3.2 2-4.8" />,
    link: <><path d="M9 12a4 4 0 0 1 4-4h2" /><path d="M15 12a4 4 0 0 1-4 4H9" /><path d="M8 12h8" /></>,
  };
  return <svg {...common}>{paths[name] || paths.star}</svg>;
}

export function LogoMark({ size = 48, className = "" }) {
  return (
    <img
      className={`brand-logo ${className}`.trim()}
      src="/logo-cadre.png"
      width="492"
      height="564"
      alt=""
      decoding="async"
      style={{ width: size, height: "auto", maxWidth: "100%" }}
    />
  );
}
