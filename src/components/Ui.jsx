import { Icon } from "./Icons.jsx";

export function Btn({ children, kind = "primary", className = "", type = "button", ...props }) {
  const kinds = {
    primary: "stamp-ink",
    rose: "stamp-rose",
    leaf: "stamp-leaf",
    ghost: "bg-transparent border-2 border-[var(--line)]",
    danger: "bg-[var(--danger)] text-white border-2 border-[var(--line)]",
  };
  return (
    <button type={type} className={`pressable rounded-2xl px-4 py-3 font-semibold ${kinds[kind] || kinds.primary} ${className}`} {...props}>
      <span className="zoom-inner">{children}</span>
    </button>
  );
}

export function IconBtn({ name, label, onClick, badge, className = "" }) {
  return (
    <button type="button" className={`pressable relative grid h-11 w-11 place-items-center rounded-2xl border-2 border-[var(--line)] bg-[var(--card)] ${className}`} onClick={onClick} aria-label={label}>
      <span className="zoom-inner"><Icon name={name} /></span>
      {badge > 0 && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--rose)] px-1 text-[10px] font-bold text-white">{badge}</span>
      )}
    </button>
  );
}

export function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-sm text-[var(--danger)]">{error}</span> : hint ? <span className="mt-1 block text-sm text-muted">{hint}</span> : null}
    </label>
  );
}

export function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal>
      <div className="stamp w-full max-w-md rounded-3xl p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="display text-2xl leading-none">{title}</h3>
          <button type="button" className="pressable" onClick={onClose} aria-label="Fermer"><span className="zoom-inner"><Icon name="close" /></span></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toasts({ items }) {
  if (!items?.length) return null;
  return (
    <div className="toast-wrap">
      {items.map((t) => (
        <div key={t.id} className="toast text-sm" role="status">{t.msg}</div>
      ))}
    </div>
  );
}

export function Empty({ title, text }) {
  return (
    <div className="stamp rounded-3xl px-5 py-8 text-center">
      <div className="display text-2xl">{title}</div>
      <p className="mt-2 text-sm text-muted">{text}</p>
    </div>
  );
}

export function IllustratedHeader({ text }) {
  return (
    <div className="il-banner">
      <svg className="absolute -right-2 -top-3 h-24 w-24 opacity-80" viewBox="0 0 80 80" aria-hidden>
        <path d="M10 50c10-20 24-24 34-14 6 6 4 14-2 18" fill="none" stroke="var(--leaf)" strokeWidth="2" />
        <path d="M48 28c8 2 12 10 8 16" fill="var(--rose)" opacity="0.85" />
        <circle cx="58" cy="22" r="4" fill="var(--gold)" />
      </svg>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Salon</div>
      <div className="italic-soft relative mt-1 max-w-[16ch] text-[1.7rem] leading-none">{text}</div>
    </div>
  );
}
