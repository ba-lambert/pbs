/* global React */
const { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext } = React;

// ============================================================
// Icons (small inline SVGs, currentColor)
// Each SVG defaults to 14×14 via attributes — CSS .ico class can override.
// ============================================================
const _S = { width: '14', height: '14' };
const Ico = {
  dashboard: (p) => <svg {..._S} {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>,
  map:       (p) => <svg {..._S} {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4l4-2 4 2 4-2v10l-4 2-4-2-4 2V4z"/><path d="M6 2v12M10 4v12"/></svg>,
  track:     (p) => <svg {..._S} {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2"/><circle cx="8" cy="8" r="5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2"/></svg>,
  bus:       (p) => <svg {..._S} {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="12" height="9" rx="1.5"/><circle cx="5" cy="13" r="1"/><circle cx="11" cy="13" r="1"/><path d="M2 8h12M5 5h6"/></svg>,
  driver:    (p) => <svg {..._S} {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="5" r="2.5"/><path d="M3 14c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5"/></svg>,
  company:   (p) => <svg {..._S} {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="12" height="11"/><path d="M5 7h2M9 7h2M5 10h2M9 10h2M2 6h12"/></svg>,
  trip:      (p) => <svg {..._S} {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="3" cy="8" r="1.5"/><circle cx="13" cy="8" r="1.5"/><path d="M4.5 8h7M7 5l3 3-3 3"/></svg>,
  price:     (p) => <svg {..._S} {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 4H6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H5"/><path d="M8 2v12"/></svg>,
  users:     (p) => <svg {..._S} {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="6" r="2"/><circle cx="12" cy="6" r="1.5"/><path d="M2 14c0-2 1.7-3.5 4-3.5s4 1.5 4 3.5M10 13c.4-1.4 1.5-2.5 3-2.5"/></svg>,
  search:    (p) => <svg {..._S} {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="4.5"/><path d="M11 11l3 3"/></svg>,
  plus:      (p) => <svg {..._S} {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M8 3v10M3 8h10"/></svg>,
  edit:      (p) => <svg {..._S} {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2l3 3-8 8H3v-3z"/></svg>,
  trash:     (p) => <svg {..._S} {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 4h10M6 4V2.5h4V4M5 4l1 10h4l1-10"/></svg>,
  close:     (p) => <svg {..._S} {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 4l8 8M12 4l-8 8"/></svg>,
  filter:    (p) => <svg {..._S} {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12l-4.5 5v4l-3 1V9z"/></svg>,
  more:      (p) => <svg {..._S} {...p} viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="8" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="13" cy="8" r="1.2"/></svg>,
  down:      (p) => <svg {..._S} {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6l4 4 4-4"/></svg>,
  arrow:     (p) => <svg {..._S} {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8h10M9 4l4 4-4 4"/></svg>,
  pin:       (p) => <svg {..._S} {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 14s5-4.5 5-8.5A5 5 0 0 0 3 5.5C3 9.5 8 14 8 14z"/><circle cx="8" cy="6" r="1.7"/></svg>,
  poly:      (p) => <svg {..._S} {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 5l5-3 7 4-2 8-8-1z"/></svg>,
  line:      (p) => <svg {..._S} {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="3" cy="4" r="1.5" fill="currentColor"/><circle cx="13" cy="12" r="1.5" fill="currentColor"/><path d="M4 5l3 4 5 2"/></svg>,
  cursor:    (p) => <svg {..._S} {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 2l3 11 2-4 4-1z"/></svg>,
  signal:    (p) => <svg {..._S} {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 13v-3M7 13V8M11 13V5"/></svg>,
  check:     (p) => <svg {..._S} {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 8.5l3 3 7-7"/></svg>,
  warn:      (p) => <svg {..._S} {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2L1.5 13.5h13z"/><path d="M8 6v4M8 12v.5"/></svg>,
  cog:       (p) => <svg {..._S} {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2.2"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.3 3.3l1.4 1.4M11.3 11.3l1.4 1.4M3.3 12.7l1.4-1.4M11.3 4.7l1.4-1.4"/></svg>,
};

// ============================================================
// Atoms
// ============================================================
function Badge({ tone, live, children, dot, style, className }) {
  const cls = `badge ${tone || ''} ${live ? 'live' : ''} ${className || ''}`;
  return <span className={cls} style={style}>{dot && !live ? <span className="dot" /> : null}{children}</span>;
}

function Avatar({ name, size }) {
  const initials = (name || '?').split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase();
  return <span className={`avatar ${size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : ''}`}>{initials}</span>;
}

function Button({ kind, sm, children, onClick, icon: Icon, type, disabled }) {
  return (
    <button
      type={type || 'button'}
      className={`btn ${kind || ''} ${sm ? 'sm' : ''}`}
      onClick={onClick} disabled={disabled}
    >
      {Icon ? <Icon className="ico" /> : null}{children}
    </button>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="field">
      {label ? <span className="field-label">{label}</span> : null}
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

function Card({ title, sub, action, children, tight, className }) {
  return (
    <div className={`card ${tight ? 'card-tight' : ''} ${className || ''}`}>
      {(title || action) ? (
        <div className="card-head">
          <div>
            {title ? <div className="card-title">{title}</div> : null}
            {sub ? <div className="card-sub">{sub}</div> : null}
          </div>
          {action ? <div style={{marginLeft: 'auto'}}>{action}</div> : null}
        </div>
      ) : null}
      <div className="card-body">{children}</div>
    </div>
  );
}

function Modal({ title, onClose, children, footer, maxWidth }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" style={maxWidth ? {maxWidth} : null} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="btn ghost sm" style={{marginLeft:'auto'}} onClick={onClose}><Ico.close className="ico" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

function Drawer({ title, sub, onClose, children, footer }) {
  return (
    <>
      <div className="drawer-mask" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-head">
          <div style={{flex:1}}>
            <div className="modal-title">{title}</div>
            {sub ? <div className="card-sub" style={{marginTop:3}}>{sub}</div> : null}
          </div>
          <button className="btn ghost sm" onClick={onClose}><Ico.close className="ico" /></button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </>
  );
}

// Toolbar wraps title + filter chips + actions
function Toolbar({ left, right }) {
  return (
    <div className="toolbar">
      {left}
      <div className="grow" />
      {right}
    </div>
  );
}

// Sparkline (path generator)
function Sparkline({ data, height = 32, color }) {
  if (!data || data.length === 0) return null;
  const w = 120, h = height, max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [i * (w / (data.length - 1)), h - ((v - min) / range) * (h - 4) - 2]);
  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const area = `${d} L${w},${h} L0,${h} Z`;
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{width:'100%', height}}>
      <path className="area" d={area} style={color ? {fill: color, opacity:.15} : null} />
      <path d={d} style={color ? {stroke: color} : null} />
    </svg>
  );
}

// helpers
const fmt = {
  rwf: (n) => 'RWF ' + (n||0).toLocaleString('en-US'),
  km:  (n) => (n||0).toFixed(1) + ' km',
  min: (m) => {
    const h = Math.floor(m/60), mm = m%60;
    return (h ? `${h}h ` : '') + (mm ? `${mm}m` : (h ? '' : '0m'));
  },
  hhmm: (h, m) => `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`,
  pct: (n) => Math.round(n) + '%',
};

// Make available globally for sibling babel scripts
Object.assign(window, {
  Ico, Badge, Avatar, Button, Field, Card, Modal, Drawer, Toolbar, Sparkline, fmt
});
