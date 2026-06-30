import { useState } from "react";
import { CommunityView } from "./CommunityView";
import { ShopView } from "./ShopView";
import { GymView } from "./GymView";
import { Compass, ShoppingBag, Trophy, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

export function ExploreView() {
  const [activeTab, setActiveTab] = useState<"community" | "store" | "training">("community");

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 md:px-8 pt-6 pb-2 shrink-0 border-b border-brand-border bg-[#1A1C23]">
        <h2 className="text-xl font-semibold text-brand-text-primary tracking-tight mb-4 flex items-center gap-2">
          <Compass className="w-5 h-5 text-brand-accent" />
          Explore
        </h2>
        
        <div className="flex gap-4 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab("community")}
            className={cn(
              "pb-2 text-[13px] font-semibold transition-colors flex items-center gap-1.5 border-b-2 whitespace-nowrap",
              activeTab === "community" 
                ? "text-brand-text-primary border-brand-accent" 
                : "text-brand-text-secondary border-transparent hover:text-brand-text-primary"
            )}
          >
            <Trophy className="w-4 h-4" />
            Friends & Community
          </button>
          <button
            onClick={() => setActiveTab("training")}
            className={cn(
              "pb-2 text-[13px] font-semibold transition-colors flex items-center gap-1.5 border-b-2 whitespace-nowrap",
              activeTab === "training" 
                ? "text-brand-text-primary border-brand-accent" 
                : "text-brand-text-secondary border-transparent hover:text-brand-text-primary"
            )}
          >
            <Dumbbell className="w-4 h-4" />
            Training & Gym
          </button>
          <button
            onClick={() => setActiveTab("store")}
            className={cn(
              "pb-2 text-[13px] font-semibold transition-colors flex items-center gap-1.5 border-b-2 whitespace-nowrap",
              activeTab === "store" 
                ? "text-brand-text-primary border-brand-accent" 
                : "text-brand-text-secondary border-transparent hover:text-brand-text-primary"
            )}
          >
            <ShoppingBag className="w-4 h-4" />
            Store
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {activeTab === "community" && <CommunityView />}
        {activeTab === "training" && <GymView />}
        {activeTab === "store" && <ShopView />}
      </div>
    </div>
  );
}
