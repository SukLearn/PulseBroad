import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ service, onCancel, onConfirm, busy }) {
  return <div className="modal-layer" role="alertdialog" aria-modal="true">
    <button className="modal-backdrop" onClick={onCancel} aria-label="Cancel" />
    <div className="modal confirm"><span className="alert-icon"><AlertTriangle /></span><h2>Delete {service.name}?</h2><p>This stops monitoring and permanently removes its seven-day history and incidents.</p>
      <div className="modal-actions"><button className="button secondary" onClick={onCancel}>Cancel</button><button className="button destructive" disabled={busy} onClick={onConfirm}>{busy ? 'Deleting…' : 'Delete service'}</button></div>
    </div>
  </div>;
}

