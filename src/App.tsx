import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

import HospitalLayout from "./pages/hospital/HospitalLayout";
import HospitalDashboard from "./pages/hospital/Dashboard";
import HospitalCreateTicket from "./pages/hospital/CreateTicket";
import HospitalTicketDetail from "./pages/hospital/TicketDetail";
import HospitalInventory from "./pages/hospital/Inventory";
import HospitalStats from "./pages/hospital/Stats";
import HospitalOnboarding from "./pages/hospital/Onboarding";

import DonorLayout from "./pages/donor/DonorLayout";
import DonorHome from "./pages/donor/Home";
import DonorOnboarding from "./pages/donor/Onboarding";
import DonorTickets from "./pages/donor/Tickets";
import DonorTicketDetail from "./pages/donor/TicketDetail";
import DonorHistory from "./pages/donor/History";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />

            {/* Hospital staff */}
            <Route path="/hospital/onboarding" element={<ProtectedRoute requireRole="hospital_staff"><HospitalOnboarding /></ProtectedRoute>} />
            <Route path="/hospital" element={<ProtectedRoute requireRole="hospital_staff"><HospitalLayout /></ProtectedRoute>}>
              <Route index element={<HospitalDashboard />} />
              <Route path="tickets/new" element={<HospitalCreateTicket />} />
              <Route path="tickets/:id" element={<HospitalTicketDetail />} />
              <Route path="inventory" element={<HospitalInventory />} />
              <Route path="stats" element={<HospitalStats />} />
            </Route>

            {/* Donor */}
            <Route path="/donor/onboarding" element={<ProtectedRoute requireRole="donor"><DonorOnboarding /></ProtectedRoute>} />
            <Route path="/donor" element={<ProtectedRoute requireRole="donor"><DonorLayout /></ProtectedRoute>}>
              <Route index element={<DonorHome />} />
              <Route path="tickets" element={<DonorTickets />} />
              <Route path="tickets/:id" element={<DonorTicketDetail />} />
              <Route path="history" element={<DonorHistory />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
