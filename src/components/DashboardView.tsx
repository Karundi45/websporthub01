import { useState, useEffect } from "react";
import { Search, Play, Clock, Flame, Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, Navigation, Activity as ActivityIcon, BarChart3, TrendingUp, Dumbbell, Timer, Milestone, Heart, Bluetooth, AlertOctagon, Sparkles, Wifi, Thermometer, Droplets, CloudRain, MapPin, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import api from "@/lib/api";
import { io } from "socket.io-client";

const DEFAULT_ACTIVITY_DATA = [
  { day: 'Mon', calories: 340, distance: 4.2, minutes: 30, workouts: 1, intensity: 125 },
  { day: 'Tue', calories: 420, distance: 5.1, minutes: 45, workouts: 2, intensity: 135 },
  { day: 'Wed', calories: 310, distance: 3.8, minutes: 25, workouts: 1, intensity: 110 },
  { day: 'Thu', calories: 550, distance: 6.8, minutes: 60, workouts: 1, intensity: 155 },
  { day: 'Fri', calories: 290, distance: 3.2, minutes: 20, workouts: 0, intensity: 105 },
  { day: 'Sat', calories: 600, distance: 8.5, minutes: 75, workouts: 3, intensity: 160 },
  { day: 'Sun', calories: 480, distance: 5.9, minutes: 50, workouts: 2, intensity: 145 },
];

const DEFAULT_PERSONAL_BESTS: any[] = [
  { id: 'pb-1', name: 'Bench Press', value: 225, unit: 'lbs', trend: '+5 lbs this month', trendValue: 'up', iconType: 'dumbbell' },
  { id: 'pb-2', name: 'Squat', value: 315, unit: 'lbs', trend: '+10 lbs this month', trendValue: 'up', iconType: 'activity' },
  { id: 'pb-3', name: '5K Run Pace', value: '7:30', unit: '/mi', trend: '-0:15s this month', trendValue: 'up', iconType: 'timer' }
];

export function DashboardView() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 19)); // Given June 2026
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 5, 19));
  const [selectedMetric, setSelectedMetric] = useState<"calories" | "distance" | "minutes" | "workouts">("calories");
  const [isLoading, setIsLoading] = useState(true);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [personalBests, setPersonalBests] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.get('/user/analytics');
        // Transform workouts to activityData for the charts
        const dayMap: Record<string, any> = {
          'Mon': { day: 'Mon', calories: 0, distance: 0, minutes: 0, workouts: 0, intensity: 0 },
          'Tue': { day: 'Tue', calories: 0, distance: 0, minutes: 0, workouts: 0, intensity: 0 },
          'Wed': { day: 'Wed', calories: 0, distance: 0, minutes: 0, workouts: 0, intensity: 0 },
          'Thu': { day: 'Thu', calories: 0, distance: 0, minutes: 0, workouts: 0, intensity: 0 },
          'Fri': { day: 'Fri', calories: 0, distance: 0, minutes: 0, workouts: 0, intensity: 0 },
          'Sat': { day: 'Sat', calories: 0, distance: 0, minutes: 0, workouts: 0, intensity: 0 },
          'Sun': { day: 'Sun', calories: 0, distance: 0, minutes: 0, workouts: 0, intensity: 0 },
        };
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        res.data.workouts.forEach((w: any) => {
          const dName = dayNames[new Date(w.startTime).getDay()];
          dayMap[dName].distance += (w.distance / 1000); // convert meters to km
          dayMap[dName].minutes += (w.duration / 60);
          dayMap[dName].calories += (w.distance / 1000) * 70; // 70 kcal per km estimate
          dayMap[dName].workouts += 1;
          dayMap[dName].intensity = 130 + Math.floor(Math.random() * 20); // random intensity for chart
        });
        
        setActivityData(Object.values(dayMap));
        // Hardcoded generic personal bests for now until backend supports PBs
        setPersonalBests([
          { id: 'pb-1', name: 'Total Distance', value: (res.data.totalDistance / 1000).toFixed(1), unit: 'km', trend: 'Lifetime tracking', trendValue: 'up', iconType: 'activity' },
          { id: 'pb-2', name: 'Workouts', value: res.data.totalWorkouts, unit: 'sessions', trend: 'Lifetime tracking', trendValue: 'up', iconType: 'timer' }
        ]);
      } catch (err) {
        console.error("Error loading analytics data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Weather State
  const [weather, setWeather] = useState<{temp: number, humidity: number, precip: number} | null>(null);
  
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation`)
            .then(res => res.json())
            .then(data => {
              if (data && data.current) {
                setWeather({
                  temp: data.current.temperature_2m,
                  humidity: data.current.relative_humidity_2m,
                  precip: data.current.precipitation
                });
              }
            })
            .catch(err => console.error("Weather API error:", err));
        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Web Bluetooth Heart Rate Monitor State
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [bleDevice, setBleDevice] = useState<any>(null);
  const [isConnectingHR, setIsConnectingHR] = useState(false);
  const [isSimulatingHR, setIsSimulatingHR] = useState(false);
  const [hrHistory, setHrHistory] = useState<{ time: string; bpm: number }[]>([]);
  const [hrError, setHrError] = useState<string | null>(null);

  const connectBluetooth = async () => {
    setHrError(null);
    if (!('bluetooth' in navigator)) {
      setHrError("Web Bluetooth API is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
      return;
    }
    
    setIsConnectingHR(true);
    setIsSimulatingHR(false); // Stop simulation if trying to connect
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
      });
      
      setBleDevice(device);
      const server = await device.gatt?.connect();
      if (!server) throw new Error("Could not connect to GATT server");
      
      const service = await server.getPrimaryService('heart_rate');
      const characteristic = await service.getCharacteristic('heart_rate_measurement');
      
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', (e: any) => {
        const value = e.target.value;
        if (!value) return;
        const flags = value.getUint8(0);
        const rate16Bits = flags & 0x1;
        const hr = rate16Bits ? value.getUint16(1, true) : value.getUint8(1);
        setHeartRate(hr);
        setHrError(null);
      });
      
      device.addEventListener('gattserverdisconnected', () => {
        setBleDevice(null);
        setHeartRate(null);
      });
    } catch (err: any) {
      console.error("BLE Connect failed", err);
      const errMsg = err?.message || String(err);
      if (err?.name === "SecurityError" || errMsg.includes("permissions policy") || errMsg.includes("disallowed")) {
        setHrError("Bluetooth access is restricted inside the preview's iframe sandbox. Click the 'Open in new tab' button at the top-right of your screen to connect your heart rate monitor directly via native Web Bluetooth, or use our simulator below!");
      } else if (err?.name === "NotFoundError" || errMsg.includes("user cancelled")) {
        // Cancelled by user
      } else {
        setHrError(`Connection failed: ${errMsg}`);
      }
    } finally {
      setIsConnectingHR(false);
    }
  };

  const disconnectBluetooth = () => {
    if (bleDevice && bleDevice.gatt?.connected) {
      try {
        bleDevice.gatt.disconnect();
      } catch (e) {
        console.error(e);
      }
    }
    setBleDevice(null);
    setHeartRate(null);
    setIsSimulatingHR(false);
    setHrHistory([]);
  };

  // Real-time socket HR telemetry
  useEffect(() => {
    const token = localStorage.getItem('token');
    const socket = io({ auth: { token } });
    
    socket.on('dashboard_update', (data) => {
      if (data.type === 'heart_rate') {
        setHeartRate(data.bpm);
        setHrHistory((prev) => {
          const now = new Date();
          const timeStr = `${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
          const updated = [...prev, { time: timeStr, bpm: data.bpm }];
          return updated.length > 20 ? updated.slice(updated.length - 20) : updated;
        });
      }
    });
    
    // Cleanup
    return () => {
      socket.disconnect();
    };
  }, []);

  const getHeartRateZone = (bpm: number) => {
    if (bpm < 100) return { name: "Warm Up / Rest", color: "text-[#34C759]", border: "border-[#34C759]/20", bg: "bg-[#34C759]/5", desc: "Active recovery & standard rest" };
    if (bpm <= 120) return { name: "Fat Burn", color: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/5", desc: "Optimal weight management zone" };
    if (bpm <= 150) return { name: "Aerobic / Cardio", color: "text-[#FF6B00]", border: "border-[#FF6B00]/20", bg: "bg-[#FF6B00]/5", desc: "Endurance & fitness capacity improvement" };
    return { name: "Peak / Anaerobic", color: "text-red-500", border: "border-red-500/20", bg: "bg-red-500/5", desc: "Maximum extreme effort zone" };
  };

  const [planProgress, setPlanProgress] = useState({ completed: 0, total: 7, percentage: 0 });

  useEffect(() => {
    // Realtime progress for the Plan Banner using real data
    if (activityData.length > 0) {
      const activeDays = activityData.filter(d => d.workouts > 0).length;
      setPlanProgress({ completed: activeDays, total: 7, percentage: Math.round((activeDays / 7) * 100) });
    }
  }, [activityData]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
  }

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  // Mock data for scheduled and completed workouts
  const workoutData: Record<number, 'completed' | 'scheduled' | 'missed'> = {
    10: 'completed',
    12: 'completed',
    15: 'missed',
    17: 'completed',
    19: 'completed',
    21: 'scheduled',
    25: 'scheduled',
  };

  // Calculate daily water recommendation based on selected date
  const currentDayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][selectedDate.getDay()];
  const currentActivity = activityData.find(d => d.day === currentDayName);

  const calculateWaterIntake = () => {
    const baseWaterOz = 64; // baseline for rest day
    if (!currentActivity || currentActivity.minutes === 0) return { target: baseWaterOz, extra: 0, reason: "Rest day baseline" };
    
    // Add 12 oz per 30 mins of exercise
    const extraOz = Math.round((currentActivity.minutes / 30) * 12);
    // Add multiplier if intensity is high
    const intensityBonus = currentActivity.intensity >= 140 ? 16 : 0; 
    
    const target = baseWaterOz + extraOz + intensityBonus;
    
    return {
      target,
      extra: extraOz + intensityBonus,
      reason: `Includes ${extraOz + intensityBonus}oz extra for your ${currentActivity.minutes} min workout at ${currentActivity.intensity} avg BPM`
    };
  };

  const waterRecommendation = calculateWaterIntake();

  if (isLoading) {
    return (
      <div 
        className="w-full h-full relative overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(26, 28, 35, 0.75), rgba(26, 28, 35, 0.95)), url('https://images.unsplash.com/photo-1508344928928-7137b29de218?q=80&w=2000&auto=format&fit=crop')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="p-6 md:p-8 max-w-xl mx-auto w-full pb-24 md:pb-10 overflow-y-auto h-full flex flex-col hide-scrollbar relative z-10 animate-pulse">
          {/* Plan Banner Skeleton */}
          <section className="mb-10 w-full shrink-0">
            <div className="bg-gray-700/30 rounded-[24px] p-6 flex items-center justify-between h-[148px]">
              <div className="space-y-2">
                <div className="h-8 w-32 bg-gray-700/50 rounded"></div>
                <div className="h-8 w-24 bg-gray-700/50 rounded"></div>
                <div className="h-4 w-20 bg-gray-700/50 rounded mt-2"></div>
              </div>
              <div className="w-[100px] h-[100px] rounded-full bg-gray-700/50"></div>
            </div>
          </section>

          {/* Start New Goal Skeleton */}
          <section className="mb-10 shrink-0 w-full">
            <div className="flex justify-between items-center mb-5">
              <div className="h-6 w-32 bg-gray-700/50 rounded"></div>
              <div className="h-4 w-12 bg-gray-700/50 rounded"></div>
            </div>
            <div className="flex gap-4 overflow-x-hidden">
              <div className="w-[85%] md:w-[300px] shrink-0 bg-[#22252E]/50 rounded-[24px] p-2 h-[280px]">
                <div className="h-[200px] md:h-[180px] w-full bg-gray-700/50 rounded-[20px] mb-4"></div>
                <div className="px-3 pb-3 space-y-2">
                  <div className="h-6 w-3/4 bg-gray-700/50 rounded"></div>
                  <div className="h-4 w-1/2 bg-gray-700/50 rounded"></div>
                  <div className="flex gap-2 mt-2">
                    <div className="h-6 w-16 bg-gray-700/50 rounded-full"></div>
                    <div className="h-6 w-16 bg-gray-700/50 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Daily Task Skeleton */}
          <section className="shrink-0 w-full mb-6">
            <div className="flex justify-between items-center mb-5">
              <div className="h-6 w-32 bg-gray-700/50 rounded"></div>
              <div className="h-4 w-12 bg-gray-700/50 rounded"></div>
            </div>
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 bg-[#22252E]/50 p-3 pr-5 rounded-[20px]">
                  <div className="w-[70px] h-[70px] rounded-[16px] bg-gray-700/50"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-1/2 bg-gray-700/50 rounded"></div>
                    <div className="flex gap-3">
                      <div className="h-4 w-12 bg-gray-700/50 rounded"></div>
                      <div className="h-4 w-16 bg-gray-700/50 rounded"></div>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gray-700/50"></div>
                </div>
              ))}
            </div>
          </section>

          {/* Charts Skeleton */}
          <section className="shrink-0 w-full mb-6 mt-4">
            <div className="flex justify-between items-center mb-5">
              <div className="h-6 w-48 bg-gray-700/50 rounded"></div>
              <div className="h-6 w-24 bg-gray-700/50 rounded"></div>
            </div>
            <div className="w-full bg-[#22252E]/50 rounded-[24px] p-5 h-[320px]">
              <div className="h-4 w-1/3 bg-gray-700/50 rounded mb-6"></div>
              <div className="h-[200px] w-full bg-gray-700/30 rounded-xl"></div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full relative overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(26, 28, 35, 0.75), rgba(26, 28, 35, 0.95)), url('https://images.unsplash.com/photo-1508344928928-7137b29de218?q=80&w=2000&auto=format&fit=crop')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="p-6 md:p-8 max-w-xl mx-auto w-full pb-24 md:pb-10 overflow-y-auto h-full flex flex-col hide-scrollbar relative z-10">
      {/* Plan Banner */}
      <section className="mb-10 w-full shrink-0">
        <div className="bg-gradient-to-r from-[#814FFF] to-[#C08CFF] rounded-[24px] p-6 flex items-center justify-between shadow-[0_10px_30px_rgba(129,79,255,0.3)] w-full">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">My Plan<br/>For Today</h2>
            <p className="text-white/80 text-sm font-medium transition-all">{planProgress.completed}/{planProgress.total} Complete</p>
          </div>
          
          <div className="relative w-[100px] h-[100px] flex items-center justify-center shrink-0">
            {/* Simple CSS radial progress approximation for the design */}
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <path
                className="text-white/20"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray="100, 100"
              />
              <path
                className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all duration-1000 ease-out"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray={`${planProgress.percentage}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-white transition-all">{planProgress.percentage}<span className="text-sm font-medium">%</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* Weather Widget */}
      {weather && (
        <section className="mb-10 w-full shrink-0">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-brand-accent" />
              Current Conditions
            </h3>
          </div>
          
          <div className="bg-[#22252E] border border-[#2A2D3A]/50 rounded-[24px] p-5 flex items-center justify-between shadow-lg">
            <div className="flex flex-col gap-1 text-center flex-1 border-r border-[#2A2D3A]">
              <Thermometer className="w-6 h-6 text-orange-400 mx-auto mb-1" />
              <span className="text-2xl font-bold text-white tabular-nums">{weather.temp.toFixed(1)}°</span>
              <span className="text-xs text-[#8E92A4] font-medium uppercase tracking-wider">Temperature</span>
            </div>
            
            <div className="flex flex-col gap-1 text-center flex-1 border-r border-[#2A2D3A]">
              <Droplets className="w-6 h-6 text-blue-400 mx-auto mb-1" />
              <span className="text-2xl font-bold text-white tabular-nums">{weather.humidity}%</span>
              <span className="text-xs text-[#8E92A4] font-medium uppercase tracking-wider">Humidity</span>
            </div>
            
            <div className="flex flex-col gap-1 text-center flex-1">
              <CloudRain className="w-6 h-6 text-[#8E92A4] mx-auto mb-1" />
              <span className="text-2xl font-bold text-white tabular-nums">{weather.precip.toFixed(1)}</span>
              <span className="text-xs text-[#8E92A4] font-medium uppercase tracking-wider">Precip (mm)</span>
            </div>
          </div>
        </section>
      )}

      {/* Start New Goal */}
      <section className="mb-10 shrink-0 w-full">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-white">Start New Goal</h3>
          <button className="text-[#21D4B5] text-sm font-semibold hover:underline">See all</button>
        </div>
        
        <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 pr-4 -mr-6 md:mr-0">
          {/* Card 1 */}
          <div className="w-[85%] md:w-[300px] shrink-0 bg-[#22252E] rounded-[24px] p-2 relative">
            <div className="relative h-[200px] md:h-[180px] w-full rounded-[20px] overflow-hidden mb-4 bg-gray-800">
               <img src="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1470&auto=format&fit=crop" className="w-full h-full object-cover opacity-80" alt="Body Building" />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
               <button className="absolute right-4 bottom-4 w-10 h-10 bg-[#FF6B00] rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform z-10">
                 <Play className="w-4 h-4 text-white ml-0.5 fill-white" />
               </button>
            </div>
            
            <div className="px-3 pb-3">
              <h4 className="text-white text-xl font-bold mb-1">Body Building</h4>
              <p className="text-[#8E92A4] text-sm mb-4">Full body workout</p>
              
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5 border border-[#34C759] rounded-full px-3 py-1.5 bg-[#34C759]/10">
                  <Clock className="w-3.5 h-3.5 text-[#34C759]" />
                  <span className="text-[#34C759] text-xs font-semibold">35 min</span>
                </div>
                <div className="flex items-center gap-1.5 border border-[#FFB300] rounded-full px-3 py-1.5 bg-[#FFB300]/10">
                  <Flame className="w-3.5 h-3.5 text-[#FFB300]" />
                  <span className="text-[#FFB300] text-xs font-semibold">120 cal</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Card 2 */}
          <div className="w-[85%] md:w-[300px] shrink-0 bg-[#22252E] rounded-[24px] p-2 relative">
            <div className="relative h-[200px] md:h-[180px] w-full rounded-[20px] overflow-hidden mb-4 bg-gray-800">
               <img src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1470&auto=format&fit=crop" className="w-full h-full object-cover opacity-80" alt="Six pack" />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
               <button className="absolute right-4 bottom-4 w-10 h-10 bg-[#FF6B00] rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform z-10">
                 <Play className="w-4 h-4 text-white ml-0.5 fill-white" />
               </button>
            </div>
            
            <div className="px-3 pb-3">
              <h4 className="text-white text-xl font-bold mb-1">Six pack</h4>
              <p className="text-[#8E92A4] text-sm mb-4">Core workout</p>
              
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5 border border-[#34C759] rounded-full px-3 py-1.5 bg-[#34C759]/10">
                  <Clock className="w-3.5 h-3.5 text-[#34C759]" />
                  <span className="text-[#34C759] text-xs font-semibold">25 min</span>
                </div>
                <div className="flex items-center gap-1.5 border border-[#FFB300] rounded-full px-3 py-1.5 bg-[#FFB300]/10">
                  <Flame className="w-3.5 h-3.5 text-[#FFB300]" />
                  <span className="text-[#FFB300] text-xs font-semibold">180 cal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Personal Bests */}
      <section className="shrink-0 w-full mb-10">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#FFB300]" />
            Personal Bests
          </h3>
          <button className="text-[#21D4B5] text-sm font-semibold hover:underline">View All</button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {personalBests.map((pb) => (
            <div key={pb.id} className="bg-[#22252E] border border-[#2A2D3A]/50 rounded-[20px] p-5 shadow-sm relative overflow-hidden">
              <div className={cn(
                "absolute top-0 right-0 w-16 h-16 rounded-bl-[40px] flex items-center justify-center",
                pb.iconType === 'dumbbell' ? "bg-[#FFB300]/10" : 
                pb.iconType === 'activity' ? "bg-[#21D4B5]/10" : "bg-[#814FFF]/10"
              )}>
                {pb.iconType === 'dumbbell' && <Dumbbell className="w-6 h-6 text-[#FFB300] ml-2 mb-2" />}
                {pb.iconType === 'activity' && <ActivityIcon className="w-6 h-6 text-[#21D4B5] ml-2 mb-2" />}
                {pb.iconType === 'timer' && <Timer className="w-6 h-6 text-[#814FFF] ml-2 mb-2" />}
              </div>
              <p className="text-[#8E92A4] text-sm font-medium mb-1">{pb.name}</p>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-bold text-white tabular-nums">{pb.value}</span>
                <span className="text-[#8E92A4] text-sm font-semibold ml-1">{pb.unit}</span>
              </div>
              <div className={cn(
                "flex items-center gap-1.5 text-xs font-medium",
                pb.trendValue === 'up' ? "text-[#34C759]" : "text-[#FFB300]"
              )}>
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{pb.trend}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Achievements */}
      <section className="shrink-0 w-full mb-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-white">
            Achievements
          </h3>
          <button className="text-[#21D4B5] text-sm font-semibold hover:underline">View All</button>
        </div>
        
        <div className="bg-[#22252E] border border-[#2A2D3A]/50 rounded-[20px] shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-[#2A2D3A]/50 group hover:bg-[#2A2D3A]/20 transition-colors">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-gradient-to-br from-[#32ADE6] to-[#21D4B5] rounded-full flex items-center justify-center shadow-md">
                 <Trophy className="w-5 h-5 text-white" />
               </div>
               <div>
                 <h4 className="text-sm font-bold text-white mb-0.5">First 5K</h4>
                 <p className="text-xs text-[#8E92A4]">Completed your first 5K run</p>
               </div>
            </div>
            <span className="text-xs font-bold text-[#8E92A4]">Completed</span>
          </div>

          <div className="flex items-center justify-between p-4 border-b border-[#2A2D3A]/50 group hover:bg-[#2A2D3A]/20 transition-colors">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-gradient-to-br from-[#FFB300] to-[#FF6B00] rounded-full flex items-center justify-center shadow-md">
                 <Flame className="w-5 h-5 text-white" />
               </div>
               <div>
                 <h4 className="text-sm font-bold text-white mb-0.5">7-Day Streak</h4>
                 <p className="text-xs text-[#8E92A4]">Worked out for 7 days in a row</p>
               </div>
            </div>
            <span className="text-xs font-bold text-[#8E92A4]">Completed</span>
          </div>

          <div className="flex items-center justify-between p-4 border-b border-[#2A2D3A]/50 group hover:bg-[#2A2D3A]/20 transition-colors">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-gradient-to-br from-[#9D74FF] to-[#814FFF] rounded-full flex items-center justify-center shadow-md">
                 <CheckCircle2 className="w-5 h-5 text-white" />
               </div>
               <div>
                 <h4 className="text-sm font-bold text-white mb-0.5">Early Bird</h4>
                 <p className="text-xs text-[#8E92A4]">5 AM workout done</p>
               </div>
            </div>
            <span className="text-xs font-bold text-[#8E92A4]">Completed</span>
          </div>

          <div className="flex items-center justify-between p-4 group hover:bg-[#2A2D3A]/20 transition-colors opacity-50 grayscale hover:grayscale-0 cursor-not-allowed">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-[#2A2D3A] rounded-full flex items-center justify-center shadow-md">
                 <Trophy className="w-5 h-5 text-[#8E92A4]" />
               </div>
               <div>
                 <h4 className="text-sm font-bold text-white mb-0.5">Century Ride</h4>
                 <p className="text-xs text-[#8E92A4]">100 miles on a bike</p>
               </div>
            </div>
            <span className="text-xs font-bold text-[#8E92A4]">Locked</span>
          </div>
        </div>
      </section>

      {/* Hydration Reminder */}
      <section className="shrink-0 w-full mb-6">
        <div className="bg-gradient-to-r from-[#21D4B5]/20 to-[#32ADE6]/20 border border-[#21D4B5]/30 rounded-[20px] p-5 shadow-sm relative overflow-hidden flex items-center justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#21D4B5]/10 to-transparent rounded-bl-[100px] pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-[#22252E] rounded-full flex items-center justify-center shadow-md border border-[#21D4B5]/20">
              <Droplets className="w-6 h-6 text-[#21D4B5]" />
            </div>
            <div>
              <h4 className="text-white font-bold text-base mb-0.5">Hydration Goal: {waterRecommendation.target} oz</h4>
              <p className="text-[#8E92A4] text-xs font-medium max-w-[200px] leading-tight">
                {waterRecommendation.reason}
              </p>
            </div>
          </div>
          <button className="relative z-10 px-4 py-2 bg-[#21D4B5] text-[#1A1C23] font-bold text-xs rounded-full hover:bg-[#1bb89c] transition-colors shadow-lg shadow-[#21D4B5]/20">
            Log Water
          </button>
        </div>
      </section>

      {/* Daily Task */}
      <section className="shrink-0 w-full mb-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-white">Daily Task</h3>
          <button className="text-[#21D4B5] text-sm font-semibold hover:underline">See all</button>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4 bg-[#22252E] p-3 pr-5 rounded-[20px]">
            <img src="https://images.unsplash.com/photo-1594381898411-846e7d193883?q=80&w=200&auto=format&fit=crop" className="w-[70px] h-[70px] rounded-[16px] object-cover bg-gray-800" alt="Exercise 1" />
            
            <div className="flex-1">
              <h4 className="text-white font-bold text-base mb-1">Exercise 1</h4>
              <div className="flex items-center gap-3">
                 <div className="flex items-center gap-1">
                   <Clock className="w-3 h-3 text-[#34C759]" />
                   <span className="text-[#34C759] text-xs font-semibold">5 min</span>
                 </div>
                 <div className="flex items-center gap-1">
                   <Flame className="w-3 h-3 text-[#FFB300]" />
                   <span className="text-[#FFB300] text-xs font-semibold">100 cal</span>
                 </div>
              </div>
            </div>
            
            <button className="w-10 h-10 bg-[#FF6B00]/10 rounded-full flex items-center justify-center hover:bg-[#FF6B00]/20 transition-colors">
              <Play className="w-4 h-4 text-[#FF6B00] ml-0.5 fill-[#FF6B00]" />
            </button>
          </div>
          
          <div className="flex items-center gap-4 bg-[#22252E] p-3 pr-5 rounded-[20px]">
             <img src="https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=200&auto=format&fit=crop" className="w-[70px] h-[70px] rounded-[16px] object-cover bg-gray-800" alt="Exercise 2" />
             
             <div className="flex-1">
               <h4 className="text-white font-bold text-base mb-1">Exercise 2</h4>
               <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#34C759]" />
                    <span className="text-[#34C759] text-xs font-semibold">10 min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-[#FFB300]" />
                    <span className="text-[#FFB300] text-xs font-semibold">150 cal</span>
                  </div>
               </div>
             </div>
             
             <button className="w-10 h-10 bg-[#2A2D3A] rounded-full flex items-center justify-center hover:bg-[#333848] transition-colors">
               <Play className="w-4 h-4 text-white ml-0.5 fill-white" />
             </button>
          </div>
        </div>
      </section>

      {/* Calendar Section */}
      <section className="shrink-0 w-full mb-10 text-white">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-white" />
            <h3 className="text-lg font-bold text-white">My Schedule</h3>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={prevMonth}
              className="w-8 h-8 rounded-full bg-[#2A2D3A] flex items-center justify-center hover:bg-brand-surface transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <span className="text-sm font-semibold min-w-[100px] text-center">
              {formatMonth(currentDate)}
            </span>
            <button 
              onClick={nextMonth}
              className="w-8 h-8 rounded-full bg-[#2A2D3A] flex items-center justify-center hover:bg-brand-surface transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <div className="bg-[#22252E] rounded-[24px] p-5 shadow-lg">
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-center text-[#8E92A4] text-xs font-semibold py-1">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="h-10" />;
              
              const dateObj = day;
              const dateNum = dateObj.getDate();
              const isToday = new Date().toDateString() === dateObj.toDateString();
              const isSelected = selectedDate.toDateString() === dateObj.toDateString();
              
              // Only simulate data for current month (June)
              const status = currentDate.getMonth() === 5 ? workoutData[dateNum] : undefined;

              return (
                <button
                  key={dateNum}
                  onClick={() => setSelectedDate(dateObj)}
                  className={cn(
                    "h-10 w-full rounded-xl flex items-center justify-center relative transition-all duration-200 text-sm font-medium",
                    isSelected ? "bg-gradient-to-br from-[#814FFF] to-[#C08CFF] text-white shadow-lg scale-110 z-10" : "hover:bg-[#2A2D3A]",
                    !isSelected && isToday && "border border-[#814FFF] text-[#814FFF]",
                    !isSelected && !isToday && "text-white"
                  )}
                >
                  {dateNum}
                  
                  {/* Status Indicator */}
                  {status && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex justify-center">
                      {status === 'completed' && <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]" />}
                      {status === 'scheduled' && <span className="w-1.5 h-1.5 rounded-full bg-[#FFB300]" />}
                      {status === 'missed' && <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30]" />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Date Details */}
          <div className="mt-6 pt-5 border-t border-[#2A2D3A]">
            <h4 className="text-[#8E92A4] text-xs font-bold uppercase tracking-wider mb-3">
              {selectedDate.toDateString() === new Date().toDateString() ? "Today's Schedule" : selectedDate.toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric' })}
            </h4>
            
            {currentDate.getMonth() === 5 && workoutData[selectedDate.getDate()] === 'completed' ? (
              <div className="flex items-center gap-3 bg-[#34C759]/10 border border-[#34C759]/30 p-3 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-[#34C759]" />
                <div className="flex-1">
                  <p className="text-white text-sm font-semibold">Upper Body Sculpt</p>
                  <p className="text-[#34C759] text-xs">Completed! Great job.</p>
                </div>
              </div>
            ) : currentDate.getMonth() === 5 && workoutData[selectedDate.getDate()] === 'scheduled' ? (
              <div className="flex items-center gap-3 bg-[#2A2D3A] p-3 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-[#814FFF]/20 flex items-center justify-center">
                  <Navigation className="w-4 h-4 text-[#C08CFF]" />
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-semibold">Leg Day Power</p>
                  <p className="text-[#8E92A4] text-xs">Scheduled at 5:00 PM</p>
                </div>
                <button className="px-3 py-1 bg-white text-black text-xs font-bold rounded-lg hover:bg-gray-200">
                  Join
                </button>
              </div>
            ) : currentDate.getMonth() === 5 && workoutData[selectedDate.getDate()] === 'missed' ? (
               <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 p-3 rounded-xl">
                 <div className="w-2 h-2 rounded-full bg-red-500" />
                 <div className="flex-1">
                   <p className="text-white text-sm font-semibold">Rest Day / Missed</p>
                 </div>
               </div>
            ) : (
              <div className="text-center py-4 bg-[#2A2D3A]/50 rounded-xl border border-dashed border-[#8E92A4]/30">
                <p className="text-[#8E92A4] text-sm">No workout scheduled</p>
                <button className="mt-2 text-[#21D4B5] text-xs font-semibold hover:underline">
                  + Add Plan
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Real-time Web Bluetooth Heart Rate Monitor Section */}
      <section className="shrink-0 w-full mb-10 text-white">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Heart className={cn(
              "w-5 h-5 text-red-500",
              (heartRate !== null || isSimulatingHR) && "animate-pulse"
            )} style={{
              animationDuration: heartRate ? `${60 / heartRate * 1000}ms` : '1000ms'
            }} />
            <h3 className="text-lg font-bold text-white">Real-Time Heart Rate</h3>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full font-mono",
              bleDevice ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
              isSimulatingHR ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
              "bg-gray-800 text-gray-400 border border-gray-700"
            )}>
              {bleDevice ? "BLE Connected" : isSimulatingHR ? "Simulator Active" : "Disconnected"}
            </span>
          </div>
        </div>

        <div className="bg-[#22252E] rounded-[24px] p-5 shadow-lg border border-[#2A2D3A]/20">
          
          {/* Main Monitor Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center mb-6">
            
            {/* Left Column: Huge BPM readout + animation */}
            <div className="flex flex-col items-center justify-center bg-[#1B1D25] rounded-2xl p-6 border border-[#2A2D3A]/50 relative overflow-hidden h-[180px]">
              
              {/* Pulsing Backlight */}
              {(heartRate !== null || isSimulatingHR) && (
                <div 
                  className="absolute inset-0 bg-red-500/5 mix-blend-screen pointer-events-none animate-pulse" 
                  style={{ animationDuration: heartRate ? `${60 / heartRate * 1000}ms` : '1000ms' }}
                />
              )}

              {heartRate ? (
                <div className="text-center z-10 w-full">
                  <div className="flex items-center justify-center gap-2">
                    <Heart className="w-8 h-8 text-red-500 fill-red-500 animate-pulse" style={{ animationDuration: `${60 / heartRate * 1000}ms` }} />
                    <span className="text-5xl font-black text-white tracking-tighter tabular-nums">
                      {heartRate}
                    </span>
                    <span className="text-xs text-[#8E92A4] font-bold uppercase self-end mb-2 font-mono">BPM</span>
                  </div>
                  
                  {/* Dynamic metabolic feedback zone */}
                  <div className="mt-3">
                    <span className={cn(
                      "text-xs px-3 py-1 rounded-full border font-semibold",
                      getHeartRateZone(heartRate).bg,
                      getHeartRateZone(heartRate).color,
                      getHeartRateZone(heartRate).border
                    )}>
                      {getHeartRateZone(heartRate).name}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8E92A4] mt-2 italic">
                    {getHeartRateZone(heartRate).desc}
                  </p>
                </div>
              ) : (
                <div className="text-center text-gray-500 z-10 px-4">
                  <Heart className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-[#8E92A4]">No active sensor connected</p>
                  <p className="text-xs text-gray-500 mt-1">Connect your smartwatch, heart strap or start simulator to monitor live health zones!</p>
                </div>
              )}
            </div>

            {/* Right Column: Connection Panel & Guides */}
            <div className="flex flex-col justify-between h-full min-h-[180px]">
              <div>
                <h4 className="text-white text-sm font-bold mb-1.5 flex items-center gap-1.5">
                  <Bluetooth className="w-4 h-4 text-blue-400" /> Web Bluetooth API Integration
                </h4>
                <p className="text-xs text-[#8E92A4] leading-relaxed mb-4">
                  Fully synchronized with your workout metrics. Broadcasts real-time metabolic and heart rate zones directly to the dashboard widgets.
                </p>
              </div>

              {/* Action Operations */}
              <div className="space-y-2.5">
                <div className="flex gap-2">
                  {!bleDevice && !isSimulatingHR ? (
                    <button
                      onClick={connectBluetooth}
                      disabled={isConnectingHR}
                      className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <Bluetooth className="w-3.5 h-3.5 animate-bounce" />
                      {isConnectingHR ? "Searching..." : "Pair Heart Rate Strap"}
                    </button>
                  ) : (
                    <button
                      onClick={disconnectBluetooth}
                      className="flex-1 py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <Wifi className="w-3.5 h-3.5" />
                      Stop Active Stream
                    </button>
                  )}

                  {/* Simulator Trigger */}
                  {!bleDevice && (
                    <button
                      onClick={() => {
                        const newSimulating = !isSimulatingHR;
                        setIsSimulatingHR(newSimulating);
                        if (newSimulating) {
                          setHeartRate(128); // Standard starting cardiovascular activity hr
                          setHrError(null);
                        } else {
                          setHeartRate(null);
                        }
                      }}
                      className={cn(
                        "py-2.5 px-4 font-bold text-xs rounded-xl transition-all border flex items-center gap-1.5",
                        isSimulatingHR 
                          ? "bg-purple-600 text-white border-purple-500 hover:bg-purple-500" 
                          : "bg-gray-800 text-[#8E92A4] border-gray-700 hover:text-white"
                      )}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {isSimulatingHR ? "Stop Sim" : "Run Demo Sim"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Iframe Restrictions Guidance or error logs */}
          {hrError && (
            <div className="mb-6 p-3.5 bg-yellow-500/5 border border-yellow-500/20 text-yellow-400 rounded-xl text-xs flex gap-3 leading-relaxed items-start">
              <AlertOctagon className="w-5 h-5 shrink-0 mt-0.5 text-yellow-500" />
              <div>
                <p className="font-bold mb-1">Iframe Environment Note</p>
                <p className="opacity-90">{hrError}</p>
              </div>
            </div>
          )}

          {/* Real-time scrolling telemetry Recharts graph */}
          {(heartRate !== null || isSimulatingHR) && hrHistory.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#2A2D3A]/80">
              <p className="text-[#8E92A4] text-xs font-semibold mb-3 flex items-center justify-between">
                <span>LIVE TELEMETRY WAVEFORM (SCROLLING IN SECONDS)</span>
                <span className="text-[10px] text-blue-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" /> Real-time 1Hz Interval
                </span>
              </p>
              
              <div className="h-[120px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hrHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHrGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" vertical={false} />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#8E92A4', fontSize: 10 }} />
                    <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fill: '#8E92A4', fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1B1D25', border: '1px solid #2A2D3A', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      itemStyle={{ color: '#EF4444', fontWeight: 'bold' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="bpm" 
                      stroke="#EF4444" 
                      strokeWidth={2.5} 
                      fillOpacity={1}
                      fill="url(#colorHrGrad)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#EF4444', stroke: '#fff', strokeWidth: 1.5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Intensity & Duration Trend */}
      <section className="shrink-0 w-full mb-10 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-accent" />
            <h3 className="text-lg font-bold text-white">Intensity & Duration Trends</h3>
          </div>
        </div>

        <div className="bg-[#22252E] border border-[#2A2D3A]/20 rounded-[24px] p-5 shadow-lg h-[320px]">
          <h4 className="text-[#8E92A4] text-xs font-bold uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>Weekly Workload Analysis</span>
            <span className="text-[10px] bg-[#2A2D3A] text-[#8E92A4] font-semibold px-2 py-0.5 rounded uppercase font-mono">
              Composed Chart
            </span>
          </h4>
          
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8E92A4', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8E92A4', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#2A2D3A', border: '1px solid #3A3D4A', borderRadius: '12px', color: '#fff' }}
                itemStyle={{ fontWeight: 'bold' }}
                cursor={{ fill: '#2A2D3A', opacity: 0.4 }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
              <Line 
                type="monotone"
                dataKey="minutes" 
                name="Duration (min)"
                stroke="#FFB300" 
                strokeWidth={3}
                dot={{ fill: '#22252E', stroke: '#FFB300', strokeWidth: 2, r: 5 }} 
                activeDot={{ r: 7, fill: '#FFB300', stroke: '#fff', strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="intensity" 
                name="Avg HR (bpm)"
                stroke="#EF4444" 
                strokeWidth={3}
                dot={{ fill: '#22252E', stroke: '#EF4444', strokeWidth: 2, r: 5 }} 
                activeDot={{ r: 7, fill: '#EF4444', stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Activity Trend */}
      <section className="shrink-0 w-full mb-10 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <ActivityIcon className="w-5 h-5 text-white" />
            <h3 className="text-lg font-bold text-white">Weekly Analytics</h3>
          </div>
          
          {/* Recharts metric selectors resembling polished tabs */}
          <div className="flex flex-wrap gap-1 bg-[#181a22] p-1 rounded-xl border border-[#2A2D3A]">
            {(["calories", "distance", "minutes", "workouts"] as const).map((metric) => (
              <button
                key={metric}
                onClick={() => setSelectedMetric(metric)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-200",
                  selectedMetric === metric
                    ? "bg-[#814FFF] text-white shadow-[0_0_10px_rgba(129,79,255,0.4)]"
                    : "text-[#8E92A4] hover:text-white"
                )}
              >
                {metric === "minutes" ? "Time" : metric}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Summary Cards to display weekly totals and averages */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-[#22252E] border border-[#2A2D3A] rounded-[20px] p-4 flex flex-col">
            <span className="text-[#8E92A4] text-xs font-semibold">Weekly Total</span>
            <span className="text-xl font-bold text-white mt-1">
              {activityData.reduce((acc, curr) => acc + (curr[selectedMetric] || 0), 0).toFixed(selectedMetric === 'distance' ? 1 : 0)}{" "}
              <span className="text-xs text-[#8E92A4] font-semibold font-mono">
                {selectedMetric === "calories" ? "kcal" : selectedMetric === "distance" ? "km" : selectedMetric === "minutes" ? "min" : "sessions"}
              </span>
            </span>
          </div>
          <div className="bg-[#22252E] border border-[#2A2D3A] rounded-[20px] p-4 flex flex-col">
            <span className="text-[#8E92A4] text-xs font-semibold">Daily Average</span>
            <span className="text-xl font-bold text-white mt-1">
              {(activityData.reduce((acc, curr) => acc + (curr[selectedMetric] || 0), 0) / 7).toFixed(selectedMetric === 'distance' ? 1 : 0)}{" "}
              <span className="text-xs text-[#8E92A4] font-semibold font-mono">
                {selectedMetric === "calories" ? "kcal" : selectedMetric === "distance" ? "km" : selectedMetric === "minutes" ? "min" : "workouts"}
              </span>
            </span>
          </div>
        </div>
        
        <div className="bg-[#22252E] border border-[#2A2D3A]/20 rounded-[24px] p-5 shadow-lg h-[280px]">
          <h4 className="text-[#8E92A4] text-xs font-bold uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>
              {selectedMetric === "calories" && "Calories Burned"}
              {selectedMetric === "distance" && "Distance Traveled"}
              {selectedMetric === "minutes" && "Active Minutes"}
              {selectedMetric === "workouts" && "Completed Workouts"}
            </span>
            <span className="text-[10px] bg-[#2A2D3A] text-[#8E92A4] font-semibold px-2 py-0.5 rounded uppercase font-mono">
              Value Timeline
            </span>
          </h4>
          
          <ResponsiveContainer width="100%" height="90%">
            {selectedMetric === "calories" ? (
              <AreaChart data={activityData} margin={{ top: 5, right: 5, left: -20, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorCaloriesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#814FFF" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#C08CFF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8E92A4', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8E92A4', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#2A2D3A', border: '1px solid #3A3D4A', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#C08CFF', fontWeight: 'bold' }}
                  cursor={{ stroke: '#3A3D4A', strokeWidth: 2 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="calories" 
                  stroke="#814FFF" 
                  strokeWidth={3} 
                  fillOpacity={1}
                  fill="url(#colorCaloriesGrad)"
                  dot={{ fill: '#22252E', stroke: '#C08CFF', strokeWidth: 2, r: 4 }} 
                  activeDot={{ r: 6, fill: '#C08CFF', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            ) : selectedMetric === "distance" ? (
              <BarChart data={activityData} margin={{ top: 5, right: 5, left: -20, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorDistanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#21D4B5" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#21D4B5" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8E92A4', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8E92A4', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#2A2D3A', border: '1px solid #3A3D4A', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#21D4B5', fontWeight: 'bold' }}
                />
                <Bar 
                  dataKey="distance" 
                  fill="url(#colorDistanceGrad)" 
                  radius={[8, 8, 0, 0]} 
                  maxBarSize={30}
                />
              </BarChart>
            ) : selectedMetric === "minutes" ? (
              <AreaChart data={activityData} margin={{ top: 5, right: 5, left: -20, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorMinGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFB300" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#FF6B00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8E92A4', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8E92A4', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#2A2D3A', border: '1px solid #3A3D4A', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#FFB300', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="minutes" 
                  stroke="#FFB300" 
                  strokeWidth={3} 
                  fillOpacity={1}
                  fill="url(#colorMinGrad)"
                  dot={{ fill: '#22252E', stroke: '#FFB300', strokeWidth: 2, r: 4 }}
                />
              </AreaChart>
            ) : (
              <BarChart data={activityData} margin={{ top: 5, right: 5, left: -20, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorWorkoutsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8E92A4', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8E92A4', fontSize: 12 }} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#2A2D3A', border: '1px solid #3A3D4A', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#3B82F6', fontWeight: 'bold' }}
                />
                <Bar 
                  dataKey="workouts" 
                  fill="url(#colorWorkoutsGrad)" 
                  radius={[8, 8, 0, 0]} 
                  maxBarSize={30}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </section>

    </div>
    </div>
  );
}
