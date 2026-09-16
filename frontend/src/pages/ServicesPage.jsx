import { useCallback, useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import ServiceCard from '../components/ServiceCard.jsx';
import ServiceModal from '../components/ServiceModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Loading from '../components/Loading.jsx';
import { api } from '../services/api.js';

export default function ServicesPage({ category }) {
  const isPing = category === 'PING';
  const [services, setServices] = useState([]); const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); const [deleting, setDeleting] = useState(null); const [busy, setBusy] = useState(false); const [query, setQuery] = useState('');
  const load = useCallback(async () => { setLoading(true); try { setServices(await api.services(category)); } finally { setLoading(false); } }, [category]);
  useEffect(() => { load(); const timer = setInterval(load, 30000); return () => clearInterval(timer); }, [load]);
  async function save(body, id) { id ? await api.updateService(id, body) : await api.createService(body); await load(); }
  async function remove() { setBusy(true); try { await api.deleteService(deleting.id); setDeleting(null); await load(); } finally { setBusy(false); } }
  const visible = services.filter((service) => `${service.name} ${service.address}`.toLowerCase().includes(query.toLowerCase()));
  return <section>
    <PageHeader eyebrow={isPing ? 'Network reachability' : 'Private network'} title={isPing ? 'Ping monitor' : 'Home services'}
      description={isPing ? 'ICMP latency, availability, and packet loss from the backend.' : 'Health and response times for services on your private network.'}
      action={<button className="button primary" onClick={() => setModal('new')}><Plus size={17} />Add service</button>} />
    <div className="toolbar"><label className="search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search services…" /></label><span>{services.length} configured</span></div>
    {loading && !services.length ? <Loading /> : visible.length ? <div className="service-grid">{visible.map((service) => <ServiceCard key={service.id} service={service} onEdit={setModal} onDelete={setDeleting} />)}</div>
      : <div className="empty"><h3>No services yet</h3><p>Add your first {isPing ? 'host' : 'internal service'} to begin collecting uptime data.</p><button className="button primary" onClick={() => setModal('new')}><Plus size={17} />Add service</button></div>}
    {modal && <ServiceModal service={modal === 'new' ? null : modal} category={category} onClose={() => setModal(null)} onSave={save} />}
    {deleting && <ConfirmDialog service={deleting} busy={busy} onCancel={() => setDeleting(null)} onConfirm={remove} />}
  </section>;
}

