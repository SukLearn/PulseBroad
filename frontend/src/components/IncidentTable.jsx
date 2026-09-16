import { Link } from 'react-router-dom';
import { formatDate, formatDuration } from '../utils/format.js';
import StatusBadge from './StatusBadge.jsx';

export default function IncidentTable({ incidents, compact = false }) {
  if (!incidents?.length) return <div className="empty compact"><h3>No incidents</h3><p>Everything has stayed healthy in this period.</p></div>;
  return <div className="table-wrap"><table className="incident-table"><thead><tr><th>Service</th><th>Down</th><th>Recovered</th><th>Duration</th><th>Status</th></tr></thead><tbody>
    {incidents.map((incident) => <tr key={incident.id}>
      <td><Link to={`/services/${incident.service_id}`}><b>{incident.service_name}</b><small>{incident.category === 'EXTERNAL' ? 'Provider' : 'Monitored service'}</small></Link></td>
      <td>{formatDate(incident.started_at, !compact)}</td><td>{incident.ended_at ? formatDate(incident.ended_at, !compact) : 'Ongoing'}</td>
      <td>{formatDuration(incident.status === 'ONGOING' ? Math.round((Date.now() - Date.parse(incident.started_at)) / 1000) : incident.duration_seconds)}</td>
      <td><StatusBadge status={incident.status === 'ONGOING' ? 'DOWN' : 'OPERATIONAL'} /></td>
    </tr>)}
  </tbody></table></div>;
}

