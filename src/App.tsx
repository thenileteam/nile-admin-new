import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { RequireAuth } from "@/auth/RequireAuth";
import { Shell } from "@/components/Shell";
import { Admins } from "@/pages/Admins";
import { Cac } from "@/pages/Cac";
import { EmailMarketing } from "@/pages/EmailMarketing";
import { Health } from "@/pages/Health";
import { Logistics } from "@/pages/Logistics";
import { MarketingAi } from "@/pages/MarketingAi";
import { MarketingBlast } from "@/pages/MarketingBlast";
import { Merchants } from "@/pages/Merchants";
import { MySessions } from "@/pages/MySessions";
import { NotFound } from "@/pages/NotFound";
import { OfficeHours } from "@/pages/OfficeHours";
import { LoginActivity } from "@/pages/LoginActivity";
import { Orders } from "@/pages/Orders";
import { Payments } from "@/pages/Payments";
import { Settlements } from "@/pages/Settlements";
import { Overview } from "@/pages/Overview";
import { SignIn } from "@/pages/SignIn";
import { StoreFollow } from "@/pages/StoreFollow";
import { Support } from "@/pages/Support";
import { Tasks } from "@/pages/Tasks";
import { Transfers } from "@/pages/Transfers";
import { UsersPage } from "@/pages/UsersPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
  },
});

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route path="/sign-in" element={<SignIn />} />
        <Route element={<RequireAuth />}>
          <Route element={<Shell />}>
            <Route index element={<Overview />} />
            <Route path="/merchants" element={<Merchants />} />
            <Route path="/merchants/:storeId" element={<StoreFollow />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/settlements" element={<Settlements />} />
            <Route path="/support" element={<Support />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/office-hours" element={<OfficeHours />} />
            <Route path="/transfers" element={<Transfers />} />
            <Route path="/logistics" element={<Logistics />} />
            <Route path="/cac" element={<Cac />} />
            <Route path="/marketing/blast" element={<MarketingBlast />} />
            <Route path="/marketing/ai" element={<MarketingAi />} />
            <Route path="/marketing/email" element={<EmailMarketing />} />
            <Route path="/admins" element={<Admins />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/sessions" element={<MySessions />} />
            <Route path="/login-activity" element={<LoginActivity />} />
            <Route path="/health" element={<Health />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
    <Toaster position="top-right" richColors closeButton />
  </QueryClientProvider>
);
