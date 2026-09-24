import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, Clock3, Radio, RotateCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import Loading from '../components/Loading.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ServiceAvatar from '../components/ServiceAvatar.jsx';
import { api } from '../services/api.js';
import { formatDate } from '../utils/format.js';

export default function ExternalServices() {
  const [services, setServices] = useState(null); const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setServices(await api.external()); setError(''); }
    catch (reason) { setError(reason.message); }
  }, []);
  useEffect(() => { load(); const timer = setInterval(load, 30000); return () => clearInterval(timer); }, [load]);
  return <section><PageHeader eyebrow="Official sources" title="External services" description="Provider health normalized from official JSON and RSS status feeds." />
    {error && <div className="form-error" role="alert">Could not refresh provider status: {error}</div>}
    {!services ? error ? <div className="empty"><h3>Provider data unavailable</h3><button className="button secondary" onClick={load}><RotateCw size={15} />Try again</button></div> : <Loading /> : <div className="provider-grid">{services.map((service) => <Link className="provider-card" to={`/external-services/${service.id}`} key={service.id}>
      <div className="provider-top"><ServiceAvatar service={service} /><ArrowUpRight size={18} /></div><h2>{service.name}</h2><StatusBadge status={service.current_status} />
      <p><Radio size={14} />{service.current_message || 'Waiting for the first provider check.'}</p>
      <span className="provider-check"><Clock3 size={13} /> Last checked {formatDate(service.last_checked_at)}</span>
    </Link>)}</div>}
    <div className="info-note"><b>Structured sources</b><p>Google Workspace uses its official JSON incident feed, Cloudflare uses the Statuspage API, and AWS uses its public health RSS feed.</p></div>
  </section>;
}
