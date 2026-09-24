import { useCallback, useEffect, useState } from 'react';
import { Filter, RotateCw } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import IncidentTable from '../components/IncidentTable.jsx';
import Loading from '../components/Loading.jsx';
import { api } from '../services/api.js';

export default function Incidents() {
  const [range, setRange] = useState('7d'); const [serviceId, setServiceId] = useState(''); const [incidents, setIncidents] = useState(null); const [services, setServices] = useState([]); const [error, setError] = useState('');
  useEffect(() => { api.services().then(setServices).catch((reason) => setError(reason.message)); }, []);
  const load = useCallback(async () => {
    try { setIncidents(await api.incidents(range, serviceId)); setError(''); }
    catch (reason) { setError(reason.message); }
  }, [range, serviceId]);
  useEffect(() => { setIncidents(null); load(); }, [load]);
  return <section><PageHeader eyebrow="Availability log" title="Incident history" description="Exact downtime intervals, recovery times, and ongoing outages in Tbilisi time." />
    <div className="filterbar"><Filter size={16} /><div className="segmented">{[['today','Today'],['24h','24 hours'],['7d','7 days']].map(([value,label]) => <button className={range === value ? 'active' : ''} key={value} onClick={() => setRange(value)}>{label}</button>)}</div>
      <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}><option value="">All services</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
    {error && <div className="form-error" role="alert">Could not load incidents: {error}</div>}
    <div className="panel">{incidents ? <IncidentTable incidents={incidents} /> : error ? <div className="empty compact"><button className="button secondary" onClick={load}><RotateCw size={15} />Try again</button></div> : <Loading />}</div>
  </section>;
}
