import React, { useState, useEffect } from "react";
import { MessageSquare, Heart, Share2, Send, Activity, User, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { formatDistanceToNow } from "date-fns";

export function SocialFeedView() {
  const [activeTab, setActiveTab] = useState<"feed" | "chat">("feed");
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Queries
  const { data: activities = [] } = useQuery({
    queryKey: ["activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Activity")
        .select('*, User!userId(name, avatar)')
        .order("time", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Message")
        .select('*, User!senderId(name, avatar)')
        .order("time", { ascending: true })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Realtime Subscriptions
  useEffect(() => {
    const activitySub = supabase.channel('public:Activity')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Activity' }, () => {
        queryClient.invalidateQueries({ queryKey: ["activities"] });
      })
      .subscribe();

    const messageSub = supabase.channel('public:Message')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Message' }, () => {
        queryClient.invalidateQueries({ queryKey: ["messages"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(activitySub);
      supabase.removeChannel(messageSub);
    };
  }, [queryClient]);

  // Mutations
  const likeMutation = useMutation({
    mutationFn: async (activityId: string) => {
      if (!user) return;
      const { error } = await supabase.from("ActivityLike").insert({
        activityId,
        userId: user.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    }
  });

  const [messageText, setMessageText] = useState("");
  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!user) return;
      const { error } = await supabase.from("Message").insert({
        text,
        senderId: user.id,
        receiverId: user.id, // For group chat, we can just omit receiverId or set it to a generic group UUID
        time: new Date().toISOString()
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    }
  });

  return (
    <div className="flex flex-col h-full bg-[#13151a]">
      {/* Tabs */}
      <div className="flex px-4 pt-4 border-b border-[#2A2D3A]">
        <button
          onClick={() => setActiveTab("feed")}
          className={cn("px-4 py-3 text-sm font-bold border-b-2 transition-colors", activeTab === "feed" ? "border-brand-accent text-white" : "border-transparent text-[#8E92A4] hover:text-white")}
        >
          Community Feed
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={cn("px-4 py-3 text-sm font-bold border-b-2 transition-colors", activeTab === "chat" ? "border-brand-accent text-white" : "border-transparent text-[#8E92A4] hover:text-white")}
        >
          Global Chat
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "feed" && (
          <div className="max-w-2xl mx-auto space-y-6">
            {activities.length === 0 ? (
              <div className="text-center text-[#8E92A4] py-10">No activities yet. Go complete a workout!</div>
            ) : (
              activities.map((activity: any) => (
                <div key={activity.id} className="bg-[#1A1C23] border border-[#2A2D3A] rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-brand-accent/20 rounded-full flex items-center justify-center text-brand-accent font-bold">
                      {activity.User?.name?.[0] || <User className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm">{activity.User?.name || "Unknown Athlete"}</h4>
                      <p className="text-[#8E92A4] text-xs">{formatDistanceToNow(new Date(activity.time))} ago</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{activity.activity}</h3>
                  {activity.caption && <p className="text-[#D1D5DB] text-sm mb-4">{activity.caption}</p>}
                  
                  <div className="flex gap-4 mt-4 pt-4 border-t border-[#2A2D3A]">
                    <button 
                      onClick={() => likeMutation.mutate(activity.id)}
                      className="flex items-center gap-2 text-[#8E92A4] hover:text-brand-accent transition-colors text-sm font-medium"
                    >
                      <Heart className="w-5 h-5" /> Like
                    </button>
                    <button className="flex items-center gap-2 text-[#8E92A4] hover:text-white transition-colors text-sm font-medium">
                      <MessageSquare className="w-5 h-5" /> Comment
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "chat" && (
          <div className="max-w-2xl mx-auto flex flex-col h-full bg-[#1A1C23] border border-[#2A2D3A] rounded-xl overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-[#8E92A4] py-10">No messages in global chat. Be the first!</div>
              ) : (
                messages.map((msg: any) => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={cn("flex flex-col max-w-[80%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                      <div className="text-xs text-[#8E92A4] mb-1 px-1">
                        {isMe ? "You" : msg.User?.name || "Unknown"}
                      </div>
                      <div className={cn("px-4 py-2 rounded-2xl text-sm", isMe ? "bg-brand-accent text-[#13151a]" : "bg-[#2A2D3A] text-white")}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-4 bg-[#1A1C23] border-t border-[#2A2D3A]">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (messageText.trim()) sendMessageMutation.mutate(messageText);
                }}
                className="flex gap-2"
              >
                <Input 
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="bg-[#2A2D3A] border-none text-white h-12 rounded-full px-6"
                />
                <Button type="submit" disabled={!messageText.trim() || sendMessageMutation.isPending} className="h-12 w-12 rounded-full p-0 bg-brand-accent hover:bg-brand-accent-hover text-[#13151a]">
                  <Send className="w-5 h-5 ml-1" />
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
