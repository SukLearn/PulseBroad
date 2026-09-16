import { Activity, BellRing, Cloud, Gauge, House, PanelLeft, Radio, Server, Settings, Wifi } from 'lucide-react';

export const navItems = [
  { to: '/', label: 'Overview', icon: Gauge },
  { to: '/home-services', label: 'Home Services', icon: House },
  { to: '/ping-monitor', label: 'Ping Monitor', icon: Wifi },
  { to: '/external-services', label: 'External Services', icon: Cloud },
  { to: '/incidents', label: 'Incidents', icon: BellRing }
];

export { Activity, PanelLeft, Radio, Server, Settings };

