import { useState, lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Navigation } from "./components/Navigation";
import { AuthView } from "./components/AuthView";
import { NotificationSystem } from "./components/NotificationSystem";
import { SpotifyPlayer } from "./components/SpotifyPlayer";
import { Header } from "./components/Header";
import { supabase } from "./lib/supabase";

// Lazy loaded views
const HomeView = lazy(() => import("./components/HomeView").then(module => ({ default: module.HomeView })));
const DashboardActivityView = lazy(() => import("./components/DashboardActivityView").then(module => ({ default: module.DashboardActivityView })));
const MapView = lazy(() => import("./components/MapView").then(module => ({ default: module.MapView })));
const SocialFeedView = lazy(() => import("./components/SocialFeedView").then(module => ({ default: module.SocialFeedView })));
const ExploreView = lazy(() => import("./components/ExploreView").then(module => ({ default: module.ExploreView })));
const ProfileView = lazy(() => import("./components/ProfileView").then(module => ({ default: module.ProfileView })));
// End of imports

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-brand-bg"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-accent"></div></div>;
  }

  if (!session) {
    return <AuthView onLogin={() => {}} />;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-brand-bg text-brand-text-primary overflow-hidden font-sans selection:bg-brand-accent-dim selection:text-brand-accent">
      <NotificationSystem />
      <SpotifyPlayer className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[60]" />
      <Navigation />
      
      <main className="flex-1 h-full relative flex flex-col">
        <Header />
        <div className="flex-1 overflow-hidden h-full relative">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full w-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-accent"></div>
            </div>
          }>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<HomeView />} />
              <Route path="/dashboard" element={<DashboardActivityView />} />
              <Route path="/track" element={<MapView />} />
              <Route path="/social" element={<SocialFeedView />} />
              <Route path="/explore" element={<ExploreView />} />
              <Route path="/profile" element={<ProfileView />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </main>
    </div>
  );
}
