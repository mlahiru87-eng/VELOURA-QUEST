import React, { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { SupportProvider } from './context/SupportContext';
import { Navbar } from './components/Navbar';
import { OnboardingModal } from './components/OnboardingModal';
import { OfflineBanner } from './components/OfflineBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PullToRefresh } from './components/PullToRefresh';
import { DashboardSkeleton } from './components/SkeletonLoaders';
import { AnnouncementBanner } from './components/AnnouncementBanner';
import { MaintenanceScreen } from './components/MaintenanceScreen';
import { SuspendedScreen } from './components/SuspendedScreen';
import { LoadingScreen } from './components/LoadingScreen';

// Lazy load view routes for code-splitting and performance
const SplashScreen = lazy(() => import('./views/SplashScreen').then(m => ({ default: m.SplashScreen })));
const LoginView = lazy(() => import('./views/LoginView').then(m => ({ default: m.LoginView })));
const RegisterView = lazy(() => import('./views/RegisterView').then(m => ({ default: m.RegisterView })));
const ForgotPasswordView = lazy(() => import('./views/ForgotPasswordView').then(m => ({ default: m.ForgotPasswordView })));
const HomeDashboardView = lazy(() => import('./views/HomeDashboardView').then(m => ({ default: m.HomeDashboardView })));
const DailyTasksView = lazy(() => import('./views/DailyTasksView').then(m => ({ default: m.DailyTasksView })));
const WalletView = lazy(() => import('./views/WalletView').then(m => ({ default: m.WalletView })));
const ReferralView = lazy(() => import('./views/ReferralView').then(m => ({ default: m.ReferralView })));
const NotificationsView = lazy(() => import('./views/NotificationsView').then(m => ({ default: m.NotificationsView })));
const SupportChatView = lazy(() => import('./views/SupportChatView').then(m => ({ default: m.SupportChatView })));
const ProfileView = lazy(() => import('./views/ProfileView').then(m => ({ default: m.ProfileView })));
const AdminPanelView = lazy(() => import('./views/AdminPanelView').then(m => ({ default: m.AdminPanelView })));
const QuestCompleteView = lazy(() => import('./views/QuestCompleteView').then(m => ({ default: m.QuestCompleteView })));

const MainAppContent: React.FC = () => {
  const { currentPage, loading, refreshData, settings, userProfile } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  // Account Suspension Enforcement
  if (userProfile?.isSuspended) {
    return <SuspendedScreen />;
  }

  // Maintenance Mode Enforcement (Admins bypass)
  if (settings?.maintenanceMode && userProfile?.role !== 'admin') {
    return <MaintenanceScreen />;
  }

  const isAuthPage = ['splash', 'login', 'register', 'forgotPassword'].includes(currentPage);

  return (
    <div id="app-root" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-500/30 selection:text-purple-200">
      <AnnouncementBanner />
      {!isAuthPage && <Navbar />}
      <OfflineBanner />
      <OnboardingModal />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6">
        <PullToRefresh onRefresh={refreshData}>
          <Suspense fallback={<DashboardSkeleton />}>
            {currentPage === 'splash' && <SplashScreen />}
            {currentPage === 'login' && <LoginView />}
            {currentPage === 'register' && <RegisterView />}
            {currentPage === 'forgotPassword' && <ForgotPasswordView />}
            {currentPage === 'home' && <HomeDashboardView />}
            {currentPage === 'tasks' && <DailyTasksView />}
            {currentPage === 'wallet' && <WalletView />}
            {currentPage === 'referral' && <ReferralView />}
            {currentPage === 'support' && <SupportChatView />}
            {currentPage === 'notifications' && <NotificationsView />}
            {currentPage === 'profile' && <ProfileView />}
            {currentPage === 'admin' && <AdminPanelView />}
            {currentPage === 'complete' && <QuestCompleteView />}
          </Suspense>
        </PullToRefresh>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <SupportProvider>
            <MainAppContent />
          </SupportProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
