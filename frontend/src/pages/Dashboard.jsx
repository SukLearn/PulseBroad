import { useEffect, useState } from 'react';
import { Activity, AlertOctagon, ArrowRight, CheckCircle2, Clock3, RadioTower, Timer } from 'lucide-react';
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
  useEffect(() => { const load = () => api.dashboard().then(setData).catch((e) => setError(e.message)); load(); const timer = setInterval(load, 30000); return () => clearInterval(timer); }, []);
  if (!data) return error ? <div className="empty"><h3>Backend unavailable</h3><p>{error}</p></div> : <Loading text="Loading system health…" />;
  return <section>
    <header className="dashboard-head"><div><span className="eyebrow">System overview</span><h1>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}.</h1><p>Here’s what your infrastructure is doing right now.</p></div><div className="live-status"><span className="live-dot" /><div><b>Live monitoring active</b><small><Clock3 size={12} /> Updated {formatDate(new Date())}</small></div></div></header>
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

