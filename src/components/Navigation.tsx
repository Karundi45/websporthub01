import { Map, Activity, MessageSquare, Target, Compass, User, Wifi, WifiOff, RefreshCw, Check, HelpCircle } from "lucide-react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export function Navigation() {
  const location = useLocation();
  const currentPath = location.pathname;

  const { data: tabs = [] } = useQuery({
    queryKey: ["navigationTabs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('NavigationTab')
        .select('*')
        .eq('isActive', true)
        .order('order', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(new Date());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      handleSync();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSync = () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    
    // Simulate syncing data back to server
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncTime(new Date());
    }, 2000);
  };

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-[#1A1C23] border-t border-brand-border flex flex-col justify-between p-0 md:relative md:w-60 md:border-t-0 md:border-r md:h-screen md:justify-start md:p-3 z-50">
      <div>
        <div className="hidden md:flex flex-col items-start mb-6 pt-2 px-3">
          <h1 className="text-[13px] font-bold tracking-tight text-[#e5e5e5] flex items-center gap-2">
            <Target className="w-4 h-4 text-brand-accent" />
            SPORTHUB
          </h1>
        </div>
        
        <div className="flex md:flex-col w-full gap-0.5 items-center md:items-stretch overflow-x-auto md:overflow-visible pb-1 md:pb-0 hide-scrollbar">
          {tabs.map((tab: any) => {
            const Icon = (Icons as any)[tab.iconName] || HelpCircle;
            const isActive = currentPath === tab.path;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={cn(
                  "flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 px-3 md:px-3 rounded-md transition-colors min-w-[64px] md:min-w-0 md:w-full flex-shrink-0 text-left relative",
                  "h-14 md:h-auto md:py-2",
                  isActive 
                    ? "text-brand-text-primary font-medium" 
                    : "text-[#8E92A4] hover:text-brand-text-primary font-medium"
                )}
              >
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-brand-accent rounded-b-md md:hidden"></div>
                )}
                <Icon className={cn("w-5 h-5 md:w-[14px] md:h-[14px] mx-auto md:mx-0", isActive ? "text-brand-accent" : "")} />
                <span className="text-[10px] md:text-[13px] font-medium whitespace-nowrap overflow-hidden text-ellipsis md:inline-block leading-tight">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Sync Status Indicator (Desktop only for space, though can be adapted for mobile) */}
      <div className="hidden md:flex flex-col mt-auto pt-4 border-t border-[#2A2D3A]">
        <div className="px-3 py-2 rounded-md bg-[#22252E] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!isOnline ? (
                <WifiOff className="w-4 h-4 text-red-400" />
              ) : isSyncing ? (
                <RefreshCw className="w-4 h-4 text-brand-accent animate-spin" />
              ) : (
                <Check className="w-4 h-4 text-emerald-400" />
              )}
              <span className="text-xs font-medium text-[#8E92A4]">
                {!isOnline ? "Offline" : isSyncing ? "Syncing..." : "Synced"}
              </span>
            </div>
            {isOnline && !isSyncing && (
              <button 
                onClick={handleSync}
                className="text-[10px] font-semibold text-brand-accent hover:underline"
              >
                Sync Now
              </button>
            )}
          </div>
          {lastSyncTime && isOnline && !isSyncing && (
            <p className="text-[10px] text-[#5A5D6B]">
              Last synced: {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>
    </nav>
  );
}
