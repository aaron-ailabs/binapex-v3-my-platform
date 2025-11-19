import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/lib/auth";
import Layout from "@/components/layout";
import NotFound from "@/pages/not-found";

import AuthPage from "@/pages/auth-page";
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
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
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

      {/* CS Routes */}
      <Route path="/cs">
        <ProtectedRoute component={CSDashboard} allowedRoles={['Customer Service']} />
      </Route>
      <Route path="/cs/lookup">
        <ProtectedRoute component={UserLookup} allowedRoles={['Customer Service']} />
      </Route>

      <Route path="/">
        <Redirect to="/auth" />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
