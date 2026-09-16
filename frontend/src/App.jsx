import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Loading from './components/Loading.jsx';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const ServicesPage = lazy(() => import('./pages/ServicesPage.jsx'));
const ServiceDetails = lazy(() => import('./pages/ServiceDetails.jsx'));
const ExternalServices = lazy(() => import('./pages/ExternalServices.jsx'));
const ExternalDetails = lazy(() => import('./pages/ExternalDetails.jsx'));
const Incidents = lazy(() => import('./pages/Incidents.jsx'));

export default function App() {
  return <Layout><Suspense fallback={<Loading />}><Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/home-services" element={<ServicesPage category="HOME" />} />
    <Route path="/ping-monitor" element={<ServicesPage category="PING" />} />
    <Route path="/services/:id" element={<ServiceDetails />} />
    <Route path="/external-services" element={<ExternalServices />} />
    <Route path="/external-services/:id" element={<ExternalDetails />} />
    <Route path="/incidents" element={<Incidents />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense></Layout>;
}
