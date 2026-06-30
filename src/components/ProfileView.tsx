import React, { useState, useEffect } from 'react';
import { Camera, Edit2, Settings, MapPin, Grid, List, Activity, Medal, Users, UserPlus, MessageCircle, ChevronRight, CheckCircle2, TrendingUp, Calendar, Heart, Share2, Award, Flame, BarChart3, Trophy, Clock, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Webcam from 'react-webcam';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';

export function ProfileView() {
  const { id: profileId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "badges" | "friends" | "posts" | "progress">("overview");
  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  const [newPostText, setNewPostText] = useState("");
  const [newPostLocation, setNewPostLocation] = useState("");
  const [newPostTags, setNewPostTags] = useState("");
  const [newPostMentions, setNewPostMentions] = useState("");
  const [newPostPicture, setNewPostPicture] = useState<string | null>(null);
  const [newPostWorkoutType, setNewPostWorkoutType] = useState("");
  const [newPostWorkoutDuration, setNewPostWorkoutDuration] = useState("");
  const [newPostWorkoutDistance, setNewPostWorkoutDistance] = useState("");
  const [newPostWorkoutCalories, setNewPostWorkoutCalories] = useState("");
  const [showExpandedPostForm, setShowExpandedPostForm] = useState(false);

  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editingPostText, setEditingPostText] = useState("");

  const [progressPhotos, setProgressPhotos] = useState<{id: string, uri: string, date: string, weight?: string}[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photoWeight, setPhotoWeight] = useState("");
  const webcamRef = React.useRef<Webcam>(null);

  const capturePhoto = React.useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setProgressPhotos([{ id: Date.now().toString(), uri: imageSrc, date: new Date().toISOString(), weight: photoWeight }, ...progressPhotos]);
        setIsCameraOpen(false);
        setPhotoWeight("");
      }
    }
  }, [webcamRef, progressPhotos, photoWeight]);

  const [goals, setGoals] = useState({
    activeMin: { current: 405, target: 500, label: "Active Minutes" },
    workouts: { current: 5, target: 6, label: "Workouts" },
    calories: { current: 2970, target: 3500, label: "Calories" }
  });
  const [showEditGoals, setShowEditGoals] = useState(false);

  // Queries
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");
      const { data, error } = await supabase.from('User').select('*').eq('id', user.id).single();
      if (error && error.code !== 'PGRST116') throw error; // Handle no rows gracefully later
      return { authUser: user, profile: data };
    }
  });

  const targetUserId = profileId || user?.authUser?.id;
  const isOwnProfile = !profileId || profileId === user?.authUser?.id;

  const { data: viewedProfile } = useQuery({
    queryKey: ['userProfile', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;
      const { data, error } = await supabase.from('User').select('*').eq('id', targetUserId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!targetUserId
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('User').select('id, name, avatar');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: friendRequests = [] } = useQuery({
    queryKey: ['friendRequests'],
    queryFn: async () => {
      if (!user?.authUser) return [];
      const { data, error } = await supabase.from('FriendRequest')
        .select('*, sender:senderId(name, avatar), receiver:receiverId(name, avatar)')
        .or(`senderId.eq.${user.authUser.id},receiverId.eq.${user.authUser.id}`);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.authUser
  });

  const { data: friendships = [] } = useQuery({
    queryKey: ['friendships'],
    queryFn: async () => {
      if (!user?.authUser) return [];
      const { data, error } = await supabase.from('Friendship')
        .select('*, user1:user1Id(name, avatar), user2:user2Id(name, avatar)')
        .or(`user1Id.eq.${user.authUser.id},user2Id.eq.${user.authUser.id}`);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.authUser
  });

  const sendFriendRequest = useMutation({
    mutationFn: async (receiverId: string) => {
      if (!user?.authUser) throw new Error("Not logged in");
      const { error } = await supabase.from('FriendRequest').insert({
        senderId: user.authUser.id,
        receiverId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
    }
  });

  const updateFriendRequest = useMutation({
    mutationFn: async ({ requestId, status, senderId }: { requestId: string, status: string, senderId: string }) => {
      if (!user?.authUser) throw new Error("Not logged in");
      const { error } = await supabase.from('FriendRequest').update({ status }).eq('id', requestId);
      if (error) throw error;

      if (status === 'ACCEPTED') {
        const { error: friendErr } = await supabase.from('Friendship').insert({
          user1Id: senderId,
          user2Id: user.authUser.id
        });
        if (friendErr) throw friendErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
    }
  });

  const { data: workouts = [] } = useQuery({
    queryKey: ['workouts', user?.authUser?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('Workout').select('*').eq('userId', user!.authUser.id).order('startTime', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.authUser?.id
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['posts', user?.authUser?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('Activity').select('*, likes:ActivityLike(count), comments:ActivityComment(count)').eq('userId', user!.authUser.id).order('time', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.authUser?.id
  });

  const { data: badges = [] } = useQuery({
    queryKey: ['badges', user?.authUser?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('Badge').select('*').eq('userId', user!.authUser.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.authUser?.id
  });

  const profileData = {
    name: user?.profile?.name || user?.authUser?.user_metadata?.full_name || "New Athlete",
    username: user?.profile?.email?.split('@')[0] || "athlete",
    location: "Unknown Location",
    bio: "Ready to crush goals.",
    email: user?.authUser?.email || "",
    notifications: true,
    privateProfile: false,
    profilePic: user?.profile?.avatar || user?.authUser?.user_metadata?.avatar_url || "https://i.pravatar.cc/150?u=" + (user?.authUser?.id || "default")
  };

  // Transform workouts into weekly data for chart
  const dayMap: Record<string, any> = {
    'Mon': { day: 'Mon', calories: 0, activeMin: 0 },
    'Tue': { day: 'Tue', calories: 0, activeMin: 0 },
    'Wed': { day: 'Wed', calories: 0, activeMin: 0 },
    'Thu': { day: 'Thu', calories: 0, activeMin: 0 },
    'Fri': { day: 'Fri', calories: 0, activeMin: 0 },
    'Sat': { day: 'Sat', calories: 0, activeMin: 0 },
    'Sun': { day: 'Sun', calories: 0, activeMin: 0 },
  };
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  workouts.forEach((w: any) => {
    const date = new Date(w.startTime);
    if (!isNaN(date.getTime())) {
      const dName = dayNames[date.getDay()];
      if (dayMap[dName]) {
        dayMap[dName].activeMin += (w.duration / 60) || 0;
        dayMap[dName].calories += ((w.distance / 1000) * 70) || 0;
      }
    }
  });
  const weeklyData = Object.values(dayMap);
  const stats = { followers: 0, following: 0, activities: workouts.length };

  return (
    <div className="h-full flex flex-col bg-[#1A1C23] overflow-y-auto pb-24 md:pb-10">
      {/* Header Profile Section */}
      <div className="px-6 md:px-8 pt-8 pb-6 border-b border-[#2A2D3A]">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#21D4B5] to-[#32ADE6] p-1">
              <div className="w-full h-full rounded-full bg-[#1A1C23] flex items-center justify-center overflow-hidden font-bold text-2xl text-white">
                {profileData.profilePic ? (
                  <img src={profileData.profilePic} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  profileData.name.charAt(0)
                )}
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">{profileData.name}</h2>
              <p className="text-brand-text-secondary text-sm">@{profileData.email?.split('@')[0] || profileData.id?.substring(0, 8)}</p>
              {profileData.bio && (
                <p className="text-white text-sm mt-2">{profileData.bio}</p>
              )}
              <div className="flex items-center gap-1 mt-2 text-[#8E92A4] text-xs font-medium">
                <MapPin className="w-3 h-3" />
                {profileData.location || "Earth"}
              </div>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex flex-col cursor-pointer hover:opacity-80" onClick={() => setActiveTab("friends")}>
                  <span className="text-white font-bold text-sm">{stats.followers}</span>
                  <span className="text-[#8E92A4] text-[10px] uppercase tracking-wider">Followers</span>
                </div>
                <div className="flex flex-col cursor-pointer hover:opacity-80" onClick={() => setActiveTab("friends")}>
                  <span className="text-white font-bold text-sm">{stats.following}</span>
                  <span className="text-[#8E92A4] text-[10px] uppercase tracking-wider">Following</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-bold text-sm">{stats.activities}</span>
                  <span className="text-[#8E92A4] text-[10px] uppercase tracking-wider">Activities</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {!isOwnProfile ? (
              <>
                <button
                  onClick={() => {
                     // Check if following
                     const isFollowing = viewedProfile?.followers?.some((f: any) => f.id === user?.authUser?.id);
                     if (isFollowing) {
                        // Unfollow logic...
                     } else {
                        // Follow logic
                     }
                  }}
                  className="px-6 py-2 rounded-full bg-brand-accent text-white hover:bg-brand-accent-hover font-semibold transition-colors"
                >
                  Follow
                </button>
                <button
                  onClick={() => navigate('/chat', { state: { recipientId: targetUserId, isGroup: false, name: profileData.name } })}
                  className="px-6 py-2 rounded-full bg-[#2A2D3A] text-white hover:bg-[#3A3D4A] font-semibold transition-colors flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" /> Message
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setShowEditProfile(true)} className="w-10 h-10 rounded-full bg-[#2A2D3A] flex items-center justify-center text-white hover:bg-[#3A3D4A] transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => setShowSettings(true)} className="w-10 h-10 rounded-full bg-[#2A2D3A] flex items-center justify-center text-white hover:bg-[#3A3D4A] transition-colors">
                  <Settings className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mt-4 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "pb-2 text-sm font-bold transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap",
              activeTab === "overview" 
                ? "text-white border-[#21D4B5]" 
                : "text-[#8E92A4] border-transparent hover:text-white"
            )}
          >
            <BarChart3 className="w-4 h-4" />
            Overview & Analytics
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "pb-2 text-sm font-bold transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap",
              activeTab === "history" 
                ? "text-white border-[#21D4B5]" 
                : "text-[#8E92A4] border-transparent hover:text-white"
            )}
          >
            <Activity className="w-4 h-4" />
            Workout History
          </button>
          <button
            onClick={() => setActiveTab("badges")}
            className={cn(
              "pb-2 text-sm font-bold transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap",
              activeTab === "badges" 
                ? "text-white border-[#21D4B5]" 
                : "text-[#8E92A4] border-transparent hover:text-white"
            )}
          >
            <Trophy className="w-4 h-4" />
            Badges
          </button>
          <button
            onClick={() => setActiveTab("friends")}
            className={cn(
              "pb-2 text-sm font-bold transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap",
              activeTab === "friends" 
                ? "text-white border-[#21D4B5]" 
                : "text-[#8E92A4] border-transparent hover:text-white"
            )}
          >
            <Users className="w-4 h-4" />
            Friends
          </button>
          <button
            onClick={() => setActiveTab("posts")}
            className={cn(
              "pb-2 text-sm font-bold transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap",
              activeTab === "posts" 
                ? "text-white border-[#21D4B5]" 
                : "text-[#8E92A4] border-transparent hover:text-white"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            Posts
          </button>
          <button
            onClick={() => setActiveTab("progress")}
            className={cn(
              "pb-2 text-sm font-bold transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap",
              activeTab === "progress" 
                ? "text-white border-[#21D4B5]" 
                : "text-[#8E92A4] border-transparent hover:text-white"
            )}
          >
            <Camera className="w-4 h-4" />
            Progress Gallery
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 md:p-8 max-w-5xl mx-auto w-full">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Weekly Goals */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Weekly Goals</h3>
                <button onClick={() => setShowEditGoals(true)} className="text-[#21D4B5] text-sm font-semibold hover:underline">Edit Goals</button>
              </div>
              <div className="bg-[#22252E] rounded-[20px] p-5 border border-[#2A2D3A]/50 mb-6 space-y-4">
                {[
                  { id: 'activeMin', data: goals.activeMin, color: '#32ADE6' },
                  { id: 'workouts', data: goals.workouts, color: '#9D74FF' },
                  { id: 'calories', data: goals.calories, color: '#FFB300' }
                ].map((goal) => {
                  const percent = Math.min(100, Math.round((goal.data.current / goal.data.target) * 100));
                  return (
                    <div key={goal.id}>
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-white font-bold text-sm">{goal.data.label}</span>
                        <div className="text-right">
                           <span className="text-white font-bold">{goal.data.current}</span>
                           <span className="text-[#8E92A4] text-xs"> / {goal.data.target}</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-[#1A1C23] rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500 ease-out" 
                          style={{ width: `${percent}%`, backgroundColor: goal.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
            
            {/* Analytics Stats */}
            <section>
              <h3 className="text-lg font-bold text-white mb-4">Weekly Analytics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-[#22252E] rounded-[20px] p-4 border border-[#2A2D3A]/50">
                  <div className="text-[#8E92A4] text-xs font-bold mb-1 uppercase tracking-wider">Total Active Min</div>
                  <div className="text-2xl font-black text-white">405<span className="text-sm font-bold text-[#8E92A4] ml-1">min</span></div>
                  <div className="text-[#21D4B5] text-xs font-semibold flex items-center mt-1">
                    <TrendingUp className="w-3 h-3 mr-1" /> +12% this week
                  </div>
                </div>
                <div className="bg-[#22252E] rounded-[20px] p-4 border border-[#2A2D3A]/50">
                  <div className="text-[#8E92A4] text-xs font-bold mb-1 uppercase tracking-wider">Calories Burned</div>
                  <div className="text-2xl font-black text-white">2,970<span className="text-sm font-bold text-[#8E92A4] ml-1">kcal</span></div>
                  <div className="text-[#21D4B5] text-xs font-semibold flex items-center mt-1">
                    <TrendingUp className="w-3 h-3 mr-1" /> +5% this week
                  </div>
                </div>
                <div className="bg-[#22252E] rounded-[20px] p-4 border border-[#2A2D3A]/50">
                  <div className="text-[#8E92A4] text-xs font-bold mb-1 uppercase tracking-wider">Workouts</div>
                  <div className="text-2xl font-black text-white">5</div>
                  <div className="text-[#8E92A4] text-xs font-semibold mt-1">
                    Target: 6 / week
                  </div>
                </div>
                <div className="bg-[#22252E] rounded-[20px] p-4 border border-[#2A2D3A]/50">
                  <div className="text-[#8E92A4] text-xs font-bold mb-1 uppercase tracking-wider">Avg Heart Rate</div>
                  <div className="text-2xl font-black text-white">132<span className="text-sm font-bold text-[#8E92A4] ml-1">bpm</span></div>
                  <div className="text-[#FFB300] text-xs font-semibold mt-1 flex items-center">
                    <Activity className="w-3 h-3 mr-1" /> Zone 3
                  </div>
                </div>
              </div>
              
              <div className="bg-[#22252E] rounded-[20px] p-5 border border-[#2A2D3A]/50 h-64">
                <div className="flex justify-between items-center mb-4">
                   <h4 className="text-sm font-bold text-white">Activity Overview (Calories)</h4>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <XAxis dataKey="day" stroke="#8E92A4" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#8E92A4" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1A1C23', border: '1px solid #2A2D3A', borderRadius: '8px' }}
                      itemStyle={{ color: '#21D4B5' }}
                    />
                    <Line type="monotone" dataKey="calories" stroke="#21D4B5" strokeWidth={3} dot={{ r: 4, fill: '#1A1C23', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Workout Plan */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Current Workout Plan</h3>
                <button className="text-[#21D4B5] text-sm font-semibold hover:underline">Edit Plan</button>
              </div>
              <div className="bg-[#22252E] border border-[#2A2D3A]/50 rounded-[20px] p-5 shadow-sm">
                 <div className="flex items-center gap-4 mb-4">
                   <div className="w-12 h-12 rounded-xl bg-[#32ADE6]/20 flex items-center justify-center">
                     <Target className="w-6 h-6 text-[#32ADE6]" />
                   </div>
                   <div>
                     <h4 className="text-white font-bold text-base">Half-Marathon Prep</h4>
                     <p className="text-[#8E92A4] text-xs font-medium">Week 4 of 12 • 3 days/week</p>
                   </div>
                 </div>
                 
                 <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#1A1C23] border border-[#2A2D3A]/50">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-[#21D4B5]/20 flex items-center justify-center">
                           <CheckCircle2 className="w-4 h-4 text-[#21D4B5]" />
                         </div>
                         <div>
                           <div className="text-white font-bold text-sm">Tempo Run</div>
                           <div className="text-[#8E92A4] text-xs">Tuesday • 45 min</div>
                         </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#1A1C23] border border-[#2A2D3A]/50">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-[#2A2D3A] flex items-center justify-center">
                           <Clock className="w-4 h-4 text-white" />
                         </div>
                         <div>
                           <div className="text-white font-bold text-sm">Intervals</div>
                           <div className="text-[#8E92A4] text-xs">Thursday • 30 min</div>
                         </div>
                      </div>
                      <button className="text-xs font-bold text-[#21D4B5] bg-[#21D4B5]/10 px-3 py-1.5 rounded-full">Start</button>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#1A1C23] border border-[#2A2D3A]/50">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-[#2A2D3A] flex items-center justify-center">
                           <Calendar className="w-4 h-4 text-[#8E92A4]" />
                         </div>
                         <div>
                           <div className="text-white font-bold text-sm">Long Run</div>
                           <div className="text-[#8E92A4] text-xs">Saturday • 90 min</div>
                         </div>
                      </div>
                    </div>
                 </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-4">
             <h3 className="text-lg font-bold text-white mb-4">Athletic Activity & History</h3>
             {workouts.length > 0 ? (
               workouts.map((workout: any, i: number) => (
                 <div key={i} className="bg-[#22252E] border border-[#2A2D3A]/50 rounded-[20px] p-4 flex items-center justify-between group hover:bg-[#2A2D3A]/20 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                       <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md bg-[#21D4B5]/20`}>
                         <Activity className="w-6 h-6 text-[#21D4B5]" />
                       </div>
                       <div>
                         <h4 className="text-white font-bold text-base">{workout.activityType || "Workout"}</h4>
                         <p className="text-[#8E92A4] text-xs mb-1">{new Date(workout.startTime).toLocaleString()} • {Math.round(workout.duration / 60)}m</p>
                         <div className="inline-block bg-[#1A1C23] px-2 py-0.5 rounded text-[10px] font-bold text-[#8E92A4]">
                           {(workout.distance / 1000).toFixed(1)} km • {Math.round((workout.distance / 1000) * 70)} kcal
                         </div>
                       </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#8E92A4] group-hover:text-white transition-colors" />
                 </div>
               ))
             ) : (
               <div className="text-[#8E92A4] py-8 text-center">No recent workouts</div>
             )}
          </div>
        )}

        {activeTab === "badges" && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white mb-4">Personal Badges & Achievements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {badges.length > 0 ? (
                badges.map((badge: any, i: number) => (
                  <div key={badge._id || i} className="flex items-center justify-between p-4 bg-[#22252E] border border-[#2A2D3A]/50 rounded-[20px] shadow-sm">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-gradient-to-br from-[#32ADE6] to-[#21D4B5] rounded-full flex items-center justify-center shadow-md">
                         <Trophy className="w-6 h-6 text-white" />
                       </div>
                       <div>
                         <h4 className="text-base font-bold text-white mb-0.5">{badge.name}</h4>
                         <p className="text-xs text-[#8E92A4]">{badge.description}</p>
                       </div>
                    </div>
                    <span className="text-xs font-bold text-[#8E92A4]">{new Date(badge.earnedAt || badge.dateEarned).toLocaleDateString()}</span>
                  </div>
                ))
              ) : (
                <div className="col-span-1 md:col-span-2 text-center text-[#8E92A4] py-8">No badges earned yet. Keep grinding!</div>
              )}
            </div>
          </div>
        )}

        {activeTab === "friends" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Friends & Network</h3>
            </div>

            {/* Pending Requests */}
            {friendRequests.filter((r: any) => r.receiverId === user?.authUser?.id && r.status === 'PENDING').length > 0 && (
              <>
                <h3 className="text-md font-bold text-white mb-2">Pending Requests</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {friendRequests.filter((r: any) => r.receiverId === user?.authUser?.id && r.status === 'PENDING').map((req: any) => (
                    <div key={req.id} className="bg-[#22252E] border border-[#2A2D3A]/50 rounded-[20px] p-4 flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-full bg-[#1A1C23] overflow-hidden">
                           <img src={req.sender?.avatar || "https://i.pravatar.cc/150"} alt={req.sender?.name} className="w-full h-full object-cover" />
                         </div>
                         <div>
                           <h4 className="text-white font-bold text-base leading-tight">{req.sender?.name || 'Unknown User'}</h4>
                           <p className="text-[#8E92A4] text-xs">Wants to be friends</p>
                         </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => updateFriendRequest.mutate({ requestId: req.id, status: 'ACCEPTED', senderId: req.senderId })} className="p-2 rounded-full bg-[#21D4B5] text-[#1A1C23] hover:opacity-80 transition-opacity">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => updateFriendRequest.mutate({ requestId: req.id, status: 'REJECTED', senderId: req.senderId })} className="p-2 rounded-full bg-[#2A2D3A] text-white hover:bg-red-500/20 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* My Friends */}
            <h3 className="text-md font-bold text-white mb-2">My Friends</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {friendships.length === 0 ? (
                <p className="text-[#8E92A4] text-sm">No friends yet. Start adding people below!</p>
              ) : (
                friendships.map((f: any) => {
                  const friendInfo = f.user1Id === user?.authUser?.id ? f.user2 : f.user1;
                  return (
                    <div key={f.id} className="bg-[#22252E] border border-[#2A2D3A]/50 rounded-[20px] p-4 flex items-center justify-between group hover:bg-[#2A2D3A]/20 transition-colors">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-full bg-[#1A1C23] overflow-hidden">
                           <img src={friendInfo?.avatar || "https://i.pravatar.cc/150"} alt={friendInfo?.name} className="w-full h-full object-cover" />
                         </div>
                         <div>
                           <h4 className="text-white font-bold text-base leading-tight">{friendInfo?.name || 'Unknown'}</h4>
                           <p className="text-[#8E92A4] text-xs">Active Athlete</p>
                         </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <h3 className="text-lg font-bold text-white mt-8 mb-4">Discover Athletes</h3>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {allUsers
                .filter((u: any) => u.id !== user?.authUser?.id)
                .filter((u: any) => !friendships.find((f: any) => f.user1Id === u.id || f.user2Id === u.id))
                .map((u: any) => {
                  const pendingReq = friendRequests.find((r: any) => (r.receiverId === u.id || r.senderId === u.id) && r.status === 'PENDING');
                  return (
                    <div key={u.id} className="bg-[#22252E] border border-[#2A2D3A]/50 rounded-2xl p-4 flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-full bg-[#1A1C23] overflow-hidden mb-3">
                        <img src={u.avatar || "https://i.pravatar.cc/150"} alt={u.name} className="w-full h-full object-cover" />
                      </div>
                      <h4 className="text-white font-bold text-sm mb-1">{u.name}</h4>
                      <button 
                        onClick={() => {
                          if (!pendingReq) {
                            sendFriendRequest.mutate(u.id);
                          }
                        }}
                        disabled={!!pendingReq || sendFriendRequest.isPending}
                        className="mt-3 px-4 py-1.5 rounded-full bg-[#2A2D3A] text-white text-xs font-semibold hover:bg-[#21D4B5] hover:text-[#1A1C23] transition-colors w-full flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {pendingReq ? (pendingReq.senderId === user?.authUser?.id ? 'Request Sent' : 'Respond') : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            Add Friend
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {activeTab === "posts" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white mb-4">My Posts</h3>
            
            {/* Create Post */}
            <div className="bg-[#22252E] border border-[#2A2D3A]/50 rounded-[20px] p-4 shadow-sm flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1A1C23] flex items-center justify-center overflow-hidden shrink-0 font-bold text-sm text-white">
                  {profileData.profilePic ? (
                    <img src={profileData.profilePic} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    profileData.name.charAt(0)
                  )}
                </div>
                <div className="flex-1">
                  <textarea 
                    value={newPostText}
                    onChange={(e) => setNewPostText(e.target.value)}
                    onFocus={() => setShowExpandedPostForm(true)}
                    placeholder="Share your latest workout or thought..." 
                    className="w-full bg-transparent border-none focus:outline-none text-white text-sm resize-none h-10 placeholder:text-[#8E92A4] py-2"
                  />
                  
                  {showExpandedPostForm && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-3 mt-2 overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E92A4]" />
                          <input 
                            type="text" 
                            placeholder="Location" 
                            value={newPostLocation}
                            onChange={(e) => setNewPostLocation(e.target.value)}
                            className="w-full bg-[#1A1C23] border border-[#2A2D3A] rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#21D4B5]"
                          />
                        </div>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E92A4]" />
                          <input 
                            type="text" 
                            placeholder="Tags (comma separated)" 
                            value={newPostTags}
                            onChange={(e) => setNewPostTags(e.target.value)}
                            className="w-full bg-[#1A1C23] border border-[#2A2D3A] rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#21D4B5]"
                          />
                        </div>
                        <div className="relative">
                          <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E92A4]" />
                          <input 
                            type="text" 
                            placeholder="Mentions (comma separated)" 
                            value={newPostMentions}
                            onChange={(e) => setNewPostMentions(e.target.value)}
                            className="w-full bg-[#1A1C23] border border-[#2A2D3A] rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#21D4B5]"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="relative col-span-2">
                           <p className="text-xs font-bold text-[#8E92A4] mb-1">Workout Data (Optional)</p>
                        </div>
                        <div className="relative">
                          <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E92A4]" />
                          <input 
                            type="text" 
                            placeholder="Type (e.g. Run, Lift)" 
                            value={newPostWorkoutType}
                            onChange={(e) => setNewPostWorkoutType(e.target.value)}
                            className="w-full bg-[#1A1C23] border border-[#2A2D3A] rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#21D4B5]"
                          />
                        </div>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E92A4]" />
                          <input 
                            type="text" 
                            placeholder="Duration (e.g. 45m)" 
                            value={newPostWorkoutDuration}
                            onChange={(e) => setNewPostWorkoutDuration(e.target.value)}
                            className="w-full bg-[#1A1C23] border border-[#2A2D3A] rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#21D4B5]"
                          />
                        </div>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E92A4]" />
                          <input 
                            type="text" 
                            placeholder="Distance (e.g. 5K)" 
                            value={newPostWorkoutDistance}
                            onChange={(e) => setNewPostWorkoutDistance(e.target.value)}
                            className="w-full bg-[#1A1C23] border border-[#2A2D3A] rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#21D4B5]"
                          />
                        </div>
                        <div className="relative">
                          <Flame className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E92A4]" />
                          <input 
                            type="number" 
                            placeholder="Calories" 
                            value={newPostWorkoutCalories}
                            onChange={(e) => setNewPostWorkoutCalories(e.target.value)}
                            className="w-full bg-[#1A1C23] border border-[#2A2D3A] rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#21D4B5]"
                          />
                        </div>
                      </div>
                      
                      {newPostPicture && (
                        <div className="relative inline-block mt-2">
                           <img src={newPostPicture} alt="Upload preview" className="h-24 rounded-lg object-cover border border-[#2A2D3A]" />
                           <button 
                             onClick={() => setNewPostPicture(null)}
                             className="absolute -top-2 -right-2 bg-[#FF453A] text-white p-1 rounded-full hover:bg-red-600"
                           >
                             <X className="w-3 h-3" />
                           </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center border-t border-[#2A2D3A]/50 pt-3">
                <div className="flex items-center gap-1">
                  <label className="p-2 text-[#8E92A4] hover:text-[#21D4B5] hover:bg-[#2A2D3A] rounded-full transition-colors cursor-pointer">
                    <ImageIcon className="w-4 h-4" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setNewPostPicture(reader.result as string);
                            setShowExpandedPostForm(true);
                          };
                          reader.readAsDataURL(file);
                        }
                      }} 
                    />
                  </label>
                  <button onClick={() => setShowExpandedPostForm(true)} className="p-2 text-[#8E92A4] hover:text-[#21D4B5] hover:bg-[#2A2D3A] rounded-full transition-colors">
                    <MapPin className="w-4 h-4" />
                  </button>
                  <button onClick={() => setShowExpandedPostForm(true)} className="p-2 text-[#8E92A4] hover:text-[#21D4B5] hover:bg-[#2A2D3A] rounded-full transition-colors">
                    <Hash className="w-4 h-4" />
                  </button>
                  <button onClick={() => setShowExpandedPostForm(true)} className="p-2 text-[#8E92A4] hover:text-[#21D4B5] hover:bg-[#2A2D3A] rounded-full transition-colors">
                    <Activity className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {showExpandedPostForm && (
                    <button 
                      onClick={() => setShowExpandedPostForm(false)}
                      className="text-xs font-bold text-[#8E92A4] hover:text-white px-3 py-1.5"
                    >
                      Cancel
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (newPostText.trim() || newPostPicture) {
                        const tags = newPostTags.split(',').map(t => t.trim()).filter(Boolean).map(t => t.startsWith('#') ? t : `#${t}`);
                        const mentions = newPostMentions.split(',').map(m => m.trim()).filter(Boolean).map(m => m.startsWith('@') ? m : `@${m}`);
                        
                        let workoutData = undefined;
                        if (newPostWorkoutType.trim()) {
                          workoutData = {
                            type: newPostWorkoutType.trim(),
                            duration: newPostWorkoutDuration.trim() || undefined,
                            distance: newPostWorkoutDistance.trim() || undefined,
                            calories: newPostWorkoutCalories ? parseInt(newPostWorkoutCalories) : undefined
                          };
                        }

                        setPosts([{ 
                          id: Date.now(), 
                          text: newPostText, 
                          date: "Just now", 
                          likes: 0,
                          location: newPostLocation.trim() || undefined,
                          tags: tags.length > 0 ? tags : undefined,
                          mentions: mentions.length > 0 ? mentions : undefined,
                          picture: newPostPicture,
                          workoutData
                        }, ...posts]);
                        
                        setNewPostText("");
                        setNewPostLocation("");
                        setNewPostTags("");
                        setNewPostMentions("");
                        setNewPostPicture(null);
                        setNewPostWorkoutType("");
                        setNewPostWorkoutDuration("");
                        setNewPostWorkoutDistance("");
                        setNewPostWorkoutCalories("");
                        setShowExpandedPostForm(false);
                      }
                    }}
                    disabled={!newPostText.trim() && !newPostPicture}
                    className="bg-[#21D4B5] text-[#1A1C23] font-bold px-4 py-1.5 rounded-full text-xs flex items-center gap-1.5 hover:bg-[#1bb89c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-3 h-3" />
                    Post
                  </button>
                </div>
              </div>
            </div>

            {/* Posts List */}
            <div className="space-y-4">
              {posts.map(post => (
                <div key={post.id} className="bg-[#22252E] border border-[#2A2D3A]/50 rounded-[20px] p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1A1C23] flex items-center justify-center overflow-hidden font-bold text-sm text-white">
                        {profileData.profilePic ? (
                          <img src={profileData.profilePic} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          profileData.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-sm leading-tight">{profileData.name}</h4>
                        <p className="text-[#8E92A4] text-xs">{post.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {editingPostId !== post.id && (
                        <>
                          <button 
                            onClick={() => { setEditingPostId(post.id); setEditingPostText(post.text); }}
                            className="p-1.5 text-[#8E92A4] hover:text-[#21D4B5] hover:bg-[#2A2D3A] rounded-full transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setPosts(posts.filter(p => p.id !== post.id))}
                            className="p-1.5 text-[#8E92A4] hover:text-[#FF453A] hover:bg-[#2A2D3A] rounded-full transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {editingPostId === post.id ? (
                    <div className="mt-2">
                      <textarea 
                        value={editingPostText}
                        onChange={(e) => setEditingPostText(e.target.value)}
                        className="w-full bg-[#1A1C23] border border-[#2A2D3A] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#21D4B5] min-h-[80px] resize-none"
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button 
                          onClick={() => setEditingPostId(null)}
                          className="text-xs font-bold text-[#8E92A4] hover:text-white px-3 py-1.5"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => {
                            if (editingPostText.trim()) {
                              setPosts(posts.map(p => p.id === post.id ? { ...p, text: editingPostText } : p));
                              setEditingPostId(null);
                            }
                          }}
                          className="bg-[#21D4B5] text-[#1A1C23] font-bold px-3 py-1.5 rounded-full text-xs hover:bg-[#1bb89c]"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-[#E2E4E9] text-sm leading-relaxed mb-3 whitespace-pre-wrap">{post.text}</p>
                      
                      {/* Workout Data */}
                      {post.workoutData && (
                        <div className="bg-[#1A1C23] border border-[#2A2D3A] rounded-xl p-3 mb-3 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-[#21D4B5]/10 flex items-center justify-center text-[#21D4B5]">
                            <Activity className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-white text-sm font-bold">{post.workoutData.type}</p>
                            <div className="flex items-center gap-3 text-xs text-[#8E92A4] mt-0.5">
                              {post.workoutData.duration && <span>{post.workoutData.duration}</span>}
                              {post.workoutData.distance && <span>{post.workoutData.distance}</span>}
                              {post.workoutData.calories && <span>{post.workoutData.calories} kcal</span>}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Tags & Mentions */}
                      {(post.tags || post.mentions || post.location) && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {post.location && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#21D4B5] bg-[#21D4B5]/10 px-2.5 py-1 rounded-full">
                              <MapPin className="w-3 h-3" /> {post.location}
                            </span>
                          )}
                          {post.mentions?.map((mention: string, idx: number) => (
                            <span key={`mention-${idx}`} className="inline-flex items-center text-[11px] font-medium text-[#32ADE6] bg-[#32ADE6]/10 px-2.5 py-1 rounded-full">
                              {mention}
                            </span>
                          ))}
                          {post.tags?.map((tag: string, idx: number) => (
                            <span key={`tag-${idx}`} className="inline-flex items-center text-[11px] font-medium text-[#8E92A4] bg-[#2A2D3A] px-2.5 py-1 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Picture */}
                      {post.picture && (
                        <div className="mb-4 rounded-xl overflow-hidden border border-[#2A2D3A] bg-[#1A1C23]">
                          <img src={post.picture} alt="Post attachment" className="w-full max-h-80 object-cover" />
                        </div>
                      )}
                    </>
                  )}
                  
                  {!editingPostId || editingPostId !== post.id ? (
                    <div className="flex items-center gap-4 text-[#8E92A4] text-xs font-semibold pt-3 border-t border-[#2A2D3A]/50">
                      <button className="flex items-center gap-1.5 hover:text-[#FF453A] transition-colors">
                        <Flame className="w-4 h-4" />
                        {post.likes} Likes
                      </button>
                      <button className="flex items-center gap-1.5 hover:text-white transition-colors">
                        <MessageSquare className="w-4 h-4" />
                        Reply
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
              
              {posts.length === 0 && (
                <div className="text-center py-10 bg-[#22252E] border border-[#2A2D3A]/50 rounded-[20px]">
                  <MessageSquare className="w-8 h-8 text-[#8E92A4] mx-auto mb-3 opacity-50" />
                  <h4 className="text-white font-bold text-sm">No posts yet</h4>
                  <p className="text-[#8E92A4] text-xs mt-1">Share your first update with the community!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "progress" && (
          <div className="space-y-6 pb-6 animate-in fade-in duration-300">
            <div className="bg-[#22252E] border border-[#2A2D3A]/50 rounded-[20px] p-6 shadow-xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Camera className="w-5 h-5 text-[#21D4B5]" /> Progress Timeline
                  </h3>
                  <p className="text-xs text-[#8E92A4] mt-1 max-w-sm">
                    Snap a quick selfie after your workout to visually track your body transformation.
                  </p>
                </div>
                <button
                  onClick={() => setIsCameraOpen(!isCameraOpen)}
                  className="bg-[#21D4B5] hover:bg-[#1bb89c] text-[#1A1C23] font-bold text-xs px-4 py-2.5 rounded-full flex items-center gap-2 transition-all shadow-md shrink-0 w-full justify-center md:w-auto"
                >
                  {isCameraOpen ? (
                     <>Cancel Snap</>
                  ) : (
                     <>
                       <Camera className="w-4 h-4" /> Snap Progress Photo
                     </>
                  )}
                </button>
              </div>

              {isCameraOpen && (
                <div className="mb-8 border border-[#2A2D3A] rounded-xl p-4 bg-[#1A1C23] animate-in slide-in-from-top-4">
                   <div className="aspect-[4/3] rounded-lg overflow-hidden bg-black relative flex items-center justify-center">
                      {/* @ts-ignore */}
                      <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{ facingMode: "user" }}
                        className="w-full h-full object-cover"
                      />
                   </div>
                   <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                     <div className="flex-1">
                       <label className="text-[10px] text-[#8E92A4] uppercase tracking-widest font-bold mb-1 block">
                          Current Weight (optional)
                       </label>
                       <input 
                         type="text" 
                         value={photoWeight}
                         onChange={e => setPhotoWeight(e.target.value)}
                         placeholder="e.g. 165 lbs"
                         className="w-full bg-[#22252E] border border-[#2A2D3A] rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#21D4B5]"
                       />
                     </div>
                     <button
                        onClick={capturePhoto}
                        className="bg-[#21D4B5] hover:bg-[#1bb89c] text-[#1A1C23] font-bold text-sm px-6 py-2 rounded-full self-end sm:self-end h-[38px] flex items-center justify-center min-w-[120px]"
                     >
                       Capture
                     </button>
                   </div>
                </div>
              )}

              <div className="relative">
                 {/* Timeline Line */}
                 {progressPhotos.length > 0 && (
                   <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-[#2A2D3A] hidden md:block z-0"></div>
                 )}

                 <div className="space-y-8 relative z-10">
                   {progressPhotos.length > 0 ? (
                     progressPhotos.map((photo, index) => (
                       <div key={photo.id} className="flex flex-col md:flex-row gap-4 md:gap-8 relative animate-in fade-in duration-500 group">
                         {/* Timeline Dot */}
                         <div className="hidden md:flex shrink-0 w-12 items-center justify-center">
                           <div className="w-4 h-4 rounded-full bg-[#21D4B5] border-4 border-[#1A1C23] shadow-[0_0_10px_rgba(33,212,181,0.4)] group-hover:scale-125 transition-transform z-10"></div>
                         </div>
                         
                         <div className="flex-1 bg-[#1A1C23] border border-[#2A2D3A] rounded-xl p-4 md:p-5 flex flex-col sm:flex-row gap-5 hover:border-[#21D4B5]/30 transition-colors">
                           <div className="w-full sm:w-48 aspect-[3/4] shrink-0 rounded-lg overflow-hidden border border-[#2A2D3A] relative">
                              <img src={photo.uri} alt="Progress" className="w-full h-full object-cover" />
                           </div>
                           <div className="flex flex-col justify-center">
                             <h4 className="text-base font-bold text-white mb-1">
                                {new Date(photo.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                             </h4>
                             <p className="text-xs text-[#8E92A4] mb-4">
                                {new Date(photo.date).toLocaleTimeString()}
                             </p>
                             
                             {photo.weight && (
                               <div className="inline-flex self-start items-center gap-1.5 bg-[#21D4B5]/10 text-[#21D4B5] px-3 py-1.5 rounded-full font-bold text-sm">
                                 <TrendingUp className="w-4 h-4" /> {photo.weight}
                               </div>
                             )}
                             
                             {index === progressPhotos.length - 1 && index !== 0 && (
                               <div className="mt-4 pt-4 border-t border-[#2A2D3A]">
                                 <p className="text-xs text-[#8E92A4]">
                                   First entry! Keep pushing, consistency is key.
                                 </p>
                               </div>
                             )}
                           </div>
                         </div>
                       </div>
                     ))
                   ) : (
                     <div className="text-center py-12 px-4">
                        <Camera className="w-12 h-12 text-[#8E92A4] opacity-30 mx-auto mb-3" />
                        <h4 className="text-white font-bold text-sm mb-1">No Progress Photos Yet</h4>
                        <p className="text-xs text-[#8E92A4] max-w-sm mx-auto">
                          Start tracking your transformation by snapping your first post-workout selfie!
                        </p>
                     </div>
                   )}
                 </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showEditProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1A1C23] border border-[#2A2D3A] rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-[#2A2D3A]">
                <h3 className="text-lg font-bold text-white">Edit Profile</h3>
                <button onClick={() => setShowEditProfile(false)} className="p-2 text-[#8E92A4] hover:text-white rounded-full hover:bg-[#2A2D3A] transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-center mb-6">
                  <label className="relative group cursor-pointer block">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#21D4B5] to-[#32ADE6] p-1">
                      <div className="w-full h-full rounded-full bg-[#1A1C23] overflow-hidden flex items-center justify-center font-bold text-2xl text-white">
                        {profileData.profilePic ? (
                           <img src={profileData.profilePic} alt="Profile" className="w-full h-full object-cover opacity-80 group-hover:opacity-50 transition-opacity" />
                        ) : (
                           profileData.name.charAt(0)
                        )}
                      </div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setProfileData({...profileData, profilePic: reader.result as string});
                          };
                          reader.readAsDataURL(file);
                        }
                      }} 
                    />
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#8E92A4] uppercase tracking-wider">Name</label>
                  <input type="text" value={profileData.name} onChange={(e) => setProfileData({...profileData, name: e.target.value})} className="w-full bg-[#22252E] border border-[#2A2D3A] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#21D4B5]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#8E92A4] uppercase tracking-wider">Username</label>
                  <input type="text" value={profileData.username} onChange={(e) => setProfileData({...profileData, username: e.target.value})} className="w-full bg-[#22252E] border border-[#2A2D3A] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#21D4B5]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#8E92A4] uppercase tracking-wider">Location</label>
                  <input type="text" value={profileData.location} onChange={(e) => setProfileData({...profileData, location: e.target.value})} className="w-full bg-[#22252E] border border-[#2A2D3A] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#21D4B5]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#8E92A4] uppercase tracking-wider">Bio</label>
                  <textarea value={profileData.bio} onChange={(e) => setProfileData({...profileData, bio: e.target.value})} className="w-full bg-[#22252E] border border-[#2A2D3A] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#21D4B5] resize-none h-20" />
                </div>
              </div>
              <div className="p-4 border-t border-[#2A2D3A] flex justify-end">
                <button 
                  onClick={() => {
                    localStorage.setItem("social_profile_name", profileData.name);
                    localStorage.setItem("social_profile_bio", profileData.bio);
                    if (profileData.profilePic && !profileData.profilePic.startsWith("http")) {
                      localStorage.setItem("social_profile_pic", profileData.profilePic);
                    }
                    setShowEditProfile(false);
                  }} 
                  className="flex items-center gap-2 bg-[#21D4B5] text-[#1A1C23] font-bold px-6 py-2.5 rounded-full hover:bg-[#1bb89c] transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1A1C23] border border-[#2A2D3A] rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-[#2A2D3A]">
                <h3 className="text-lg font-bold text-white">Settings</h3>
                <button onClick={() => setShowSettings(false)} className="p-2 text-[#8E92A4] hover:text-white rounded-full hover:bg-[#2A2D3A] transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-bold text-sm">Push Notifications</h4>
                    <p className="text-[#8E92A4] text-xs">Receive alerts for workouts and friends</p>
                  </div>
                  <button 
                    onClick={() => setProfileData({...profileData, notifications: !profileData.notifications})}
                    className={cn("w-12 h-6 rounded-full transition-colors relative", profileData.notifications ? "bg-[#21D4B5]" : "bg-[#2A2D3A]")}
                  >
                    <div className={cn("w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform", profileData.notifications ? "translate-x-6" : "translate-x-1")} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-bold text-sm">Private Profile</h4>
                    <p className="text-[#8E92A4] text-xs">Only friends can see your activities</p>
                  </div>
                  <button 
                    onClick={() => setProfileData({...profileData, privateProfile: !profileData.privateProfile})}
                    className={cn("w-12 h-6 rounded-full transition-colors relative", profileData.privateProfile ? "bg-[#21D4B5]" : "bg-[#2A2D3A]")}
                  >
                    <div className={cn("w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform", profileData.privateProfile ? "translate-x-6" : "translate-x-1")} />
                  </button>
                </div>

                <div className="pt-4 border-t border-[#2A2D3A]">
                  <button className="w-full text-left text-[#FF453A] font-bold text-sm hover:underline">Log Out</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showEditGoals && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1A1C23] border border-[#2A2D3A] rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-[#2A2D3A]">
                <h3 className="text-lg font-bold text-white">Edit Weekly Goals</h3>
                <button onClick={() => setShowEditGoals(false)} className="p-2 text-[#8E92A4] hover:text-white rounded-full hover:bg-[#2A2D3A] transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#8E92A4] uppercase tracking-wider">Active Minutes</label>
                  <input type="number" value={goals.activeMin.target} onChange={(e) => setGoals({...goals, activeMin: { ...goals.activeMin, target: Number(e.target.value) }})} className="w-full bg-[#22252E] border border-[#2A2D3A] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#21D4B5]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#8E92A4] uppercase tracking-wider">Workouts</label>
                  <input type="number" value={goals.workouts.target} onChange={(e) => setGoals({...goals, workouts: { ...goals.workouts, target: Number(e.target.value) }})} className="w-full bg-[#22252E] border border-[#2A2D3A] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#21D4B5]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#8E92A4] uppercase tracking-wider">Calories</label>
                  <input type="number" value={goals.calories.target} onChange={(e) => setGoals({...goals, calories: { ...goals.calories, target: Number(e.target.value) }})} className="w-full bg-[#22252E] border border-[#2A2D3A] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#21D4B5]" />
                </div>
              </div>
              <div className="p-4 border-t border-[#2A2D3A] flex justify-end">
                <button onClick={() => setShowEditGoals(false)} className="flex items-center gap-2 bg-[#21D4B5] text-[#1A1C23] font-bold px-6 py-2.5 rounded-full hover:bg-[#1bb89c] transition-colors">
                  <Save className="w-4 h-4" />
                  Save Goals
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
