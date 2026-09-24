import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertOctagon, ArrowRight, CheckCircle2, Clock3, RadioTower, RotateCw, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import Loading from '../components/Loading.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ServiceAvatar from '../components/ServiceAvatar.jsx';
import IncidentTable from '../components/IncidentTable.jsx';
import { formatDate, metric } from '../utils/format.js';

const summaryCards = (summary) => [
  ['Total services', summary.total_services ?? 0, RadioTower, 'violet'],
  ['Online', summary.online ?? 0, CheckCircle2, 'green'],
  ['Offline', summary.offline ?? 0, AlertOctagon, 'red'],
  ['Open incidents', summary.ongoing_incidents ?? 0, Activity, 'amber'],
  ['Avg. response', metric(summary.average_response_time), Timer, 'blue']
];

function ServiceRow({ service, external = false }) {
  return <Link className="service-row" to={external ? `/external-services/${service.id}` : `/services/${service.id}`}>
    <ServiceAvatar service={service} size="small" /><div><b>{service.name}</b><small>{external ? service.current_message || 'Awaiting first check' : service.address}</small></div>
    <StatusBadge status={service.enabled ? service.current_status : 'DISABLED'} /><span className="row-metric">{external ? formatDate(service.last_checked_at) : metric(service.response_time ?? service.average_latency)}</span><ArrowRight size={15} />
  </Link>;
}

export default function Dashboard() {
  const [data, setData] = useState(null); const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null); const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try { setData(await api.dashboard()); setUpdatedAt(new Date()); setError(''); }
    catch (reason) { setError(reason.message); }
  }, []);
  useEffect(() => { load(); const timer = setInterval(load, 30000); return () => clearInterval(timer); }, [load]);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }
  if (!data) return error ? <div className="empty"><h3>Backend unavailable</h3><p>{error}</p><button className="button secondary" onClick={refresh}>Try again</button></div> : <Loading text="Loading system health…" />;
  const localHour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tbilisi', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  return <section>
    <header className="dashboard-head"><div><span className="eyebrow">System overview</span><h1>Good {localHour < 12 ? 'morning' : localHour < 18 ? 'afternoon' : 'evening'}.</h1><p>Here’s what your infrastructure is doing right now.</p></div><div className={`live-status ${error ? 'disconnected' : ''}`}><span className="live-dot" /><div><b>{error ? 'Connection interrupted' : 'Live monitoring active'}</b><small><Clock3 size={12} /> Updated {formatDate(updatedAt)}</small></div><button className="refresh-button" onClick={refresh} disabled={refreshing} aria-label="Refresh dashboard" title="Refresh dashboard"><RotateCw size={15} className={refreshing ? 'spinning' : ''} /></button></div></header>
    {error && <div className="form-error" role="alert">Could not refresh dashboard: {error}. Showing the last successful update.</div>}
    <div className="summary-grid">{summaryCards(data.summary).map(([label, value, Icon, tone]) => <article className="summary-card" key={label}><span className={`summary-icon ${tone}`}><Icon size={19} /></span><small>{label}</small><strong>{value}</strong></article>)}</div>
    <div className="dashboard-columns">
      <div className="panel"><div className="panel-head"><div><span className="eyebrow">Private network</span><h2>Home services</h2></div><Link to="/home-services">View all <ArrowRight size={14} /></Link></div>
        <div className="rows">{data.homeServices.length ? data.homeServices.map((s) => <ServiceRow key={s.id} service={s} />) : <div className="empty compact">No home services configured.</div>}</div>
      </div>
      <div className="panel"><div className="panel-head"><div><span className="eyebrow">Provider health</span><h2>External services</h2></div><Link to="/external-services">View all <ArrowRight size={14} /></Link></div>
        <div className="rows">{data.externalServices.map((s) => <ServiceRow key={s.id} service={s} external />)}</div>
      </div>
    </div>
    <div className="panel incidents-panel"><div className="panel-head"><div><span className="eyebrow">Availability log</span><h2>Recent incidents</h2></div><Link to="/incidents">Full history <ArrowRight size={14} /></Link></div><IncidentTable incidents={data.recentIncidents} compact /></div>
  </section>;
}
