import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import { Activity, navItems, PanelLeft } from './Icons.jsx';

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);
  return <div className="app-shell">
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <NavLink className="brand" to="/" onClick={() => setOpen(false)} aria-label="Go to overview"><span className="brand-mark"><Activity size={20} /></span><span>Pulseboard</span></NavLink>
      <nav>{navItems.map(({ to, label, icon: Icon }) =>
        <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}>
          <Icon size={18} /><span>{label}</span>
        </NavLink>)}</nav>
      <div className="sidebar-foot">
        <div className="engine-state"><span className="live-dot" /><div><b>Monitor engine</b><small>Running continuously</small></div></div>
        <small>Asia/Tbilisi · 7 day retention</small>
      </div>
    </aside>
    {open && <button className="scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <main className="main">
      <button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Open navigation"><PanelLeft size={20} /></button>
      {children}
    </main>
  </div>;
}
