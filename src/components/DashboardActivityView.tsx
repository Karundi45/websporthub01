import { useEffect, useState } from "react";
import { Pen, Flame, Footprints, Moon, Droplets } from "lucide-react";
import { format, startOfWeek, endOfWeek, subWeeks, isSameDay, getDay, getDate } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function DashboardActivityView() {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: workouts = [], isLoading: loading } = useQuery({
    queryKey: ['workouts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('Workout')
        .select('*')
        .eq('userId', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Realtime Subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('dashboard_activity_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Workout', filter: `userId=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['workouts'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Process data for the current week
  const today = new Date();
  const currentWeekStart = startOfWeek(today);
  const currentWeekEnd = endOfWeek(today);
  
  const lastWeekStart = startOfWeek(subWeeks(today, 1));
  const lastWeekEnd = endOfWeek(subWeeks(today, 1));

  let currentWeekDistance = 0;
  let currentWeekDuration = 0;
  let lastWeekDistance = 0;
  let lastWeekDuration = 0;

  const currentWeekDays = Array(7).fill(0); // Sun(0) to Sat(6)

  workouts.forEach(w => {
    const wDate = new Date(w.startTime);
    if (wDate >= currentWeekStart && wDate <= currentWeekEnd) {
      currentWeekDistance += w.distance;
      currentWeekDuration += w.duration;
      currentWeekDays[getDay(wDate)] += w.duration / 60; // in minutes
    } else if (wDate >= lastWeekStart && wDate <= lastWeekEnd) {
      lastWeekDistance += w.distance;
      lastWeekDuration += w.duration;
    }
  });

  const chartData = [
    { day: "S", value: currentWeekDays[0], isActive: getDay(today) === 0 },
    { day: "M", value: currentWeekDays[1], isActive: getDay(today) === 1 },
    { day: "T", value: currentWeekDays[2], isActive: getDay(today) === 2 },
    { day: "W", value: currentWeekDays[3], isActive: getDay(today) === 3 },
    { day: "T", value: currentWeekDays[4], isActive: getDay(today) === 4 },
    { day: "F", value: currentWeekDays[5], isActive: getDay(today) === 5 },
    { day: "S", value: currentWeekDays[6], isActive: getDay(today) === 6 },
  ];

  const maxChartValue = Math.max(...currentWeekDays, 40); // At least 40 to avoid 0 scale

  // Overall calories (rough estimate: 70 kcal per km)
  const totalCalories = Math.floor(currentWeekDistance * 70);

  // Calendar logic
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  
  const paddingDays = Array.from({ length: firstDayOfMonth }, () => null);
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
    const dayDate = new Date(today.getFullYear(), today.getMonth(), i + 1);
    const dayWorkouts = workouts.filter(w => isSameDay(new Date(w.startTime), dayDate));
    
    let activityType = null;
    let color = "";
    
    if (dayWorkouts.length > 0) {
      activityType = dayWorkouts[0].activityType;
      color = activityType === "Run" ? "bg-[#32ADE6]" : "bg-[#FFB300]";
    }
    
    return {
      day: i + 1,
      activityType,
      color
    };
  });
  
  const allDays = [...paddingDays, ...calendarDays];

  return (
    <div className="p-6 md:p-8 max-w-xl mx-auto w-full pb-24 md:pb-10 overflow-y-auto h-full flex flex-col hide-scrollbar">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 shrink-0 pt-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            {format(today, "d MMMM")} <Pen className="w-4 h-4 text-[#8E92A4] cursor-pointer hover:text-white transition-colors" />
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <img 
             src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop" 
             alt="User avatar" 
             className="w-10 h-10 rounded-full border-2 border-brand-bg object-cover shadow-sm bg-gray-800"
          />
        </div>
      </header>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 gap-4 mb-10 shrink-0">
        <div className="bg-[#1C1A14] border border-[#2B2412] rounded-[24px] p-5 relative overflow-hidden group hover:border-[#FFB300]/50 transition-colors">
          <div className="flex justify-between items-start mb-6">
            <span className="text-white font-medium">Weekly Cals</span>
            <div className="w-6 h-6 bg-[#FFB300] rounded-full flex items-center justify-center">
              <Flame className="w-3.5 h-3.5 text-white fill-white" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white mb-1 tracking-tight">{totalCalories}</div>
            <div className="text-[#8E92A4] text-xs">Kcal</div>
          </div>
        </div>

        <div className="bg-[#1A1826] border border-[#241F3A] rounded-[24px] p-5 relative overflow-hidden group hover:border-[#9D74FF]/50 transition-colors">
          <div className="flex justify-between items-start mb-6">
            <span className="text-white font-medium">Steps</span>
            <div className="w-6 h-6 bg-[#9D74FF] rounded-full flex items-center justify-center">
              <Footprints className="w-3.5 h-3.5 text-white fill-white" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white mb-1 tracking-tight">{Math.floor(currentWeekDistance * 1300)}</div>
            <div className="text-[#8E92A4] text-xs">Est. Steps</div>
          </div>
        </div>

        <div className="bg-[#14201A] border border-[#1B3224] rounded-[24px] p-5 relative overflow-hidden group hover:border-[#34C759]/50 transition-colors">
          <div className="flex justify-between items-start mb-6">
            <span className="text-white font-medium">Workouts</span>
            <div className="w-6 h-6 bg-[#34C759] rounded-full flex items-center justify-center">
              <Moon className="w-3.5 h-3.5 text-white fill-white" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white mb-1 tracking-tight">{workouts.filter(w => new Date(w.startTime) >= currentWeekStart).length}</div>
            <div className="text-[#8E92A4] text-xs">This Week</div>
          </div>
        </div>

        <div className="bg-[#141E26] border border-[#182C3A] rounded-[24px] p-5 relative overflow-hidden group hover:border-[#32ADE6]/50 transition-colors">
          <div className="flex justify-between items-start mb-6">
            <span className="text-white font-medium">Distance</span>
            <div className="w-6 h-6 bg-[#32ADE6] rounded-full flex items-center justify-center">
              <Droplets className="w-3.5 h-3.5 text-white fill-white" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white mb-1 tracking-tight">{currentWeekDistance.toFixed(1)}</div>
            <div className="text-[#8E92A4] text-xs">Kilometers</div>
          </div>
        </div>
      </div>

      {/* Workout Chart */}
      <section className="shrink-0 w-full mb-6">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Workout Duration</h3>
            <div className="text-2xl font-bold text-white flex items-baseline gap-1 tracking-tight">
              {Math.floor(currentWeekDuration / 60)} <span className="text-sm text-[#8E92A4] font-medium tracking-normal">min</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm text-[#8E92A4] block mb-1">Weekly Average</span>
            <div className="text-xl font-bold text-white flex items-baseline gap-1 justify-end tracking-tight">
              {Math.floor(lastWeekDuration / 60)} <span className="text-sm text-[#8E92A4] font-medium tracking-normal">min</span>
            </div>
          </div>
        </div>
        
        <div className="relative h-40 w-full mt-10">
          <div className="absolute left-0 right-0 top-2/3 border-t-2 border-dashed border-[#8E92A4]/30 z-0 flex items-center">
            {chartData.map((_, i) => (
               <div key={i} className={`absolute w-1.5 h-1.5 bg-[#8E92A4] rounded-full z-10 transition-colors`} style={{ left: `calc(${(i / (chartData.length - 1)) * 100}% - 3px)`}}></div>
            ))}
          </div>

          <div className="flex justify-between items-end h-full relative z-10 px-0.5">
            {chartData.map((data, i) => (
               <div key={i} className="flex flex-col items-center gap-4 relative h-full justify-end group">
                 <div className="w-1.5 h-full bg-[#2A2D3A] rounded-t-full absolute bottom-0"></div>
                 <div 
                   className={`w-1.5 rounded-t-full absolute bottom-0 transition-all ${data.isActive ? 'shadow-[0_0_10px_rgba(255,107,0,0.5)]' : ''}`}
                   style={{ 
                     height: `${(data.value / maxChartValue) * 100}%`,
                     backgroundColor: data.isActive ? '#FF6B00' : '#8E92A4',
                   }}
                 ></div>
                 <div className="absolute inset-0 w-8 -ml-4 cursor-pointer"></div>
               </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-4 px-0.5">
           {chartData.map((data, i) => (
              <span key={i} className={`text-xs font-semibold w-1.5 text-center flex justify-center ${data.isActive ? 'text-white' : 'text-[#8E92A4]'}`}>
                {data.day}
              </span>
           ))}
        </div>
      </section>

      {/* Performance Comparison Widget */}
      <section className="shrink-0 w-full mb-6">
        <div className="bg-[#1A1A1A] border border-[#2A2D3A]/50 rounded-[24px] p-6 shadow-sm group hover:border-[#21D4B5]/50 transition-colors">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-white font-bold text-lg tracking-tight mb-1">Weekly Performance</h3>
              <p className="text-[#8E92A4] text-xs">Vs. Previous Week</p>
            </div>
            {currentWeekDistance >= lastWeekDistance ? (
              <div className="bg-[#21D4B5]/10 text-[#21D4B5] text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <span className="text-lg">↑</span> {lastWeekDistance ? Math.floor(((currentWeekDistance - lastWeekDistance) / lastWeekDistance) * 100) : 100}%
              </div>
            ) : (
              <div className="bg-red-500/10 text-red-500 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <span className="text-lg">↓</span> {currentWeekDistance ? Math.floor(((lastWeekDistance - currentWeekDistance) / lastWeekDistance) * 100) : 100}%
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[#8E92A4] text-xs mb-1">Distance</div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-white tracking-tight">{currentWeekDistance.toFixed(1)}</span>
                <span className="text-sm text-[#8E92A4] pb-1">km</span>
              </div>
              <div className={`text-[10px] mt-1 ${currentWeekDistance >= lastWeekDistance ? 'text-[#34C759]' : 'text-red-500'}`}>
                {currentWeekDistance >= lastWeekDistance ? '+' : '-'}{Math.abs(currentWeekDistance - lastWeekDistance).toFixed(1)} km
              </div>
            </div>
            <div>
              <div className="text-[#8E92A4] text-xs mb-1">Workouts</div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-white tracking-tight">{workouts.filter(w => new Date(w.startTime) >= currentWeekStart).length}</span>
              </div>
            </div>
          </div>
          
          {/* Simple comparison bar */}
          <div className="mt-6">
            <div className="flex justify-between text-[10px] text-[#8E92A4] mb-2">
              <span>This Week</span>
              <span>Last Week</span>
            </div>
            <div className="h-2 w-full bg-[#22252E] rounded-full overflow-hidden flex">
              <div className="h-full bg-[#21D4B5] rounded-l-full transition-all" style={{ width: `${Math.min((currentWeekDistance / (currentWeekDistance + lastWeekDistance || 1)) * 100, 100)}%` }}></div>
              <div className="h-full bg-[#32ADE6] rounded-r-full transition-all" style={{ width: `${Math.min((lastWeekDistance / (currentWeekDistance + lastWeekDistance || 1)) * 100, 100)}%` }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Training Calendar */}
      <div className="mt-8 mb-4 bg-[#1A1A1A] border border-[#2A2D3A]/50 rounded-[24px] p-6 shadow-sm shrink-0 w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-white font-bold text-lg tracking-tight">{format(today, "MMMM yyyy")}</h3>
          <div className="flex flex-wrap justify-end gap-2 text-[10px] sm:text-xs text-[#8E92A4]">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#32ADE6]" /> Run</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#FFB300]" /> Ride</div>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-center text-xs font-semibold text-[#8E92A4] pb-2">{d}</div>
          ))}
          {allDays.map((d, i) => (
            <div key={i} className="aspect-square flex items-center justify-center relative">
              {d ? (
                <div className="w-full h-full rounded-xl flex items-center justify-center relative border border-transparent hover:border-[#8E92A4]/30 bg-[#22252E] transition-colors cursor-pointer group">
                  <span className={`text-sm font-medium z-10 ${d.activityType ? 'text-white' : 'text-[#8E92A4]'}`}>{d.day}</span>
                  {d.color && (
                    <div className={`absolute bottom-1.5 sm:bottom-2 w-1.5 h-1.5 rounded-full ${d.color} shadow-sm group-hover:scale-150 transition-transform`} />
                  )}
                </div>
              ) : (
                <div className="w-full h-full rounded-xl" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
