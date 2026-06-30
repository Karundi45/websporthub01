import React, { useState, useEffect } from "react";
import { MessageSquare, Heart, Share2, Send, Activity, User, MapPin, ExternalLink, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

export function SocialFeedView() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: followingIds = [] } = useQuery({
    queryKey: ["following", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("Friendship")
        .select("user2Id")
        .eq("user1Id", user.id);
      
      const { data: data2 } = await supabase
        .from("Friendship")
        .select("user1Id")
        .eq("user2Id", user.id);

      const ids = new Set<string>();
      data?.forEach(d => ids.add(d.user2Id));
      data2?.forEach(d => ids.add(d.user1Id));
      ids.add(user.id); // Add self to see own posts
      return Array.from(ids);
    },
    enabled: !!user
  });

  // Queries
  const { data: activities = [] } = useQuery({
    queryKey: ["activities", followingIds],
    queryFn: async () => {
      if (followingIds.length === 0) return [];
      const { data, error } = await supabase
        .from("Activity")
        .select('*, user:User!userId(*), likes:ActivityLike(*), comments:ActivityComment(*, user:User!userId(*))')
        .in('userId', followingIds)
        .order("time", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: followingIds.length > 0
  });

  // Realtime Subscriptions
  useEffect(() => {
    const activitySub = supabase.channel('public:Activity')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Activity' }, () => {
        queryClient.invalidateQueries({ queryKey: ["activities"] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ActivityLike' }, () => {
        queryClient.invalidateQueries({ queryKey: ["activities"] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ActivityComment' }, () => {
        queryClient.invalidateQueries({ queryKey: ["activities"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(activitySub);
    };
  }, [queryClient]);

  const toggleLikeMutation = useMutation({
    mutationFn: async ({ activityId, isLiked, likeId }: { activityId: string, isLiked: boolean, likeId?: string }) => {
      if (!user) return;
      if (isLiked && likeId) {
        await supabase.from("ActivityLike").delete().eq('id', likeId);
      } else {
        await supabase.from("ActivityLike").insert({ activityId, userId: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    }
  });

  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const addCommentMutation = useMutation({
    mutationFn: async ({ activityId, text }: { activityId: string, text: string }) => {
      if (!user || !text.trim()) return;
      await supabase.from("ActivityComment").insert({ activityId, userId: user.id, text: text.trim() });
    },
    onSuccess: (_, variables) => {
      setCommentText(prev => ({ ...prev, [variables.activityId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    }
  });

  const handleExternalShare = async (activity: any) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Check out ${activity.user?.name}'s workout!`,
          text: `${activity.activity} - ${activity.metrics}`,
          url: window.location.href, // Or a specific link to the activity if supported
        });
      } catch (err) {
        console.error("Error sharing", err);
      }
    } else {
      alert("Web Share API is not supported in your browser.");
    }
  };

  const handleInternalShare = async (activity: any) => {
    // Prompt for group to share to (simplified for this implementation)
    const groupId = prompt("Enter Group ID to share this to:");
    if (groupId && user) {
      await supabase.from("GroupMessage").insert({
        groupId,
        senderId: user.id,
        text: `Check out my workout: ${activity.activity} - ${activity.metrics}`
      });
      alert("Shared to group!");
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#12141A] overflow-y-auto">
      <div className="p-6 md:p-8 max-w-2xl mx-auto w-full pb-32">
        <h1 className="text-2xl font-bold text-white mb-6">Following Feed</h1>
        
        <div className="space-y-6">
          {activities.length === 0 ? (
            <div className="text-center p-8 bg-[#1A1C23] rounded-2xl border border-[#2A2D3A]">
              <Users className="w-12 h-12 text-[#8E92A4] mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Your feed is empty</h2>
              <p className="text-brand-text-secondary mb-4">Follow friends to see their activities here.</p>
              <Link to="/explore" className="text-brand-accent font-semibold hover:underline">Find Friends</Link>
            </div>
          ) : activities.map((activity: any) => {
            const userLike = activity.likes?.find((l: any) => l.userId === user?.id);
            const isLiked = !!userLike;

            return (
              <div key={activity.id} className="bg-[#1A1C23] rounded-[24px] overflow-hidden border border-[#2A2D3A]">
                {/* Header */}
                <div className="p-4 flex items-center justify-between">
                  <Link to={`/profile/${activity.userId}`} className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#21D4B5] to-[#32ADE6] p-0.5">
                      <div className="w-full h-full bg-[#1A1C23] rounded-full flex items-center justify-center overflow-hidden">
                        {activity.user?.avatar ? (
                          <img src={activity.user.avatar} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-brand-text-secondary" />
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-white font-bold group-hover:text-brand-accent transition-colors">{activity.user?.name || activity.userName}</h3>
                      <div className="text-xs text-brand-text-secondary flex items-center gap-2">
                        <span>{formatDistanceToNow(new Date(activity.time), { addSuffix: true })}</span>
                        {activity.location?.name && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {activity.location.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>

                {/* Content */}
                <div className="px-4 pb-3">
                  <h4 className="text-lg font-bold text-white mb-1">{activity.activity}</h4>
                  {activity.storyText && <p className="text-sm text-brand-text-primary mb-3">{activity.storyText}</p>}
                  
                  {/* Workout Stats */}
                  <div className="flex gap-4 mb-3">
                    <div className="flex flex-col">
                      <span className="text-xs text-[#8E92A4]">Metrics</span>
                      <span className="text-lg font-semibold text-white">{activity.metrics}</span>
                    </div>
                  </div>
                </div>

                {/* Media */}
                {activity.mediaUrls && activity.mediaUrls.length > 0 && (
                  <div className="w-full aspect-video bg-black relative">
                    <img src={activity.mediaUrls[0]} alt="Activity Media" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Map placeholder if path exists */}
                {activity.workoutStats?.path && !activity.mediaUrls?.length && (
                  <div className="w-full h-48 bg-[#22252E] flex items-center justify-center border-y border-[#2A2D3A]">
                    <MapPin className="w-8 h-8 text-[#8E92A4]" />
                    <span className="ml-2 text-sm text-[#8E92A4]">Map View</span>
                  </div>
                )}

                {/* Actions */}
                <div className="p-4 border-t border-[#2A2D3A]">
                  <div className="flex items-center gap-6 mb-4">
                    <button 
                      onClick={() => toggleLikeMutation.mutate({ activityId: activity.id, isLiked, likeId: userLike?.id })}
                      className={cn("flex items-center gap-2 transition-colors", isLiked ? "text-[#FF3B30]" : "text-[#8E92A4] hover:text-white")}
                    >
                      <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
                      <span className="text-sm font-medium">{activity.likes?.length || 0}</span>
                    </button>
                    <button className="flex items-center gap-2 text-[#8E92A4] hover:text-white transition-colors">
                      <MessageSquare className="w-5 h-5" />
                      <span className="text-sm font-medium">{activity.comments?.length || 0}</span>
                    </button>
                    <div className="flex items-center gap-4 ml-auto">
                      <button onClick={() => handleInternalShare(activity)} className="text-[#8E92A4] hover:text-brand-accent transition-colors" title="Share to Group">
                        <Share2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleExternalShare(activity)} className="text-[#8E92A4] hover:text-brand-accent transition-colors" title="Share externally">
                        <ExternalLink className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Comments Section */}
                  {activity.comments && activity.comments.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {activity.comments.slice(0, 3).map((comment: any) => (
                        <div key={comment.id} className="text-sm">
                          <Link to={`/profile/${comment.userId}`} className="font-bold text-white hover:underline mr-2">{comment.user?.name}</Link>
                          <span className="text-brand-text-primary">{comment.text}</span>
                        </div>
                      ))}
                      {activity.comments.length > 3 && (
                        <button className="text-xs text-brand-text-secondary font-medium">View all {activity.comments.length} comments</button>
                      )}
                    </div>
                  )}

                  {/* Add Comment Input */}
                  <div className="flex gap-2 items-center">
                    <div className="w-8 h-8 rounded-full bg-[#2A2D3A] overflow-hidden shrink-0 flex items-center justify-center">
                      <User className="w-4 h-4 text-[#8E92A4]" />
                    </div>
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        addCommentMutation.mutate({ activityId: activity.id, text: commentText[activity.id] || "" });
                      }}
                      className="flex-1 flex"
                    >
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={commentText[activity.id] || ""}
                        onChange={(e) => setCommentText(prev => ({ ...prev, [activity.id]: e.target.value }))}
                        className="flex-1 bg-transparent border-none text-sm text-white placeholder-[#8E92A4] focus:outline-none focus:ring-0 px-2"
                      />
                      <button 
                        type="submit" 
                        disabled={!commentText[activity.id]?.trim()}
                        className="text-brand-accent disabled:opacity-50 font-semibold text-sm"
                      >
                        Post
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
