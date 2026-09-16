import { AlertTriangle, Check, CircleOff, Clock3, X } from 'lucide-react';

const normalized = (status = 'UNKNOWN') => status.toUpperCase();
export default function StatusBadge({ status }) {
  const value = normalized(status);
  const config = value === 'UP' || value === 'OPERATIONAL' ? ['good', Check, value === 'UP' ? 'Online' : 'Operational']
    : value === 'DOWN' || value === 'MAJOR_OUTAGE' ? ['bad', X, value === 'DOWN' ? 'Down' : 'Major outage']
    : value === 'DEGRADED' || value === 'PARTIAL_OUTAGE' ? ['warn', AlertTriangle, value === 'DEGRADED' ? 'Degraded' : 'Partial outage']
    : value === 'MAINTENANCE' ? ['info', Clock3, 'Maintenance'] : ['neutral', CircleOff, value === 'DISABLED' ? 'Disabled' : 'Unknown'];
  const [tone, Icon, label] = config;
  return <span className={`status-badge ${tone}`}><Icon size={12} strokeWidth={2.5} />{label}</span>;
}

