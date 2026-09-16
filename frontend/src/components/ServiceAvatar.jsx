export default function ServiceAvatar({ service, size = 'normal' }) {
  if (service.logo_path) return <img className={`avatar ${size}`} src={service.logo_path} alt="" />;
  const letters = service.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  return <span className={`avatar placeholder ${size}`}>{letters}</span>;
}

