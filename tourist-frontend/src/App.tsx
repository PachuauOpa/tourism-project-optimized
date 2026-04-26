import React, { Suspense, lazy } from 'react';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import './App.css';

// Import page components
const HomePage = lazy(() => import('./pages/HomePage'));
const RegistrationPage = lazy(() => import('./pages/RegistrationPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const FiltersPage = lazy(() => import('./pages/FiltersPage'));
const PlannerPage = lazy(() => import('./pages/PlannerPage'));
const SosPage = lazy(() => import('./pages/SosPage'));
const EmergencyDetailPage = lazy(() => import('./pages/EmergencyDetailPage'));

// Import destination pages
const DestinationListPage = lazy(() => import('./pages/destinations/DestinationListPage'));
const DestinationsGalleryPage = lazy(() => import('./pages/destinations/DestinationsGalleryPage'));
const DestinationDetailPage = lazy(() => import('./pages/destinations/DestinationDetailPage'));
const DestinationsTemplatePage = lazy(() => import('./pages/destinations/DestinationsTemplatePage'));
const FolkloreTemplatePage = lazy(() => import('./pages/destinations/FolkloreTemplatePage'));
const AdminPage = lazy(() => import('./pages/admin/AdminPage'));

// Import ILP pages
const IlpPage = lazy(() => import('./pages/ilp/IlpPage'));
const IlpSelectionPage = lazy(() => import('./pages/ilp/IlpSelectionPage'));
const ApplyTemporaryIlpPage = lazy(() => import('./pages/ilp/ApplyTemporaryIlpPage'));
const ApplyTemporaryStayPermitPage = lazy(() => import('./pages/ilp/ApplyTemporaryStayPermitPage'));
const IlpExemptionPage = lazy(() => import('./pages/ilp/ilpExemptionPage'));
const FeePaymentDownloadPage = lazy(() => import('./pages/ilp/FeePaymentDownloadPage'));
const IlpSponsorRegisterPage = lazy(() => import('./pages/ilp/IlpSponsorRegisterPage'));
const IlpSponsorLoginPage = lazy(() => import('./pages/ilp/IlpSponsorLoginPage'));
const IlpSponsorDashboard = lazy(() => import('./pages/ilp/IlpSponsorDashboard'));
const ApplicationReferencePage = lazy(() => import('./pages/ilp/ApplicationReferencePage'));
const ReferenceStatusDashboardPage = lazy(() => import('./pages/ilp/ReferenceStatusDashboardPage'));

// Import ILP admin pages
const IlpAdminLoginPage = lazy(() => import('./pages/ilpAdmin/IlpAdminLoginPage'));
const IlpAdminDashboardPage = lazy(() => import('./pages/ilpAdmin/IlpAdminDashboardPage'));

// Import service pages
const CabsPage = lazy(() => import('./pages/services/CabsPage'));
const CabServiceListPage = lazy(() => import('./pages/services/CabServiceListPage'));
const RegisterVehiclePage = lazy(() => import('./pages/services/RegisterVehiclePage'));
const HotelStaysPage = lazy(() => import('./pages/services/HotelStaysPage'));
const ExperiencesPage = lazy(() => import('./pages/services/ExperiencesPage'));

const AppRoutes: React.FC = () => {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  const routes = (
    <Routes location={location}>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/registration" element={<Navigate to="/profile" replace />} />
      <Route path="/profile" element={<RegistrationPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/filters" element={<FiltersPage />} />
      <Route path="/destinations" element={<DestinationListPage />} />
      <Route path="/destinations-gallery" element={<DestinationsGalleryPage />} />
      <Route path="/destinations-template" element={<DestinationsTemplatePage />} />
      <Route path="/destinations-template/:slug" element={<DestinationsTemplatePage />} />
      <Route path="/folklore-template" element={<FolkloreTemplatePage />} />
      <Route path="/folklore-template/:slug" element={<FolkloreTemplatePage />} />
      <Route path="/destination/:id" element={<DestinationDetailPage />} />
      <Route path="/admin" element={<AdminPage />} />

      {/* Service pages */}
      <Route path="/service/cabs" element={<CabsPage />} />
      <Route path="/service/cabs/:serviceSlug" element={<CabServiceListPage />} />
      <Route path="/service/cab-rentals" element={<Navigate to="/service/cabs" replace />} />
      <Route path="/service/register-vehicle" element={<RegisterVehiclePage />} />
      <Route path="/service/hotel-stays" element={<HotelStaysPage />} />
      <Route path="/service/experiences" element={<ExperiencesPage />} />

      {/* ILP pages */}
      <Route path="/ilp" element={<IlpPage />} />
      <Route path="/ilp-application-types" element={<IlpSelectionPage />} />
      <Route path="/ilp-application" element={<ApplyTemporaryIlpPage />} />
      <Route path="/temporary-stay-permit" element={<ApplyTemporaryStayPermitPage />} />
      <Route path="/ilp-exemption" element={<IlpExemptionPage />} />
      <Route path="/fee-payment-download" element={<FeePaymentDownloadPage />} />
      <Route path="/verify-document/:referenceNumber" element={<ReferenceStatusDashboardPage />} />
      <Route path="/application-reference/:applicationType/:referenceNumber" element={<ApplicationReferencePage />} />
      <Route path="/ilp-register" element={<IlpSponsorRegisterPage />} />
      <Route path="/ilp-login" element={<IlpSponsorLoginPage />} />
      <Route path="/ilp-sponsor/dashboard" element={<IlpSponsorDashboard />} />
      <Route path="/ilpadmin" element={<IlpAdminLoginPage />} />
      <Route path="/ilpAdmin" element={<IlpAdminLoginPage />} />
      <Route path="/ilpadmin/dashboard" element={<IlpAdminDashboardPage />} />
      <Route path="/ilpAdmin/dashboard" element={<IlpAdminDashboardPage />} />

      {/* Other pages */}
      <Route path="/planner" element={<PlannerPage />} />
      <Route path="/sos" element={<SosPage />} />
      <Route path="/emergency/:id" element={<EmergencyDetailPage />} />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );

  return (
    <Suspense fallback={null}>
      {shouldReduceMotion ? routes : <AnimatePresence mode="wait">{routes}</AnimatePresence>}
    </Suspense>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
