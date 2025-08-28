import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Musicians from "./pages/Musicians";
import PublicProfile from "./pages/PublicProfile";
import ShowSong from "./pages/ShowSong";
import ViewSetlist from "./pages/ViewSetlist";
import ShowSetlist from "./pages/ShowSetlist";
import Repertorio from "./pages/Repertorio";
import NotFound from "./pages/NotFound";
import EditSetlist from "./pages/EditSetlist";
import OutrasCifras from "./pages/OutrasCifras";
import OutrosRepertorios from "./pages/OutrosRepertorios";
import Favorites from "./pages/Favorites";
import Health from "./pages/Health";

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
            <Route path="/profile" element={<Profile />} />
            <Route path="/musicians" element={<Musicians />} />
            <Route path="/musico/:id" element={<PublicProfile />} />
            <Route path="/setlist/:setlistId" element={<ViewSetlist />} />
            <Route path="/show/song/:songId" element={<ShowSong />} />
            <Route path="/show/setlist/:setlistId" element={<ShowSetlist />} />
            <Route path="/repertorio" element={<Repertorio />} />
            <Route path="/repertorio/:setlistId/editar" element={<EditSetlist />} />
            <Route path="/outras-cifras" element={<OutrasCifras />} />
            <Route path="/outros-repertorios" element={<OutrosRepertorios />} />
            <Route path="/favoritos" element={<Favorites />} />
            <Route path="/health" element={<Health />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
