
import { Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazyWithReload } from "@/lib/lazyWithReload";
import AppBackground from "@/components/site/AppBackground";
import { captureReferralCodeFromUrl } from "@/lib/referral";
import Index from "./pages/Index";

// Админка и «Гараж» нужны не каждому посетителю, а их код (вместе с таблицами
// и библиотекой Excel) весит много — грузим их отдельно, только при переходе
// на соответствующий адрес. Главная страница за счёт этого открывается быстрее.
const Admin = lazyWithReload(() => import("./pages/Admin"));
const Garage = lazyWithReload(() => import("./pages/Garage"));
const NotFound = lazyWithReload(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    captureReferralCodeFromUrl();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppBackground />
          <Suspense fallback={<div className="min-h-screen" />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/garage" element={<Garage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;