import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock3, Edit3, Radio, Trash2 } from 'lucide-react';
import ServiceAvatar from './ServiceAvatar.jsx';
import StatusBadge from './StatusBadge.jsx';
import { formatDate, metric, uptime } from '../utils/format.js';

export default function ServiceCard({ service, onEdit, onDelete }) {
  const ping = service.monitor_type === 'PING';
  return <article className="service-card">
    <div className="card-top">
      <ServiceAvatar service={service} />
      <div className="card-identity"><h3>{service.name}</h3><span className="address" title={service.address}>{service.address}</span></div>
      <StatusBadge status={service.enabled ? service.current_status : 'DISABLED'} />
    </div>
    <div className="metrics-grid">
      <div><small>{ping ? 'Average ping' : 'Response time'}</small><strong>{metric(ping ? service.average_latency : service.response_time)}</strong></div>
      <div><small>{ping ? 'Packet loss' : '24h uptime'}</small><strong>{ping ? metric(service.packet_loss, '%') : uptime(service.uptime_24h)}</strong></div>
      <div><small>{ping ? '24h uptime' : '7d uptime'}</small><strong>{ping ? uptime(service.uptime_24h) : uptime(service.uptime_7d)}</strong></div>
    </div>
    {service.current_message && <div className="message-line"><Radio size={13} />{service.current_message}</div>}
    <div className="card-footer">
      <span><Clock3 size={13} />{formatDate(service.last_checked_at)}</span>
      <div className="card-actions">
        <Link to={`/services/${service.id}`} aria-label={`View ${service.name}`}><ArrowUpRight size={16} /></Link>
        {onEdit && <button onClick={() => onEdit(service)} aria-label={`Edit ${service.name}`}><Edit3 size={15} /></button>}
        {onDelete && <button className="danger-icon" onClick={() => onDelete(service)} aria-label={`Delete ${service.name}`}><Trash2 size={15} /></button>}
      </div>
    </div>
  </article>;
}

