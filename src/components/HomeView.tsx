import React, { useState } from 'react';
import { DashboardView } from './DashboardView';
import { SocialFeedView } from './SocialFeedView';
import { Activity, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

export function HomeView() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "feed">("dashboard");

  return (
    <div className="flex flex-col h-full bg-[#13151a]">
      {/* Tabs navigation */}
      <div className="flex-none p-4 pb-0 bg-[#13151a] border-b border-[#2A2D3A]/50 relative z-10 shadow-sm">
        <div className="flex items-center gap-6 overflow-x-auto hide-scrollbar">
          <button 
            onClick={() => setActiveTab("dashboard")}
            className={cn(
              "pb-3 text-sm font-bold transition-all flex items-center gap-2 border-b-2 whitespace-nowrap",
              activeTab === "dashboard" 
                ? "text-white border-[#21D4B5]" 
                : "text-[#8E92A4] border-transparent hover:text-white"
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab("feed")}
            className={cn(
              "pb-3 text-sm font-bold transition-all flex items-center gap-2 border-b-2 whitespace-nowrap",
              activeTab === "feed" 
                ? "text-white border-[#21D4B5]" 
                : "text-[#8E92A4] border-transparent hover:text-white"
            )}
          >
            <Activity className="w-4 h-4" />
            Community Feed
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {activeTab === "dashboard" && <DashboardView />}
        {activeTab === "feed" && <SocialFeedView />}
      </div>
    </div>
  );
}
