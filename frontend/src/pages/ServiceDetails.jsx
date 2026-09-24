import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Clock3, ExternalLink, Gauge, Radio, RotateCw, Timer, TrendingUp, Wifi } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../services/api.js';
import Loading from '../components/Loading.jsx';
import ServiceAvatar from '../components/ServiceAvatar.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import IncidentTable from '../components/IncidentTable.jsx';
import { formatDate, metric, timezone, uptime } from '../utils/format.js';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><b>{formatDate(label, true)}</b><span>{metric(payload[0].value)}</span></div>;
}

export default function ServiceDetails() {
  const { id } = useParams(); const [range, setRange] = useState('24h'); const [service, setService] = useState(null); const [stats, setStats] = useState(null); const [results, setResults] = useState([]); const [incidents, setIncidents] = useState([]);
  const [checking, setChecking] = useState(false); const [error, setError] = useState('');
  const load = useCallback(async () => {
    const [s, st, inc, samples] = await Promise.all([api.service(id), api.stats(id), api.serviceIncidents(id), api.results(id, range)]);
    setService(s); setStats(st); setIncidents(inc);
    setResults(samples.map((sample) => ({ ...sample, checked_at: `${sample.checked_at.replace(' ', 'T')}Z` })));
    setError('');
  }, [id, range]);
  useEffect(() => {
    let mounted = true;
    const refresh = () => load().catch((reason) => { if (mounted) setError(reason.message); });
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => { mounted = false; clearInterval(timer); };
  }, [load]);
  async function checkNow() {
    setChecking(true); setError('');
    try { await api.checkService(id); await load(); }
    catch (reason) { setError(reason.message); }
    finally { setChecking(false); }
  }
  if (error && !service) return <div className="empty"><h3>Could not load service</h3><p>{error}</p><button className="button secondary" onClick={() => load().catch((reason) => setError(reason.message))}>Try again</button></div>;
  if (!service || !stats) return <Loading />;
  const ping = service.monitor_type === 'PING';
  const cards = [
    ['1 hour uptime', uptime(stats.uptime_1h), TrendingUp], ['24 hour uptime', uptime(stats.uptime_24h), Gauge], ['7 day uptime', uptime(stats.uptime_7d), Radio],
    [ping ? 'Average ping' : 'Average response', metric(stats.average_response), Timer],
    [ping ? 'Minimum ping' : 'Fastest response', metric(stats.minimum_response), Timer],
    [ping ? 'Maximum ping' : 'Slowest response', metric(stats.maximum_response), Timer],
    ...(ping ? [['Average packet loss', metric(stats.average_packet_loss, '%'), Wifi]] : [])
  ];
  return <section>
    <Link className="back-link" to={service.category === 'PING' ? '/ping-monitor' : '/home-services'}><ArrowLeft size={15} />Back to services</Link>
    <div className="detail-hero"><ServiceAvatar service={service} size="large" /><div className="detail-identity"><span className="eyebrow">{ping ? 'ICMP monitor' : 'HTTP monitor'}</span><h1>{service.name}</h1><a href={ping ? undefined : service.address} target="_blank" rel="noreferrer">{service.address}{!ping && <ExternalLink size={13} />}</a><p>{service.description}</p></div><div className="detail-state"><StatusBadge status={service.enabled ? service.current_status : 'DISABLED'} /><small><Clock3 size={12} />{formatDate(service.last_checked_at, true)}</small><button className="button secondary check-button" onClick={checkNow} disabled={checking || !service.enabled}><RotateCw size={14} className={checking ? 'spinning' : ''} />{checking ? 'Checking…' : 'Check now'}</button></div></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="summary-grid detail-summary">{cards.map(([label, value, Icon]) => <article className="summary-card" key={label}><span className="summary-icon blue"><Icon size={19} /></span><small>{label}</small><strong>{value}</strong></article>)}</div>
    <div className="panel chart-panel"><div className="panel-head"><div><span className="eyebrow">Performance history</span><h2>{ping ? 'Round-trip latency' : 'Response time'}</h2></div><div className="segmented">{[['1h','1 hour'],['24h','24 hours'],['7d','7 days']].map(([value, label]) => <button key={value} className={range === value ? 'active' : ''} onClick={() => setRange(value)}>{label}</button>)}</div></div>
      {results.length ? <div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={results} margin={{ top: 12, right: 10, left: -20, bottom: 0 }}><defs><linearGradient id="latency" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b7bff" stopOpacity={0.35} /><stop offset="100%" stopColor="#8b7bff" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 6" stroke="#272b36" vertical={false} /><XAxis dataKey="checked_at" tickFormatter={(value) => new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit' }).format(new Date(value))} axisLine={false} tickLine={false} tick={{ fill: '#777e90', fontSize: 11 }} minTickGap={35} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#777e90', fontSize: 11 }} unit="ms" /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="value" stroke="#9b8cff" strokeWidth={2} fill="url(#latency)" connectNulls /></AreaChart></ResponsiveContainer></div> : <div className="empty compact"><h3>Waiting for samples</h3><p>The chart fills in as the backend completes checks.</p></div>}
    </div>
    <div className="panel incidents-panel"><div className="panel-head"><div><span className="eyebrow">Availability log</span><h2>Recent incidents</h2></div></div><IncidentTable incidents={incidents} /></div>
  </section>;
}
