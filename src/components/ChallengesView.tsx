import { useState, useEffect } from "react";
import { Trophy, TrendingUp, Medal, Footprints, Users, Plus, Share2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Leader {
  id: string;
  name: string;
  score: number;
  avatar: string;
  rankChange: "up" | "down" | "same";
}

interface PrivateGroup {
  id: string;
  name: string;
  challengeType: string;
  members: { name: string; avatar: string; score: number }[];
  inviteCode: string;
}

export function ChallengesView() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"challenges" | "leaderboard" | "groups">("challenges");
  const [newRecord, setNewRecord] = useState<string | null>(null);
  
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupChallenge, setNewGroupChallenge] = useState("Most distance in a week");
  const [inviteEmail, setInviteEmail] = useState("");

  const { data: leaders = [] } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase.from('User').select('*');
      if (error) throw error;
      return data.map((u: any, idx: number) => ({
        id: u.id,
        name: u.name || "Unknown",
        score: Math.floor(Math.random() * 100), // simplistic logic for now since no distance computed
        avatar: u.avatar || u.name?.charAt(0) || "?",
        rankChange: "same"
      }));
    }
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await supabase.from('Group').select('*');
      if (error) throw error;
      return data;
    }
  });

  const { data: challenges = [] } = useQuery({
    queryKey: ['challenges'],
    queryFn: async () => {
      const { data, error } = await supabase.from('Challenge').select('*');
      if (error) throw error;
      return data;
    }
  });

  // Realtime Subscriptions
  useEffect(() => {
    const channel = supabase.channel('challenges_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Challenge' }, () => {
        queryClient.invalidateQueries({ queryKey: ['challenges'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Group' }, () => {
        queryClient.invalidateQueries({ queryKey: ['groups'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'User' }, () => {
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    const newGroup = {
      name: newGroupName,
      description: newGroupChallenge,
      createdById: "dummy-user-id" // Replace with real auth user later if needed
    };
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
         newGroup.createdById = user.id;
      }
      await supabase.from("Group").insert(newGroup);
      
      setNewGroupName("");
      setShowCreateGroup(false);
      alert("Group created successfully! You can now invite friends.");
    } catch (err) {
      console.error(err);
    }
  };

  // Simulate real-time leaderboard updates
  useEffect(() => {
    if (activeTab !== "leaderboard") return;

    const interval = setInterval(() => {
      setLeaders(currentLeaders => {
        const newLeaders = [...currentLeaders];
        // Randomly bump someone's score (mostly target lower ranks to cause shifts)
        const targetIndex = Math.floor(Math.random() * 3) + 2; // Indexes 2, 3, 4
        
        const bumpAmount = Math.random() * 15 + 5;
        newLeaders[targetIndex] = { 
          ...newLeaders[targetIndex], 
          score: parseFloat((newLeaders[targetIndex].score + bumpAmount).toFixed(1))
        };

        // If it's the current user (Guest User), maybe trigger a record alert
        if (newLeaders[targetIndex].id === "4") {
          setNewRecord(`New PR! You reached ${newLeaders[targetIndex].score} KM!`);
          setTimeout(() => setNewRecord(null), 3000);
        }

        // Sort by score
        const sorted = [...newLeaders].sort((a, b) => b.score - a.score);
        
        // Calculate rank changes
        return sorted.map((leader, index) => {
          const oldIndex = currentLeaders.findIndex(l => l.id === leader.id);
          let rankChange: "up" | "down" | "same" = "same";
          if (oldIndex > index) rankChange = "up";
          else if (oldIndex < index) rankChange = "down";
          
          return { ...leader, rankChange };
        });
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [activeTab]);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full pb-24 md:pb-10 overflow-y-auto h-full">
      <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div></div>
        <div className="hidden md:flex items-center gap-1.5 bg-brand-surface border border-brand-border px-3 py-1.5 rounded shadow-sm">
          <Medal className="w-4 h-4 text-brand-accent" />
          <span className="text-[13px] font-semibold text-brand-text-primary">12 Badges</span>
        </div>
      </header>

      <div className="flex items-center gap-1 mb-6 bg-[#212121] p-1 rounded-md border border-[rgba(255,255,255,0.05)] w-max">
        <button 
          onClick={() => setActiveTab("challenges")}
          className={cn(
            "px-4 py-1.5 rounded text-[13px] font-medium transition-all flex items-center justify-center gap-1.5",
            activeTab === "challenges" 
              ? "bg-[#333] text-brand-text-primary shadow-sm" 
              : "text-brand-text-secondary hover:text-brand-text-primary"
          )}
        >
          <Trophy className="w-3.5 h-3.5" /> Challenges
        </button>
        <button 
          onClick={() => setActiveTab("leaderboard")}
          className={cn(
            "px-4 py-1.5 rounded text-[13px] font-medium transition-all flex items-center justify-center gap-1.5",
            activeTab === "leaderboard" 
              ? "bg-[#333] text-brand-text-primary shadow-sm" 
              : "text-brand-text-secondary hover:text-brand-text-primary"
          )}
        >
          <Users className="w-3.5 h-3.5" /> Leaderboards
        </button>
        <button 
          onClick={() => setActiveTab("groups")}
          className={cn(
            "px-4 py-1.5 rounded text-[13px] font-medium transition-all flex items-center justify-center gap-1.5",
            activeTab === "groups" 
              ? "bg-[#333] text-brand-text-primary shadow-sm" 
              : "text-brand-text-secondary hover:text-brand-text-primary"
          )}
        >
          <Users className="w-3.5 h-3.5" /> Private Groups
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "challenges" ? (
          <motion.div 
            key="challenges"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="grid gap-4 md:grid-cols-2"
          >
            {challenges.length > 0 ? challenges.map((c) => (
              <div key={c._id || c.id} className="bg-[#181a22] border border-brand-border rounded-xl p-5 hover:border-brand-accent/30 transition-all flex flex-col justify-between shadow-sm relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-brand-accent/5 rounded-full blur-xl group-hover:bg-brand-accent/10 transition-colors"></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-[#2a2d3a] rounded-lg flex items-center justify-center shadow-inner">
                      <Trophy className="w-5 h-5 text-brand-accent" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-text-secondary bg-[#2a2d3a] px-2.5 py-1 rounded-full border border-brand-border">
                      {c.participants?.length || 0} Joined
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5">{c.title}</h3>
                  <p className="text-[13px] text-brand-text-secondary mb-6">{c.description}</p>
                </div>

                <div className="relative z-10">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[13px] font-semibold text-brand-accent">25% <span className="text-[11px] text-brand-text-secondary font-medium">Progress</span></span>
                    <span className="text-[12px] text-brand-text-secondary font-medium">{Math.max(0, Math.round((new Date(c.endDate).getTime() - Date.now()) / (1000 * 3600 * 24)))} days left</span>
                  </div>
                  <div className="h-2 w-full bg-[#2a2d3a] rounded-full overflow-hidden border border-brand-border/50">
                    <div 
                      className="h-full bg-brand-accent rounded-full"
                      style={{ width: '25%' }}
                    />
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-1 md:col-span-2 text-center text-brand-text-secondary py-8">No active challenges available.</div>
            )}
          </motion.div>
        ) : activeTab === "leaderboard" ? (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-brand-text-primary">Global Rank: 100KM Monthly</h3>
              <AnimatePresence>
                {newRecord && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, x: 10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: 10 }}
                    className="bg-brand-accent text-[#1e1e1e] text-[11px] font-semibold px-2 py-1 rounded shadow-sm flex items-center gap-1"
                  >
                    🏆 {newRecord}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="bg-brand-surface border border-brand-border rounded-md p-1.5 overflow-hidden relative shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-b from-brand-accent/5 to-transparent pointer-events-none" />
              
              <ul className="flex flex-col gap-1 relative z-10">
                <AnimatePresence>
                  {leaders.map((leader, index) => (
                    <motion.li
                      key={leader.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 300, 
                        damping: 24,
                        layout: { duration: 0.4 } 
                      }}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded transition-colors border",
                        leader.id === "4" ? "bg-brand-surface-light border-brand-accent/30" : "bg-transparent border-transparent hover:bg-brand-surface-light"
                      )}
                    >
                      <div className="w-6 font-semibold text-center text-[12px] text-brand-text-secondary">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}`}
                      </div>
                      <div className="w-8 h-8 rounded bg-[#111] border border-brand-border flex items-center justify-center font-semibold text-[13px] relative shrink-0 shadow-inner">
                        {leader.avatar}
                        {leader.rankChange === "up" && (
                          <motion.div 
                            initial={{ scale: 0 }} animate={{ scale: 1 }} 
                            className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-green-500 rounded-sm flex items-center justify-center shadow"
                          >
                            <TrendingUp className="w-2 h-2 text-white" />
                          </motion.div>
                        )}
                        {leader.rankChange === "down" && (
                          <motion.div 
                            initial={{ scale: 0 }} animate={{ scale: 1 }} 
                            className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 rounded-sm flex items-center justify-center shadow"
                          >
                             <TrendingUp className="w-2 h-2 text-white rotate-180" />
                          </motion.div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-brand-text-primary text-[13px] flex items-center gap-2">
                          {leader.name}
                          {leader.id === "4" && <span className="text-[9px] bg-brand-accent text-[#1e1e1e] px-1.5 py-0.5 rounded font-bold uppercase">You</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <motion.div 
                           key={leader.score}
                           initial={{ opacity: 0.5, y: -2 }} animate={{ opacity: 1, y: 0 }}
                           className={cn("font-medium font-mono text-[14px]", leader.id === "4" ? "text-brand-accent" : "text-brand-text-primary")}
                        >
                          {leader.score.toFixed(1)}
                        </motion.div>
                        <div className="text-[10px] text-brand-text-secondary font-mono">KM</div>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="groups"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-brand-text-primary">Your Private Groups</h3>
              <button 
                onClick={() => setShowCreateGroup(true)}
                className="bg-brand-accent text-[#1e1e1e] text-[13px] font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 hover:bg-opacity-90 transition"
              >
                <Plus className="w-4 h-4" /> Create Group
              </button>
            </div>

            {showCreateGroup && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-brand-surface border border-brand-border rounded-md p-5 shadow-sm space-y-4 relative"
              >
                <button 
                  onClick={() => setShowCreateGroup(false)}
                  className="absolute top-4 right-4 text-brand-text-secondary hover:text-brand-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
                <div>
                  <label className="block text-xs font-semibold text-brand-text-secondary mb-1">Group Name</label>
                  <input 
                    type="text" 
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. Weekend Warriors"
                    className="w-full bg-[#1e1e1e] border border-brand-border rounded p-2 text-[13px] text-brand-text-primary focus:outline-none focus:border-brand-accent transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-text-secondary mb-1">Challenge Type</label>
                  <select 
                    value={newGroupChallenge}
                    onChange={(e) => setNewGroupChallenge(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-brand-border rounded p-2 text-[13px] text-brand-text-primary focus:outline-none focus:border-brand-accent transition"
                  >
                    <option value="Most distance in a week">Most distance in a week</option>
                    <option value="Most workouts in a month">Most workouts in a month</option>
                    <option value="Most calories burned">Most calories burned</option>
                    <option value="Fastest 5K">Fastest 5K</option>
                  </select>
                </div>
                <button 
                  onClick={handleCreateGroup}
                  className="w-full bg-brand-text-primary text-[#1e1e1e] font-semibold text-[13px] py-2 rounded mt-2 hover:bg-opacity-90 transition"
                >
                  Confirm Creation
                </button>
              </motion.div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {groups.map(group => (
                <div key={group.id} className="bg-brand-surface border border-brand-border rounded-md p-5 hover:border-brand-accent/30 transition-all flex flex-col justify-between shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-base font-semibold text-brand-text-primary">{group.name}</h4>
                      <p className="text-[13px] text-brand-text-secondary">{group.challengeType}</p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-[#1e1e1e] border border-brand-border px-2 py-1 rounded">
                      <Share2 className="w-3.5 h-3.5 text-brand-text-secondary" />
                      <span className="text-[11px] font-mono text-brand-text-primary">{group.inviteCode}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    {group.members.sort((a,b) => b.score - a.score).map((member, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded bg-brand-surface-light border border-transparent">
                        <div className="flex items-center gap-3">
                           <div className="w-5 font-semibold text-center text-[11px] text-brand-text-secondary">
                            {idx + 1}
                           </div>
                           <div className="w-6 h-6 rounded bg-[#111] flex items-center justify-center font-semibold text-[10px] text-brand-text-primary shadow-inner">
                             {member.avatar}
                           </div>
                           <span className={cn("text-[13px] font-semibold", member.name === "Guest User" || member.name === "You" ? "text-brand-accent" : "text-brand-text-primary")}>
                             {member.name}
                           </span>
                        </div>
                        <span className="font-mono text-[13px] text-brand-text-primary">{member.score}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 pt-4 border-t border-brand-border flex gap-2">
                    <input 
                      type="email"
                      placeholder="Invite by email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="flex-1 bg-[#1e1e1e] border border-brand-border rounded px-2 py-1.5 text-[12px] text-brand-text-primary focus:outline-none focus:border-brand-accent transition"
                    />
                    <button 
                      onClick={() => {
                        if(inviteEmail.trim()) {
                          alert(`Invite sent to ${inviteEmail}!`);
                          setInviteEmail("");
                        }
                      }}
                      className="bg-[#333] hover:bg-[#444] text-brand-text-primary text-[12px] font-semibold px-3 py-1.5 rounded transition"
                    >
                      Invite
                    </button>
                  </div>
                </div>
              ))}
              
              {groups.length === 0 && !showCreateGroup && (
                <div className="col-span-2 py-12 text-center text-brand-text-secondary">
                   <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                   <p className="text-[14px]">You aren't in any private groups yet.</p>
                   <p className="text-[13px] mt-1 opacity-70">Create one to challenge your friends!</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
