import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/lib/auth";
import Layout from "@/components/layout";
import NotFound from "@/pages/not-found";

import AuthPage from "@/pages/auth-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import LandingPage from "@/pages/landing-page"; // Import Landing Page
import TraderDashboard from "@/pages/trader/dashboard";
import LiveTrading from "@/pages/trader/live-trading";
import Deposits from "@/pages/trader/deposits";
import Withdrawals from "@/pages/trader/withdrawals";
import TradeHistory from "@/pages/trader/trade-history";
import Security from "@/pages/trader/security";
import Support from "@/pages/trader/support";

import AdminDashboard from "@/pages/admin/dashboard";
import UserManagement from "@/pages/admin/users";
import KYCQueue from "@/pages/admin/kyc";
import TransactionOversight from "@/pages/admin/transactions";
import AdminBanks from "@/pages/admin/banks";
import AdminTrading from "@/pages/admin/trading";
import AdminAudit from "@/pages/admin/audit";
import AdminSettings from "@/pages/admin/settings";
import FundingSettings from "@/pages/admin/funding";
import Markets from "@/pages/marketing/markets";
import Products from "@/pages/marketing/products";
import Institutional from "@/pages/marketing/institutional";
import AdminAllocations from "@/pages/admin/allocations";
import AdminFinance from "@/pages/admin/finance";
import AdminAnalytics from "@/pages/admin/analytics";
import AdminSecurity from "@/pages/admin/security";
import AdminStaff from "@/pages/admin/staff";
import AdminCompliance from "@/pages/admin/compliance";
import ProfilePage from "@/pages/profile";

import CSDashboard from "@/pages/cs/dashboard";
import UserLookup from "@/pages/cs/user-lookup";

function ProtectedRoute({ component: Component, allowedRoles }: { component: React.ComponentType, allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (!user) {
    return <Redirect to="/auth" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Redirect to="/auth" />; // Or a 403 page
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  useAuth();

  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={HomeRoute} />
      
      <Route path="/auth" component={AuthPage} />
      <Route path="/auth/reset-password" component={ResetPasswordPage} />
      <Route path="/markets" component={Markets} />
      <Route path="/products" component={Products} />
      <Route path="/institutional" component={Institutional} />
      
      {/* Trader Routes */}
      <Route path="/dashboard">
        <ProtectedRoute component={TraderDashboard} allowedRoles={['Trader']} />
      </Route>
      <Route path="/trade">
        <ProtectedRoute component={LiveTrading} allowedRoles={['Trader']} />
      </Route>
      <Route path="/deposits">
        <ProtectedRoute component={Deposits} allowedRoles={['Trader']} />
      </Route>
      <Route path="/withdrawals">
        <ProtectedRoute component={Withdrawals} allowedRoles={['Trader']} />
      </Route>
      <Route path="/history">
        <ProtectedRoute component={TradeHistory} allowedRoles={['Trader']} />
      </Route>
      <Route path="/security">
        <ProtectedRoute component={Security} allowedRoles={['Trader']} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={ProfilePage} />
      </Route>
      <Route path="/support">
        <ProtectedRoute component={Support} allowedRoles={['Trader']} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin">
        <ProtectedRoute component={AdminDashboard} allowedRoles={['Admin']} />
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute component={UserManagement} allowedRoles={['Admin']} />
      </Route>
      <Route path="/admin/kyc">
        <ProtectedRoute component={KYCQueue} allowedRoles={['Admin']} />
      </Route>
      <Route path="/admin/transactions">
        <ProtectedRoute component={TransactionOversight} allowedRoles={['Admin']} />
      </Route>
      <Route path="/admin/funding">
        <ProtectedRoute component={FundingSettings} allowedRoles={['Admin']} />
      </Route>
      <Route path="/admin/banks">
        <ProtectedRoute component={AdminBanks} allowedRoles={['Admin']} />
      </Route>
      <Route path="/admin/trading">
        <ProtectedRoute component={AdminTrading} allowedRoles={['Admin']} />
      </Route>
      <Route path="/admin/audit">
        <ProtectedRoute component={AdminAudit} allowedRoles={['Admin']} />
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute component={AdminSettings} allowedRoles={['Admin']} />
      </Route>
      <Route path="/admin/allocations">
        <ProtectedRoute component={AdminAllocations} allowedRoles={['Admin']} />
      </Route>
      <Route path="/admin/finance">
        <ProtectedRoute component={AdminFinance} allowedRoles={['Admin']} />
      </Route>
      <Route path="/admin/analytics">
        <ProtectedRoute component={AdminAnalytics} allowedRoles={['Admin']} />
      </Route>
      <Route path="/admin/security">
        <ProtectedRoute component={AdminSecurity} allowedRoles={['Admin']} />
      </Route>
      <Route path="/admin/staff">
        <ProtectedRoute component={AdminStaff} allowedRoles={['Admin']} />
      </Route>
      <Route path="/admin/compliance">
        <ProtectedRoute component={AdminCompliance} allowedRoles={['Admin']} />
      </Route>

      {/* CS Routes */}
      <Route path="/cs">
        <ProtectedRoute component={CSDashboard} allowedRoles={['Customer Service']} />
      </Route>
      <Route path="/cs/lookup">
        <ProtectedRoute component={UserLookup} allowedRoles={['Customer Service']} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

import { ThemeProvider } from "@/components/theme-provider";
import { useEffect } from "react";

function App() {
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    
    if (isIOS) {
      document.body.setAttribute('data-platform', 'ios');
      document.documentElement.style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom)');
    }
    if (isAndroid) {
      document.body.setAttribute('data-platform', 'android');
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

function HomeRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return user ? <Redirect to="/dashboard" /> : (
    <Layout>
      <LandingPage />
    </Layout>
  );
}
