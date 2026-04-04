import React, { Suspense, lazy } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import RouteTransitionSkeleton, { SkeletonVariant } from './components/shared/RouteTransitionSkeleton';
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
const CabRentalsPage = lazy(() => import('./pages/services/CabRentalsPage'));
const HotelStaysPage = lazy(() => import('./pages/services/HotelStaysPage'));
const ExperiencesPage = lazy(() => import('./pages/services/ExperiencesPage'));

const getSkeletonVariant = (pathname: string): SkeletonVariant => {
  if (pathname === '/home') {
    return 'home';
  }

  if (
    pathname.startsWith('/destinations') ||
    pathname.startsWith('/search') ||
    pathname.startsWith('/filters') ||
    pathname.startsWith('/service/')
  ) {
    return 'listing';
  }

  if (
    pathname.startsWith('/destinations-template') ||
    pathname.startsWith('/folklore-template') ||
    pathname.startsWith('/destination/') ||
    pathname.startsWith('/emergency/')
  ) {
    return 'detail';
  }

  if (
    pathname.startsWith('/registration') ||
    pathname.startsWith('/ilp-application') ||
    pathname.startsWith('/temporary-stay-permit') ||
    pathname.startsWith('/ilp-exemption') ||
    pathname.startsWith('/fee-payment-download') ||
    pathname.startsWith('/ilp-login') ||
    pathname.startsWith('/ilp-register') ||
    pathname.startsWith('/ilpadmin') ||
    pathname.startsWith('/ilpAdmin') ||
    pathname.startsWith('/admin')
  ) {
    return 'form';
  }

  if (
    pathname.startsWith('/ilp-sponsor/dashboard') ||
    pathname.startsWith('/ilpadmin/dashboard') ||
    pathname.startsWith('/ilpAdmin/dashboard')
  ) {
    return 'dashboard';
  }

  return 'minimal';
};

const AppRoutes: React.FC = () => {
  const location = useLocation();
  const skeletonVariant = getSkeletonVariant(location.pathname);

  return (
    <Suspense fallback={<RouteTransitionSkeleton variant={skeletonVariant} />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/registration" element={<RegistrationPage />} />
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
          <Route path="/service/cab-rentals" element={<CabRentalsPage />} />
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
      </AnimatePresence>
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
