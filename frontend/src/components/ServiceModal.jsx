import { useEffect, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';

export default function ServiceModal({ service, category, onClose, onSave }) {
  const pingOnly = category === 'PING';
  const [form, setForm] = useState({ name: '', address: '', description: '', monitor_type: pingOnly ? 'PING' : 'HTTP', enabled: true });
  const [logo, setLogo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (service) setForm({ ...service, enabled: Boolean(service.enabled) }); }, [service]);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('');
    const body = new FormData();
    const payload = { name: form.name, address: form.address, description: form.description || '', monitor_type: form.monitor_type, enabled: form.enabled, category };
    if (form.timeout_ms != null && form.timeout_ms !== '') payload.timeout_ms = form.timeout_ms;
    Object.entries(payload).forEach(([key, value]) => body.append(key, String(value)));
    if (logo) body.append('logo', logo);
    try { await onSave(body, service?.id); onClose(); }
    catch (reason) { setError(reason.message); }
    finally { setSaving(false); }
  }
  return <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <button className="modal-backdrop" aria-label="Close" onClick={onClose} />
    <form className="modal" onSubmit={submit}>
      <div className="modal-title"><div><span className="eyebrow">Service configuration</span><h2 id="modal-title">{service ? 'Edit service' : 'Add a new service'}</h2></div><button type="button" className="icon-button" onClick={onClose}><X /></button></div>
      <div className="form-grid">
        <label><span>Name</span><input name="name" value={form.name} onChange={update} placeholder="Firefly III" maxLength="100" required /></label>
        <label><span>Monitoring type</span><select name="monitor_type" value={form.monitor_type} onChange={update} disabled={pingOnly}><option value="HTTP">HTTP / HTTPS</option><option value="PING">ICMP Ping</option></select></label>
        <label className="wide"><span>{form.monitor_type === 'PING' ? 'IP address or hostname' : 'Service URL'}</span><input name="address" value={form.address} onChange={update} placeholder={form.monitor_type === 'PING' ? '1.1.1.1' : 'http://10.10.20.130:8080'} required /></label>
        <label className="wide"><span>Description <i>optional</i></span><textarea name="description" value={form.description} onChange={update} placeholder="What does this service do?" maxLength="1000" rows="3" /></label>
        <label className="upload wide"><ImagePlus size={18} /><span>{logo ? logo.name : 'Upload logo (PNG, JPEG or WEBP · max 2 MB)'}</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setLogo(e.target.files[0])} /></label>
        <label className="toggle wide"><input type="checkbox" name="enabled" checked={form.enabled} onChange={update} /><span className="switch" /><div><b>Monitoring enabled</b><small>Checks begin automatically after saving</small></div></label>
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving}>{saving ? 'Saving…' : service ? 'Save changes' : 'Add service'}</button></div>
    </form>
  </div>;
}
