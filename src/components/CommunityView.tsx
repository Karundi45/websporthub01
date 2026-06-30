import React, { useState, useEffect } from "react";
import { Users, Search, Plus, UserPlus, MapPin, MessageCircle, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Link, useNavigate } from "react-router-dom";

export function CommunityView() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"friends" | "groups">("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  // Fetch all users for Find Friends
  const { data: allUsers = [] } = useQuery({
    queryKey: ["allUsers", searchQuery],
    queryFn: async () => {
      let q = supabase.from("User").select("*").limit(20);
      if (searchQuery) {
        q = q.ilike("name", `%${searchQuery}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch groups
  const { data: groups = [] } = useQuery({
    queryKey: ["groups", searchQuery],
    queryFn: async () => {
      let q = supabase.from("Group").select("*, members:User(*)");
      if (searchQuery) {
        q = q.ilike("name", `%${searchQuery}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    }
  });

  // Realtime Subscriptions
  useEffect(() => {
    const channel = supabase.channel('community_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Group' }, () => {
        queryClient.invalidateQueries({ queryKey: ['groups'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'User' }, () => {
        queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      if (!user || !newGroupName.trim()) return;
      const { data, error } = await supabase.from('Group').insert({
        name: newGroupName,
        description: newGroupDesc,
        createdById: user.id
      }).select().single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setShowCreateGroup(false);
      setNewGroupName("");
      setNewGroupDesc("");
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      if (data) {
        navigate('/chat', { state: { recipientId: data.id, isGroup: true, name: data.name } });
      }
    }
  });

  const followMutation = useMutation({
    mutationFn: async (targetId: string) => {
      if (!user) return;
      // In a real app, you would check if Friendship already exists
      const { error } = await supabase.from('Friendship').insert({
        user1Id: user.id,
        user2Id: targetId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      alert("Followed successfully!");
    }
  });

  return (
    <div className="h-full flex flex-col bg-[#12141A] overflow-y-auto">
      <div className="p-6 md:p-8 max-w-4xl mx-auto w-full pb-32">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Community</h2>
          {activeTab === "groups" && (
            <button onClick={() => setShowCreateGroup(true)} className="flex items-center gap-2 bg-brand-accent hover:bg-brand-accent-hover text-white px-4 py-2 rounded-full font-semibold transition-colors">
              <Plus className="w-4 h-4" /> Create Group
            </button>
          )}
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-4 mb-6 border-b border-[#2A2D3A]">
          <button
            onClick={() => setActiveTab("friends")}
            className={`pb-2 font-semibold ${activeTab === "friends" ? "text-brand-accent border-b-2 border-brand-accent" : "text-[#8E92A4]"}`}
          >
            Find Friends
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={`pb-2 font-semibold ${activeTab === "groups" ? "text-brand-accent border-b-2 border-brand-accent" : "text-[#8E92A4]"}`}
          >
            Groups
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E92A4]" />
          <input
            type="text"
            placeholder={activeTab === "friends" ? "Search athletes..." : "Search groups..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1A1C23] border border-[#2A2D3A] rounded-full pl-12 pr-4 py-3 text-white focus:outline-none focus:border-brand-accent"
          />
        </div>

        {/* Content */}
        {activeTab === "friends" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allUsers.filter((u: any) => u.id !== user?.id).map((u: any) => (
              <div key={u.id} className="bg-[#1A1C23] p-4 rounded-2xl border border-[#2A2D3A] flex items-center justify-between">
                <Link to={`/profile/${u.id}`} className="flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#21D4B5] to-[#32ADE6] p-0.5">
                     <div className="w-full h-full bg-[#1A1C23] rounded-full flex items-center justify-center overflow-hidden">
                       {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <Users className="w-5 h-5 text-brand-text-secondary" />}
                     </div>
                  </div>
                  <div>
                    <h3 className="text-white font-bold group-hover:text-brand-accent transition-colors">{u.name}</h3>
                    {u.location && <p className="text-xs text-brand-text-secondary flex items-center gap-1"><MapPin className="w-3 h-3" /> {u.location}</p>}
                  </div>
                </Link>
                <div className="flex gap-2">
                  <button onClick={() => navigate('/chat', { state: { recipientId: u.id, isGroup: false, name: u.name } })} className="p-2 rounded-full bg-[#2A2D3A] text-white hover:text-brand-accent transition-colors">
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <button onClick={() => followMutation.mutate(u.id)} className="p-2 rounded-full bg-brand-accent text-white hover:bg-brand-accent-hover transition-colors">
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "groups" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((g: any) => (
              <div key={g.id} className="bg-[#1A1C23] p-5 rounded-2xl border border-[#2A2D3A] hover:border-brand-accent transition-colors cursor-pointer" onClick={() => navigate('/chat', { state: { recipientId: g.id, isGroup: true, name: g.name } })}>
                <h3 className="text-xl font-bold text-white mb-2">{g.name}</h3>
                <p className="text-sm text-brand-text-secondary mb-4 line-clamp-2">{g.description}</p>
                <div className="flex items-center justify-between text-xs text-[#8E92A4]">
                  <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {g.members?.length || 0} members</span>
                  {g.location?.name && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {g.location.name}</span>}
                </div>
              </div>
            ))}
            {groups.length === 0 && (
              <div className="col-span-1 md:col-span-2 text-center py-12">
                <Users className="w-12 h-12 text-[#2A2D3A] mx-auto mb-4" />
                <p className="text-brand-text-secondary">No groups found. Be the first to create one!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1A1C23] rounded-3xl p-6 w-full max-w-md border border-[#2A2D3A]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Create New Group</h3>
              <button onClick={() => setShowCreateGroup(false)} className="text-[#8E92A4] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-brand-text-secondary block mb-1">Group Name</label>
                <input 
                  type="text" 
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full bg-[#12141A] border border-[#2A2D3A] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-accent"
                  placeholder="e.g. NYC Runners"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-brand-text-secondary block mb-1">Description</label>
                <textarea 
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full bg-[#12141A] border border-[#2A2D3A] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-accent min-h-[100px]"
                  placeholder="What's this group about?"
                />
              </div>
              <button 
                onClick={() => createGroupMutation.mutate()}
                disabled={createGroupMutation.isPending || !newGroupName.trim()}
                className="w-full py-3 rounded-xl bg-brand-accent hover:bg-brand-accent-hover text-white font-bold transition-colors disabled:opacity-50 mt-4"
              >
                {createGroupMutation.isPending ? "Creating..." : "Create Group"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
