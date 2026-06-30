import { useState, useEffect } from "react";
import { Search, Play, Clock, Flame, Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, Navigation, Activity as ActivityIcon, BarChart3, TrendingUp, Dumbbell, Timer, Milestone, Heart, Bluetooth, AlertOctagon, Sparkles, Droplets, Trophy, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function DashboardView() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: workouts = [] } = useQuery({
    queryKey: ['workouts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from('Workout').select('*').eq('userId', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from('Goal').select('*').eq('userId', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  const { data: pbs = [] } = useQuery({
    queryKey: ['personalBests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from('PersonalBest').select('*').eq('userId', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['dailyTasks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from('DailyTask').select('*').eq('userId', user.id).order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  const { data: metrics = [] } = useQuery({
    queryKey: ['healthMetrics', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from('HealthMetric').select('*').eq('userId', user.id).order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Realtime Subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'HealthMetric', filter: `userId=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['healthMetrics'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'DailyTask', filter: `userId=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['dailyTasks'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Workout', filter: `userId=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['workouts'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'PersonalBest', filter: `userId=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['personalBests'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Goal', filter: `userId=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['goals'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, isCompleted }: { taskId: string, isCompleted: boolean }) => {
      await supabase.from('DailyTask').update({ isCompleted }).eq('id', taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyTasks'] });
    }
  });

  const addHydrationMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const todayMetric = metrics.find((m: any) => m.type === 'Hydration' && new Date(m.date).toDateString() === new Date().toDateString());
      if (todayMetric) {
        await supabase.from('HealthMetric').update({ value: todayMetric.value + 250 }).eq('id', todayMetric.id);
      } else {
        await supabase.from('HealthMetric').insert({ userId: user.id, type: 'Hydration', value: 250, unit: 'ml' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['healthMetrics'] });
    }
  });

  // Calculate stats
  const todayHydration = metrics.find((m: any) => m.type === 'Hydration' && new Date(m.date).toDateString() === new Date().toDateString())?.value || 0;
  
  // Weekly Analytics Data
  const activityData = [
    { day: 'Mon', calories: 2400, distance: 5.2, intensity: 60 },
    { day: 'Tue', calories: 2800, distance: 6.1, intensity: 75 },
    { day: 'Wed', calories: 2200, distance: 4.8, intensity: 50 },
    { day: 'Thu', calories: 3100, distance: 8.4, intensity: 85 },
    { day: 'Fri', calories: 2600, distance: 5.9, intensity: 65 },
    { day: 'Sat', calories: 3500, distance: 12.1, intensity: 90 },
    { day: 'Sun', calories: 2100, distance: 3.2, intensity: 45 },
  ];

  return (
    <div className="h-full flex flex-col bg-[#12141A] overflow-y-auto">
      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full pb-32">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-brand-text-secondary">Welcome back! Here's your overview.</p>
          </div>
          <button className="flex items-center gap-2 bg-brand-accent hover:bg-brand-accent-hover text-white px-4 py-2 rounded-full font-medium transition-colors">
            <Plus className="w-4 h-4" /> Start New Goal
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Weekly Analytics */}
            <div className="bg-[#1A1C23] p-6 rounded-[24px] border border-[#2A2D3A]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-brand-accent" /> Weekly Analytics
                </h2>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={activityData}>
                    <defs>
                      <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#21D4B5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#21D4B5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" vertical={false} />
                    <XAxis dataKey="day" stroke="#8E92A4" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="#8E92A4" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#8E92A4" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1A1C23', borderColor: '#2A2D3A', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="calories" fill="url(#colorCalories)" stroke="#21D4B5" strokeWidth={3} name="Calories" />
                    <Bar yAxisId="right" dataKey="intensity" fill="#32ADE6" radius={[4, 4, 0, 0]} name="Intensity Score" maxBarSize={20} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* My Schedule & Daily Tasks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#1A1C23] p-6 rounded-[24px] border border-[#2A2D3A]">
                <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                  <CalendarIcon className="w-5 h-5 text-[#9D74FF]" /> My Schedule
                </h2>
                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="w-12 h-12 rounded-xl bg-[#2A2D3A] flex flex-col items-center justify-center shrink-0">
                      <span className="text-xs text-brand-text-secondary font-medium uppercase">Today</span>
                      <span className="text-lg font-bold text-white">19</span>
                    </div>
                    <div className="flex-1 bg-[#22252E] p-3 rounded-xl border border-[#2A2D3A]">
                      <h4 className="font-bold text-white text-sm">Evening Run</h4>
                      <p className="text-xs text-brand-text-secondary mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> 18:30 • 5km</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start opacity-70">
                    <div className="w-12 h-12 rounded-xl bg-[#2A2D3A] flex flex-col items-center justify-center shrink-0">
                      <span className="text-xs text-brand-text-secondary font-medium uppercase">Wed</span>
                      <span className="text-lg font-bold text-white">20</span>
                    </div>
                    <div className="flex-1 bg-[#22252E] p-3 rounded-xl border border-[#2A2D3A]">
                      <h4 className="font-bold text-white text-sm">Upper Body Power</h4>
                      <p className="text-xs text-brand-text-secondary mt-1 flex items-center gap-1"><Dumbbell className="w-3 h-3" /> 07:00 • Gym</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#1A1C23] p-6 rounded-[24px] border border-[#2A2D3A]">
                <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-[#FFB300]" /> Daily Tasks
                </h2>
                <div className="space-y-3">
                  {tasks.slice(0,4).map((task: any) => (
                    <div key={task.id} className="flex items-center gap-3">
                      <button 
                        onClick={() => toggleTaskMutation.mutate({ taskId: task.id, isCompleted: !task.isCompleted })}
                        className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0", task.isCompleted ? "bg-[#FFB300] border-[#FFB300]" : "border-[#8E92A4]")}
                      >
                        {task.isCompleted && <CheckCircle2 className="w-4 h-4 text-black" />}
                      </button>
                      <span className={cn("text-sm font-medium", task.isCompleted ? "text-brand-text-secondary line-through" : "text-white")}>{task.title}</span>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <p className="text-sm text-brand-text-secondary">No tasks for today. Add some to stay on track!</p>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            
            {/* Hydration Goal */}
            <div className="bg-[#1A1C23] p-6 rounded-[24px] border border-[#2A2D3A] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Droplets className="w-24 h-24 text-[#32ADE6]" />
              </div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2 relative z-10">
                <Droplets className="w-5 h-5 text-[#32ADE6]" /> Hydration Goal
              </h2>
              <div className="mb-4 relative z-10">
                <span className="text-3xl font-bold text-white">{todayHydration}</span>
                <span className="text-brand-text-secondary text-sm"> / 3000 ml</span>
              </div>
              <div className="w-full h-3 bg-[#2A2D3A] rounded-full mb-4 relative z-10 overflow-hidden">
                <div 
                  className="h-full bg-[#32ADE6] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (todayHydration / 3000) * 100)}%` }}
                />
              </div>
              <button 
                onClick={() => addHydrationMutation.mutate()}
                className="w-full py-2 rounded-xl bg-[#22252E] hover:bg-[#2A2D3A] border border-[#3A3D4A] text-white font-medium text-sm transition-colors relative z-10 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add 250ml
              </button>
            </div>

            {/* Personal Bests */}
            <div className="bg-[#1A1C23] p-6 rounded-[24px] border border-[#2A2D3A]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#FFD700]" /> Personal Bests
                </h2>
                <button className="text-xs text-brand-accent hover:underline font-medium">View All</button>
              </div>
              <div className="space-y-4">
                {pbs.length > 0 ? pbs.map((pb: any) => (
                  <div key={pb.id} className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-bold text-white">{pb.type}</h4>
                      <p className="text-xs text-[#21D4B5] flex items-center gap-1"><TrendingUp className="w-3 h-3" /> New Record</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-white">{pb.value}</span>
                      <span className="text-xs text-brand-text-secondary ml-1">{pb.unit}</span>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-brand-text-secondary">No personal bests logged yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Current Conditions (Mock) */}
            <div className="bg-[#1A1C23] p-6 rounded-[24px] border border-[#2A2D3A]">
               <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                  <Flame className="w-5 h-5 text-[#FF3B30]" /> Current Conditions
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#22252E] rounded-xl p-3 text-center border border-[#2A2D3A]">
                    <span className="text-xs text-brand-text-secondary uppercase tracking-wider block mb-1">Recovery</span>
                    <span className="text-xl font-bold text-[#21D4B5]">92%</span>
                  </div>
                  <div className="bg-[#22252E] rounded-xl p-3 text-center border border-[#2A2D3A]">
                    <span className="text-xs text-brand-text-secondary uppercase tracking-wider block mb-1">Load</span>
                    <span className="text-xl font-bold text-[#FFB300]">Optimal</span>
                  </div>
                </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
