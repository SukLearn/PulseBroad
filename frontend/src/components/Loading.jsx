export default function Loading({ text = 'Loading data…' }) {
  return <div className="loading"><span className="spinner" />{text}</div>;
}

