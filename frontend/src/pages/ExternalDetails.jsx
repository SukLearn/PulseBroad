import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Clock3, Radio, RotateCw } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api.js';
import Loading from '../components/Loading.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ServiceAvatar from '../components/ServiceAvatar.jsx';
import { formatDate } from '../utils/format.js';

export default function ExternalDetails() {
  const { id } = useParams(); const [service, setService] = useState(null); const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setService(await api.externalDetail(id)); setError(''); }
    catch (reason) { setError(reason.message); }
  }, [id]);
  useEffect(() => { load(); const timer = setInterval(load, 30000); return () => clearInterval(timer); }, [load]);
  if (error && !service) return <div className="empty"><h3>Could not load provider</h3><p>{error}</p><button className="button secondary" onClick={load}><RotateCw size={15} />Try again</button></div>;
  if (!service) return <Loading />;
  const changes = service.history.filter((item, index, all) => index === all.length - 1 || item.provider_status !== all[index + 1].provider_status || item.message !== all[index + 1].message);
  return <section><Link className="back-link" to="/external-services"><ArrowLeft size={15} />External services</Link>
    {error && <div className="form-error" role="alert">Could not refresh provider status: {error}</div>}
    <div className="detail-hero"><ServiceAvatar service={service} size="large" /><div><span className="eyebrow">Official status provider</span><h1>{service.name}</h1><a href={service.address} target="_blank" rel="noreferrer">{service.address}</a></div><StatusBadge status={service.current_status} /></div>
    <div className="provider-current"><div><Radio /><span>Current provider message</span></div><h2>{service.current_message || 'No message available'}</h2><small><Clock3 size={13} />Checked {formatDate(service.last_checked_at, true)}</small></div>
    <div className="panel"><div className="panel-head"><div><span className="eyebrow">Seven-day log</span><h2>Status changes</h2></div></div>
      <div className="timeline">{changes.length ? changes.map((item) => <div className="timeline-item" key={item.id}><span className="timeline-dot" /><div><StatusBadge status={item.provider_status} /><b>{item.message}</b><small>{formatDate(item.checked_at, true)}</small></div></div>) : <div className="empty compact">No status changes recorded yet.</div>}</div>
    </div>
  </section>;
}
