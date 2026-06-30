import React, { useEffect, useState, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import Webcam from "react-webcam";
import { formatDistanceToNow } from "date-fns";
import { io, Socket } from "socket.io-client";
import api from "@/lib/api";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  LocateFixed, 
  Activity as ActivityIcon, 
  Send, 
  Check, 
  CheckCheck, 
  MapPin, 
  Users, 
  Plus, 
  Dumbbell, 
  Image as ImageIcon, 
  Award, 
  Sparkles, 
  TrendingUp, 
  User, 
  PlusCircle, 
  Flame, 
  Smile, 
  Bookmark, 
  Camera,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  user: string;
  activity: string;
  metrics: string;
  time: string;
  imageUri?: string;
  caption?: string;
  likes?: number;
  likedBy?: string[]; // track who liked
  comments?: ChatMessage[];
  tags?: string[];
  reactions?: Record<string, string[]>;
}

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  time: string;
  readBy: string[];
  location?: { lat: number; lng: number };
  imageUri?: string;
}

const PRESET_ATHLETIC_PHOTOS = [
  {
    id: "run",
    name: "Golden Hour Trail",
    url: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=800&auto=format&fit=crop",
    category: "Running",
    defaultCaption: "Nothing beats a golden hour trail grind! Pushing the cardio boundaries today. 🌅💪",
    defaultActivity: "Evening Trail Run",
    defaultMetrics: "6.4 km · 31:40"
  },
  {
    id: "lift",
    name: "Iron Sanctuary",
    url: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=800&auto=format&fit=crop",
    category: "Strength",
    defaultCaption: "Chasing that peak pump. Consistency over intensity everyday! Lets lift! 🏋️‍♂️🔥",
    defaultActivity: "Powerlifting Session",
    defaultMetrics: "5 sets x 5 reps @ 120kg"
  },
  {
    id: "track",
    name: "Speed Endurance",
    url: "https://images.unsplash.com/photo-1502224562085-639556652f33?q=80&w=800&auto=format&fit=crop",
    category: "Speed",
    defaultCaption: "Championships are won in the off-season. Track speed drills felt incredible! ⚡🏃‍♂️",
    defaultActivity: "Interval Sprint Drills",
    defaultMetrics: "8 x 400m intervals · 28 min"
  },
  {
    id: "yoga",
    name: "Stretching & Breathwork",
    url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop",
    category: "Flexibility",
    defaultCaption: "Recovery is part of the training. Reconnecting with flow, breath, and mindset. 🧘‍♀️✨",
    defaultActivity: "Sunset Power Yoga",
    defaultMetrics: "45 min Active Flow"
  },
  {
    id: "cycling",
    name: "Peak Ascent Adventure",
    url: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=800&auto=format&fit=crop",
    category: "Cycling",
    defaultCaption: "Smashing massive climbs with local crew. The view from the peak makes it all worth it! 🚴‍♂️🏔️",
    defaultActivity: "High Elevation Cycling",
    defaultMetrics: "35.2 km · 1:12:05"
  }
];

const PRESET_MOTIVATOR_QUOTES = [
  "Incredible performance! Solid motivation right here. 🚀",
  "You are a machine! Inspiring stuff.",
  "Outstanding effort, keep showing up! 🔥",
  "This is pure dedication. Lets get it!",
  "Form looks absolutely pristine! 💯"
];

export function FeedView() {
  const activeTab: string = "feed";
  const setActiveTab = (tab: string) => {};
  
  const [feed, setFeed] = useState<Activity[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);

  // Profile Specific State with Local Storage persistence
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem("social_profile_name") || "Guest User";
  });
  const [athleteBio, setAthleteBio] = useState(() => {
    return localStorage.getItem("social_profile_bio") || "⚡ Push past limits | Daily 5K runner / Lifting enthusiast | Building peak functional fitness!";
  });
  const [profilePic, setProfilePic] = useState<string | null>(() => {
    return localStorage.getItem("social_profile_pic") || null;
  });
  const [coverPic, setCoverPic] = useState<string | null>(() => {
    return localStorage.getItem("social_profile_cover") || null;
  });
  const [fitnessGoals, setFitnessGoals] = useState(() => {
    return localStorage.getItem("social_profile_goals") || "Weight Loss & Strength Training";
  });
  const [weeklyTarget, setWeeklyTarget] = useState(() => {
    return localStorage.getItem("social_profile_weekly_target") || "4 workouts / week";
  });

  // Profile Edit Temporary draft states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempBio, setTempBio] = useState("");
  const [tempProfilePic, setTempProfilePic] = useState<string | null>(null);
  const [tempCoverPic, setTempCoverPic] = useState<string | null>(null);
  const [tempGoals, setTempGoals] = useState("");
  const [tempWeeklyTarget, setTempWeeklyTarget] = useState("");

  const [followingCount, setFollowingCount] = useState(148);
  const [followersCount, setFollowersCount] = useState(384);
  const [motivationLevel, setMotivationLevel] = useState(8);
  const [motivationXP, setMotivationXP] = useState(620);

  // New Workout Post State
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [activityName, setActivityName] = useState("Morning Run");
  const [performanceMetrics, setPerformanceMetrics] = useState("5.0 km · 25:00");
  const [postCaption, setPostCaption] = useState("");
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [uploadedImageUri, setUploadedImageUri] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>(["#noexcuses", "#morninggrind"]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isDragging, setIsDragging] = useState(false);

  // Comments State (tracked by activity ID as key)
  const [openCommentsId, setOpenCommentsId] = useState<string | null>(null);
  const [newCommentTexts, setNewCommentTexts] = useState<Record<string, string>>({});

  // High-five animations feedback
  const [highFiveCelebration, setHighFiveCelebration] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotificationToast, setShowNotificationToast] = useState<any>(null);

  // Progress Gallery State
  const [progressPhotos, setProgressPhotos] = useState<{id: string, uri: string, date: string, weight?: string}[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photoWeight, setPhotoWeight] = useState("");
  const webcamRef = useRef<Webcam>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savedPosts, setSavedPosts] = useState<string[]>([]);

  useEffect(() => {
    // Simulate initial data fetching
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const capturePhoto = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setProgressPhotos(prev => [
          { id: `photo-${Date.now()}`, uri: imageSrc, date: new Date().toISOString(), weight: photoWeight },
          ...prev
        ]);
        setIsCameraOpen(false);
        setPhotoWeight("");
      }
    }
  }, [webcamRef, photoWeight]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    localStorage.setItem("social_profile_name", currentUser);
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem("social_profile_bio", athleteBio);
  }, [athleteBio]);

  useEffect(() => {
    if (profilePic) localStorage.setItem("social_profile_pic", profilePic);
    else localStorage.removeItem("social_profile_pic");
  }, [profilePic]);

  useEffect(() => {
    if (coverPic) localStorage.setItem("social_profile_cover", coverPic);
    else localStorage.removeItem("social_profile_cover");
  }, [coverPic]);

  useEffect(() => {
    localStorage.setItem("social_profile_goals", fitnessGoals);
  }, [fitnessGoals]);

  useEffect(() => {
    localStorage.setItem("social_profile_weekly_target", weeklyTarget);
  }, [weeklyTarget]);

  const handleStartEditing = () => {
    setTempName(currentUser);
    setTempBio(athleteBio);
    setTempProfilePic(profilePic);
    setTempCoverPic(coverPic);
    setTempGoals(fitnessGoals);
    setTempWeeklyTarget(weeklyTarget);
    setIsEditingProfile(true);
  };

  const handleSaveProfileChanges = () => {
    setCurrentUser(tempName.trim() || "Guest User");
    setAthleteBio(tempBio.trim());
    setProfilePic(tempProfilePic);
    setCoverPic(tempCoverPic);
    setFitnessGoals(tempGoals.trim() || "Weight Loss & Strength Training");
    setWeeklyTarget(tempWeeklyTarget.trim() || "4 workouts / week");
    setIsEditingProfile(false);
  };

  const handleUploadProfilePicTemp = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            setTempProfilePic(ev.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleUploadCoverPicTemp = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            setTempCoverPic(ev.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleDropPhoto = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setUploadedImageUri(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Load local draft
    const savedDraft = localStorage.getItem('workout_post_draft');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.activityName) setActivityName(parsed.activityName);
        if (parsed.performanceMetrics) setPerformanceMetrics(parsed.performanceMetrics);
        if (parsed.postCaption) setPostCaption(parsed.postCaption);
        if (parsed.selectedPresetIndex !== undefined) setSelectedPresetIndex(parsed.selectedPresetIndex);
        if (parsed.uploadedImageUri) setUploadedImageUri(parsed.uploadedImageUri);
        if (parsed.selectedTags) setSelectedTags(parsed.selectedTags);
        // Automatically open the share panel if there's an active draft
        setShowSharePanel(true);
      } catch (e) {}
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const draft = {
      activityName,
      performanceMetrics,
      postCaption,
      selectedPresetIndex,
      uploadedImageUri,
      selectedTags,
    };
    if (activityName || postCaption || uploadedImageUri) {
      localStorage.setItem('workout_post_draft', JSON.stringify(draft));
    }
  }, [activityName, performanceMetrics, postCaption, selectedPresetIndex, uploadedImageUri, selectedTags]);

  useEffect(() => {
    if (!isOffline && socketRef.current) {
      // Flush offline queue on reconnection
      const offlineQueue = JSON.parse(localStorage.getItem('offline_posts_queue') || '[]');
      if (offlineQueue.length > 0) {
        offlineQueue.forEach((post: any) => {
           socketRef.current?.emit("new_activity", post);
        });
        localStorage.removeItem('offline_posts_queue');
      }
    }
  }, [isOffline]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    socketRef.current = io({ auth: { token } });

    socketRef.current.on("feed_init", (initialFeed: Activity[]) => {
      // Seed preset sporty images to feed matches that don't have images
      const enhancedFeed = initialFeed.map((item, index) => {
        const preset = PRESET_ATHLETIC_PHOTOS[index % PRESET_ATHLETIC_PHOTOS.length];
        return {
          ...item,
          imageUri: item.imageUri || preset.url,
          caption: item.caption || preset.defaultCaption,
          likes: item.likes || Math.floor(Math.random() * 25) + 5,
          likedBy: item.likedBy || [],
          comments: item.comments || [
            {
              id: `c1-${index}`,
              user: "Sarah Jenks",
              text: PRESET_MOTIVATOR_QUOTES[index % PRESET_MOTIVATOR_QUOTES.length],
              time: new Date(Date.now() - 1200000).toISOString(),
              readBy: []
            },
            {
              id: `c2-${index}`,
              user: "Coach Sarah",
              text: "Keep pushing that standard! Outstanding layout. 💯🏆",
              time: new Date(Date.now() - 300000).toISOString(),
              readBy: []
            }
          ],
          tags: item.tags || ["#workout", `#${preset.category.toLowerCase()}`, "#beastmode"]
        };
      });
      setFeed(enhancedFeed);
    });

    socketRef.current.on("chat_init", (initialMessages: ChatMessage[]) => {
      setMessages(initialMessages);
      markMessagesAsRead(initialMessages);
    });

    socketRef.current.on("feed_update", (newActivity: Activity) => {
      // Match image and setup defaults if not present
      const preset = PRESET_ATHLETIC_PHOTOS[0];
      const enhancedActivity: Activity = {
        ...newActivity,
        imageUri: newActivity.imageUri || preset.url,
        caption: newActivity.caption || "Lets go team! Stay healthy! ⚡",
        likes: newActivity.likes || 1,
        likedBy: [],
        comments: newActivity.comments || [],
        tags: newActivity.tags || ["#workout", "#sporthub", "#healthylifestyle"]
      };
      setFeed((prev) => [enhancedActivity, ...prev]);
    });

    socketRef.current.on("new_message", (newMsg: ChatMessage) => {
      setMessages((prev) => [...prev, newMsg]);
      if (activeTab === "chat") {
         socketRef.current?.emit("mark_read", { messageId: newMsg.id, user: currentUser });
      }
    });

    socketRef.current.on("user_typing", (data: { user: string, isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (data.isTyping) next.add(data.user);
        else next.delete(data.user);
        return next;
      });
    });

    socketRef.current.on("message_read_update", (data: { messageId: string, readBy: string[] }) => {
      setMessages((prev) => 
        prev.map(m => m.id === data.messageId ? { ...m, readBy: data.readBy } : m)
      );
    });

    socketRef.current.on("sos_alert_broadcast", (data: { user: string, location: { lat: number, lng: number } }) => {
      setMessages((prev) => [
        ...prev, 
        {
          id: `sos-${Date.now()}`,
          user: data.user,
          text: "🚨 EMERGENCY SOS ACTIVATED 🚨",
          time: new Date().toISOString(),
          readBy: [],
          location: data.location
        }
      ]);
    });

    socketRef.current.on("activity_updated", (updatedActivity: Activity) => {
      setFeed((prev) => prev.map(item => item.id === updatedActivity.id ? updatedActivity : item));
    });

    socketRef.current.on("notification", (notification: any) => {
      if (notification.targetUser === currentUser && notification.fromUser !== currentUser) {
        setNotifications((prev) => [notification, ...prev]);
        setShowNotificationToast(notification);
        setTimeout(() => setShowNotificationToast(null), 5000);
      }
    });

    return () => {
      socketRef.current?.disconnect();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      markMessagesAsRead(messages);
    }
  }, [messages, activeTab]);

  const markMessagesAsRead = (msgs: ChatMessage[]) => {
    msgs.forEach(msg => {
      if (!msg.readBy.includes(currentUser) && socketRef.current) {
         socketRef.current.emit("mark_read", { messageId: msg.id, user: currentUser });
      }
    });
  };

  // Live action interactions
  const handleLikeClick = (id: string) => {
    socketRef.current?.emit("like_activity", { activityId: id, user: currentUser });

    setFeed(prev => prev.map(item => {
      if (item.id === id) {
        const likedBy = item.likedBy || [];
        const isLiked = likedBy.includes(currentUser);
        const newLikedBy = isLiked 
          ? likedBy.filter(u => u !== currentUser)
          : [...likedBy, currentUser];
        
        // Trigger micro-celebration feedback on screen
        if (!isLiked) {
          setHighFiveCelebration(id);
          setTimeout(() => setHighFiveCelebration(null), 1000);
          // Reward XP to current user for public interaction!
          setMotivationXP(prev => {
            const next = prev + 15;
            if (next >= 1000) {
              setMotivationLevel(l => l + 1);
              return next - 1000;
            }
            return next;
          });
        }

        return {
          ...item,
          likedBy: newLikedBy,
          likes: (item.likes || 0) + (isLiked ? -1 : 1)
        };
      }
      return item;
    }));
  };

  const handleReaction = (id: string, emoji: string) => {
    socketRef.current?.emit("react_activity", { activityId: id, user: currentUser, emoji });

    setFeed(prev => prev.map(item => {
      if (item.id === id) {
        const reactions = item.reactions ? { ...item.reactions } : {};
        if (!reactions[emoji]) reactions[emoji] = [];
        
        const isReacted = reactions[emoji].includes(currentUser);
        if (isReacted) {
          reactions[emoji] = reactions[emoji].filter(u => u !== currentUser);
          if (reactions[emoji].length === 0) {
            delete reactions[emoji];
          }
        } else {
          reactions[emoji] = [...reactions[emoji], currentUser];
          
          setHighFiveCelebration(`${id}-${emoji}`);
          setTimeout(() => setHighFiveCelebration(null), 1000);
          setMotivationXP(prevXP => {
            const next = prevXP + 5;
            if (next >= motivationLevel * 100) {
              setMotivationLevel(l => l + 1);
              return next - (motivationLevel * 100);
            }
            return next;
          });
        }
        
        return {
          ...item,
          reactions
        };
      }
      return item;
    }));
  };

  const handleSavePost = async (activityId: string) => {
    try {
      const res = await api.post(`/users/save-post/${activityId}`);
      setSavedPosts(res.data.savedPosts || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePostInspirationalWorkout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socketRef.current && !isOffline) return;

    const imageSelected = uploadedImageUri || PRESET_ATHLETIC_PHOTOS[selectedPresetIndex].url;
    const captionText = postCaption.trim() || PRESET_ATHLETIC_PHOTOS[selectedPresetIndex].defaultCaption;

    const postPayload = {
      id: `offline-${Date.now()}`,
      user: currentUser,
      activity: activityName.trim() || PRESET_ATHLETIC_PHOTOS[selectedPresetIndex].defaultActivity,
      metrics: performanceMetrics.trim() || PRESET_ATHLETIC_PHOTOS[selectedPresetIndex].defaultMetrics,
      imageUri: imageSelected,
      caption: captionText,
      tags: selectedTags,
      time: new Date().toISOString(),
      likes: 1,
      comments: [
        {
          id: `c-guest-${Date.now()}`,
          user: "Alex Walker",
          text: "Insane work! Keep publishing these custom workout guides!",
          time: new Date().toISOString(),
          readBy: []
        }
      ]
    };

    if (isOffline) {
      // Save locally
      const offlineQueue = JSON.parse(localStorage.getItem('offline_posts_queue') || '[]');
      offlineQueue.push(postPayload);
      localStorage.setItem('offline_posts_queue', JSON.stringify(offlineQueue));
      // Add to local feed immediately with optimistic UI
      setFeed(prev => [postPayload, ...prev]);
    } else {
      socketRef.current?.emit("new_activity", postPayload);
    }

    // Clear local storage draft
    localStorage.removeItem('workout_post_draft');

    // Award major XP for motivating the community
    setMotivationXP(prev => {
      const next = prev + 100;
      if (next >= 1000) {
        setMotivationLevel(l => l + 1);
        return next - 1000;
      }
      return next;
    });

    // Reset states
    setPostCaption("");
    setUploadedImageUri(null);
    setShowSharePanel(false);
    setActiveTab("feed");
  };

  const handleAddComment = (activityId: string) => {
    const textState = newCommentTexts[activityId] || "";
    if (!textState.trim()) return;

    setFeed(prev => prev.map(item => {
      if (item.id === activityId) {
        const existingComments = item.comments || [];
        const newCommentObj: ChatMessage = {
          id: `c-user-${Date.now()}`,
          user: currentUser,
          text: textState.trim(),
          time: new Date().toISOString(),
          readBy: []
        };
        return {
          ...item,
          comments: [...existingComments, newCommentObj]
        };
      }
      return item;
    }));

    // Clear comment input
    setNewCommentTexts(prev => ({
      ...prev,
      [activityId]: ""
    }));

    socketRef.current?.emit("comment_activity", { activityId, user: currentUser, text: textState.trim() });

    // Small XP progression boost
    setMotivationXP(prev => {
      const next = prev + 20;
      if (next >= 1000) {
        setMotivationLevel(l => l + 1);
        return next - 1000;
      }
      return next;
    });
  };

  const handleUploadPhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            setUploadedImageUri(ev.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const toggleTagSelection = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Group chat messaging
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !inputText.startsWith('data:image')) return;
    socketRef.current?.emit("send_message", { user: currentUser, text: inputText });
    setInputText("");
    
    socketRef.current?.emit("typing", { user: currentUser, isTyping: false });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    
    if (socketRef.current) {
      socketRef.current.emit("typing", { user: currentUser, isTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit("typing", { user: currentUser, isTyping: false });
      }, 2000);
    }
  };

  const shareLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!socketRef.current) return;
          socketRef.current.emit("send_message", { 
            user: currentUser, 
            text: "📍 Shared a location", 
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          });
        },
        (error) => {
          console.error("Error getting location", error);
          alert("Unable to fetch location.");
        }
      );
    }
  };

  const sharePhotoInChat = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file && socketRef.current) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          socketRef.current!.emit("send_message", {
            user: currentUser,
            text: "Shared a photo",
            imageUri: ev.target?.result
          });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const _typingUsersArr = Array.from(typingUsers).filter(u => u !== currentUser);

  // Filter current user's feed for profile page
  const currentUserFeed = feed.filter(item => item.user === currentUser);

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto w-full pb-24 md:pb-10 overflow-hidden h-full flex flex-col relative animate-pulse">
        {/* High-Level Header Skeleton */}
        <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
          <div>
            <div className="h-8 w-48 bg-gray-700/50 rounded mb-2"></div>
            <div className="h-4 w-96 max-w-full bg-gray-700/50 rounded"></div>
          </div>
          <div className="h-10 w-40 bg-[#21D4B5]/20 rounded-xl"></div>
        </header>

        {/* Top Navigation Tabs Skeleton */}
        <div className="flex overflow-x-auto gap-2 border-b border-brand-border pb-4 mb-6 shrink-0">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-9 w-24 bg-gray-700/50 rounded-full shrink-0"></div>
          ))}
        </div>

        {/* Content Area Skeleton */}
        <div className="flex-1 overflow-y-auto space-y-6 pb-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-brand-surface border border-brand-border rounded-[20px] overflow-hidden flex flex-col h-[400px]">
              <div className="p-4 flex items-center justify-between border-b border-brand-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-700/50"></div>
                  <div>
                    <div className="h-4 w-24 bg-gray-700/50 rounded mb-1"></div>
                    <div className="h-3 w-16 bg-gray-700/50 rounded"></div>
                  </div>
                </div>
                <div className="h-6 w-20 bg-gray-700/50 rounded-full"></div>
              </div>
              <div className="p-5 flex-1 bg-gray-700/20">
                <div className="h-6 w-3/4 bg-gray-700/50 rounded mb-4"></div>
                <div className="h-20 w-full bg-gray-700/50 rounded-xl mb-4"></div>
                <div className="h-3 w-full bg-gray-700/50 rounded mb-2"></div>
                <div className="h-3 w-5/6 bg-gray-700/50 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full pb-24 md:pb-10 overflow-hidden h-full flex flex-col relative">
      {/* Toast Notification */}
      {showNotificationToast && (
        <div className="absolute top-4 right-4 z-50 bg-[#2A2D3A] border border-[#21D4B5] rounded-lg shadow-[0_0_15px_rgba(33,212,181,0.3)] p-4 pr-10 min-w-[250px] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex items-start gap-3">
             <div className="bg-[#21D4B5]/20 p-2 rounded-full shrink-0">
               <Star className="w-4 h-4 text-[#21D4B5]" />
             </div>
             <div>
               <p className="text-xs font-bold text-white mb-0.5">New Interaciton Focus</p>
               <p className="text-[11px] text-brand-text-secondary">{showNotificationToast.message}</p>
             </div>
          </div>
          <button 
             onClick={() => setShowNotificationToast(null)}
             className="absolute top-2 right-2 text-brand-text-secondary hover:text-white"
          >
             &times;
          </button>
        </div>
      )}

      {/* High-Level Header */}
      <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl md:text-2xl font-bold text-brand-text-primary tracking-tight">Community Hub</h2>
            {isOffline && (
              <span className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded flex items-center">
                Offline Mode
              </span>
            )}
          </div>
          <p className="text-sm text-brand-text-secondary mt-1">
            Motivate and inspire the public! Complete visual workout diaries, shared photos, and live training grids.
          </p>
        </div>
        
        {activeTab === "feed" && (
          <button 
            onClick={() => setShowSharePanel(!showSharePanel)}
            className="bg-brand-accent text-[#13151a] hover:bg-[#1bc1a4] text-xs font-bold px-4 py-2.5 rounded-md flex items-center gap-1.5 transition-all shadow-md shrink-0 self-start md:self-end"
          >
            <Plus className="w-4 h-4 text-[#13151a]" />
            Share Workout Story
          </button>
        )}
      </header>

      {/* Tabs navigation */}
      

      <div className="flex-1 overflow-y-auto space-y-4 hide-scrollbar relative rounded-md">
        {/* PUBLIC MOTIVATION FEED */}
        {activeTab === "feed" && (
          <div className="space-y-4 pb-6">
            
            {/* INSPIRING SHARE COMPOSER (COLLAPSIBLE SLIDE) */}
            {showSharePanel && (
              <form onSubmit={handlePostInspirationalWorkout} className="bg-[#1f222b] border-2 border-brand-accent/30 rounded-lg p-5 space-y-4 animate-in slide-in-from-top duration-300">
                <div className="flex justify-between items-center pb-2 border-b border-brand-border">
                  <h3 className="font-bold text-sm text-brand-text-primary flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-accent" /> Configure Workout Post Card
                  </h3>
                  <button 
                    type="button" 
                    onClick={() => setShowSharePanel(false)}
                    className="text-brand-text-secondary hover:text-brand-text-primary text-xs"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* LEFT: TEXT & INFO */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-brand-text-secondary uppercase tracking-wider font-semibold mb-1">
                        Activity Name
                      </label>
                      <input 
                        type="text" 
                        value={activityName}
                        onChange={(e) => setActivityName(e.target.value)}
                        placeholder="e.g., Run Sunrise, Heavy Deadlift, Power Stretch"
                        className="w-full bg-[#13151a] border border-brand-border rounded p-2 text-xs text-brand-text-primary focus:outline-none focus:border-brand-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-brand-text-secondary uppercase tracking-wider font-semibold mb-1">
                        Performance Metrics
                      </label>
                      <input 
                        type="text" 
                        value={performanceMetrics}
                        onChange={(e) => setPerformanceMetrics(e.target.value)}
                        placeholder="e.g., 5.4 km · 28:10 or 3 sets x 8 reps @ 80kg"
                        className="w-full bg-[#13151a] border border-brand-border rounded p-2 text-xs text-brand-text-primary focus:outline-none focus:border-brand-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-brand-text-secondary uppercase tracking-wider font-semibold mb-1">
                        Caption / Motivation Text
                      </label>
                      <textarea
                        value={postCaption}
                        onChange={(e) => setPostCaption(e.target.value)}
                        placeholder="Add some inspirational quotes, training lessons, or physical notes..."
                        rows={3}
                        className="w-full bg-[#13151a] border border-brand-border rounded p-2 text-xs text-brand-text-primary focus:outline-none focus:border-brand-accent scrollbar-none"
                      />
                    </div>
                  </div>

                  {/* RIGHT: PICTURE SELECTION (TEMPLATES / UPLOAD) */}
                  <div className="space-y-4">
                    <label className="block text-[11px] text-brand-text-secondary uppercase tracking-wider font-semibold">
                      Background Workout Picture Presets
                    </label>

                    {/* PRESET HIGHLIGHT CAROUSEL */}
                    <div className="grid grid-cols-5 gap-1.5 py-1">
                      {PRESET_ATHLETIC_PHOTOS.map((preset, idx) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setSelectedPresetIndex(idx);
                            setUploadedImageUri(null);
                            // Set defaults for nice UX
                            setActivityName(preset.defaultActivity);
                            setPerformanceMetrics(preset.defaultMetrics);
                            setPostCaption(preset.defaultCaption);
                          }}
                          className={cn(
                            "relative h-10 rounded overflow-hidden border transition-all",
                            selectedPresetIndex === idx && !uploadedImageUri
                              ? "border-brand-accent ring-1 ring-brand-accent/50 scale-105" 
                              : "border-brand-border opacity-70 hover:opacity-100"
                          )}
                        >
                          <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>

                    {/* DRAG-AND-DROP FILE UPLOAD ZONE */}
                    <div 
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDropPhoto}
                      onClick={handleUploadPhoto}
                      className={cn(
                        "h-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all",
                        isDragging 
                          ? "border-brand-accent bg-brand-accent/5" 
                          : uploadedImageUri 
                            ? "border-[#21D4B5]/40 bg-[#21D4B5]/5 hover:border-brand-accent" 
                            : "border-brand-border hover:border-brand-accent bg-[#13151a]"
                      )}
                    >
                      {uploadedImageUri ? (
                        <div className="flex items-center gap-3 px-4 w-full h-full">
                          <img src={uploadedImageUri} alt="Uploaded" className="w-16 h-16 rounded object-cover border border-brand-border shrink-0" />
                          <div className="text-left select-none">
                            <p className="text-xs font-bold text-white uppercase font-mono">Custom photo loaded</p>
                            <p className="text-[10px] text-brand-text-secondary">Drag a new photo or click to choose a different image file.</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className={cn("w-5 h-5", isDragging ? "text-brand-accent" : "text-brand-text-secondary")} />
                          <p className="text-xs text-brand-text-primary text-center">
                            {isDragging ? "Drop your photo here!" : "Drag & drop image or Click to Upload custom story picture"}
                          </p>
                          <p className="text-[9px] text-brand-text-secondary">PNG, JPG, or WEBP pictures</p>
                        </>
                      )}
                    </div>

                    {/* CHIPS SELECTION */}
                    <div>
                      <label className="block text-[10px] text-brand-text-secondary uppercase font-semibold mb-1">
                        Quick Tags Selection
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {["#noexcuses", "#morninggrind", "#beastmode", "#cardioday", "#powerlifting", "#yoga"].map(tag => {
                          const isActive = selectedTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleTagSelection(tag)}
                              className={cn(
                                "text-[10px] font-mono px-2 py-0.5 rounded transition-colors",
                                isActive 
                                  ? "bg-brand-accent text-[#13151a] font-bold" 
                                  : "bg-[#13151a] text-brand-text-secondary hover:text-brand-text-primary"
                              )}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowSharePanel(false)}
                    className="px-4 py-2 text-xs font-semibold hover:text-brand-text-primary text-brand-text-secondary transition-colors"
                  >
                    Discard
                  </button>
                  <button 
                    type="submit"
                    className="bg-brand-accent text-[#13151a] font-bold px-5 py-2 rounded text-xs transition-transform hover:scale-[1.02]"
                  >
                    Publish Athletic Story ✨
                  </button>
                </div>
              </form>
            )}

            {/* STUNNING WORKOUT ACTIVITY FEED GRID */}
            <div className="grid gap-6">
              <AnimatePresence>
                {feed.map((item) => {
                  const isLiked = (item.likedBy || []).includes(currentUser);
                  const commentsList = item.comments || [];
                  const postTags = item.tags || [];
                  const commentsOpen = openCommentsId === item.id;

                  return (
                    <motion.div 
                      key={item.id} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      className="bg-brand-surface border border-brand-border rounded-[16px] overflow-hidden shadow-xl transition-all hover:border-[#21D4B5]/30"
                    >
                      {/* Top user bar */}
                      <div className="p-4 flex items-center justify-between border-b border-brand-border">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-surface-light overflow-hidden flex items-center justify-center font-bold text-brand-accent border border-brand-border shadow-sm text-sm">
                          {item.user === currentUser && profilePic ? (
                            <img src={profilePic} alt={item.user} className="w-full h-full object-cover" />
                          ) : (
                            item.user.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-brand-text-primary hover:text-brand-accent transition-colors cursor-pointer">
                              {item.user}
                            </h4>
                            {item.user === currentUser && (
                              <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.2 rounded uppercase font-bold tracking-wider">
                                YOU
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-brand-text-secondary font-mono">
                            {formatDistanceToNow(new Date(item.time), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 bg-[#171920] px-2.5 py-1 rounded-full border border-brand-border">
                        <Flame className="w-3.5 h-3.5 text-brand-accent animate-pulse" />
                        <span className="text-[10px] text-brand-text-primary font-bold font-mono uppercase">
                          {item.activity}
                        </span>
                      </div>
                    </div>

                    {/* Workout Card Hero Content with PICTURE IN IT */}
                    <div className="relative w-full aspect-video md:aspect-[21/9] overflow-hidden group">
                      <img 
                        src={item.imageUri} 
                        alt={item.activity} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      {/* Dark gradient overlay to secure text legibility */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent"></div>

                      {/* Embedded Workout Metric Badges */}
                      <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-1">
                        <div className="flex flex-wrap gap-2">
                          <span className="bg-[#21D4B5] text-[#13151a] text-xs font-bold font-mono px-3 py-1 rounded-md shadow-lg flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5" />
                            {item.metrics}
                          </span>
                        </div>
                      </div>

                      {/* Flying celebration particle preview on micro-lick */}
                      {(highFiveCelebration === item.id || highFiveCelebration?.startsWith(`${item.id}-`)) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#21D4B5]/10 animate-ping duration-1000 z-20 pointer-events-none">
                          {highFiveCelebration.includes('-') ? (
                            <span className="text-6xl drop-shadow-[0_0_15px_#21D4B5] scale-150 transition-transform">
                              {highFiveCelebration.split('-')[1]}
                            </span>
                          ) : (
                            <Sparkles className="w-16 h-16 text-[#21D4B5] drop-shadow-[0_0_15px_#21D4B5] rotate-12" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Caption Comments Panel */}
                    <div className="p-5 space-y-4">
                      {/* Caption text */}
                      {item.caption && (
                        <p className="text-sm text-brand-text-primary leading-relaxed">
                          {item.caption}
                        </p>
                      )}

                      {/* Hashtags list */}
                      {postTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {postTags.map(tag => (
                            <span 
                              key={tag} 
                              className="text-[11px] text-brand-accent bg-[#21d4b5]/10 border border-[#21d4b5]/20 px-2 py-0.5 rounded-full font-mono hover:bg-brand-accent/20 cursor-pointer"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Reactions Display */}
                      {item.reactions && Object.keys(item.reactions).length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {Object.entries(item.reactions).map(([emoji, users]) => {
                            const userList = users as string[];
                            return (
                              <button 
                                key={emoji}
                                onClick={() => handleReaction(item.id, emoji)}
                                className={cn(
                                  "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border transition-colors",
                                  userList.includes(currentUser) 
                                    ? "bg-[#21D4B5]/20 border-[#21D4B5]/40 text-[#21D4B5]" 
                                    : "bg-[#1c1e26] border-brand-border text-brand-text-secondary hover:bg-[#2A2D3A]"
                                )}
                              >
                                <span>{emoji}</span>
                                <span>{userList.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Interactive Buttons footer bar */}
                      <div className="flex items-center gap-6 pt-3 border-t border-brand-border">
                        <button 
                          onClick={() => handleLikeClick(item.id)}
                          className={cn(
                            "flex items-center gap-1.5 transition-all group scale-100 hover:scale-105 active:scale-95",
                            isLiked ? "text-red-500 font-bold" : "text-brand-text-secondary hover:text-red-400"
                          )}
                        >
                          <Heart className={cn("w-4 h-4 transition-all", isLiked ? "fill-current scale-110" : "group-hover:scale-110")} />
                          <span className="text-xs font-mono">
                            {item.likes || 0} Likes
                          </span>
                        </button>

                        <button 
                          onClick={() => setOpenCommentsId(commentsOpen ? null : item.id)}
                          className={cn(
                            "flex items-center gap-1.5 text-brand-text-secondary hover:text-brand-accent transition-colors",
                            commentsOpen && "text-brand-accent font-bold"
                          )}
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-xs font-mono">{commentsList.length} Comments</span>
                        </button>

                        <button 
                          onClick={() => handleSavePost(item.id)}
                          className={cn(
                            "flex items-center gap-1.5 transition-colors",
                            savedPosts.includes(item.id) ? "text-blue-400 font-bold" : "text-brand-text-secondary hover:text-blue-400"
                          )}
                        >
                          <Bookmark className={cn("w-4 h-4 transition-all", savedPosts.includes(item.id) ? "fill-current" : "")} />
                          <span className="text-xs font-mono hidden sm:inline">Save</span>
                        </button>

                        {/* Quick Emoji Reactions */}
                        <div className="ml-auto flex items-center gap-1 hidden sm:flex">
                          {['🔥', '👏', '💪', '💯'].map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(item.id, emoji)}
                              className="p-1.5 rounded-full hover:bg-[#2A2D3A] transition-transform hover:scale-110 active:scale-95 text-lg leading-none"
                              title={`React with ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* COMMENTS PANEL ACCORDION BODY */}
                      {commentsOpen && (
                        <div className="border-t border-brand-border pt-4 mt-2 space-y-3 animate-in fade-in duration-200">
                          {commentsList.length > 0 ? (
                            <div className="max-h-[160px] overflow-y-auto space-y-2.5 pr-2 scrollbar-none text-xs">
                              {commentsList.map((comm) => (
                                <div key={comm.id} className="bg-[#1c1e26] p-2.5 rounded-lg border border-brand-border flex flex-col">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-brand-text-primary">{comm.user}</span>
                                    <span className="text-[9px] text-brand-text-secondary font-mono">
                                      {formatDistanceToNow(new Date(comm.time), { addSuffix: true })}
                                    </span>
                                  </div>
                                  <p className="text-brand-text-secondary text-xs">{comm.text}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-brand-text-secondary text-center py-2">
                              No comments yet. Write the first motivational words! 🚀
                            </p>
                          )}

                          {/* Quick Preselected response replies */}
                          <div className="flex flex-wrap gap-1 pt-1">
                            {PRESET_MOTIVATOR_QUOTES.slice(0, 3).map(quote => (
                              <button
                                key={quote}
                                onClick={() => {
                                  setNewCommentTexts(prev => ({
                                    ...prev,
                                    [item.id]: quote
                                  }));
                                }}
                                className="text-[10px] bg-[#2a2d3a] hover:bg-[#343949] text-brand-text-primary px-2 py-1 rounded border border-brand-border transition-colors max-w-full truncate"
                              >
                                {quote}
                              </button>
                            ))}
                          </div>

                          {/* Comment Form Input */}
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={newCommentTexts[item.id] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setNewCommentTexts(prev => ({
                                  ...prev,
                                  [item.id]: val
                                }));
                              }}
                              placeholder="Type dynamic motivation quote..."
                              className="flex-1 bg-[#13151a] border border-brand-border rounded px-3 text-xs text-brand-text-primary focus:outline-none focus:border-brand-accent placeholder-[#555]"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleAddComment(item.id);
                              }}
                            />
                            <button
                              onClick={() => handleAddComment(item.id)}
                              className="bg-brand-accent hover:bg-[#1bc1a4] text-[#13151a] px-3.5 rounded text-xs font-bold transition-colors flex items-center justify-center shrink-0"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* PERSONAL PORTRAIT DIARY / PAGE PROFILE (MIGRATED TO PROFILE VIEW) */}
        {false && activeTab === "profile" && (
          <div className="space-y-6 pb-6 animate-in fade-in duration-300">
            {isEditingProfile ? (
              /* Customization Form Display */
              <div className="bg-brand-surface border border-brand-accent/50 rounded-[20px] p-6 shadow-2xl space-y-6 animate-in slide-in-from-top-4 duration-300">
                <div className="flex justify-between items-center pb-3.5 border-b border-brand-border">
                  <h3 className="font-bold text-base text-brand-text-primary flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-brand-accent animate-pulse" /> Edit Athlete Profile
                  </h3>
                  <button 
                    onClick={() => setIsEditingProfile(false)}
                    className="text-xs text-brand-text-secondary hover:text-brand-text-primary border border-brand-border px-3 py-1.5 rounded-lg bg-[#181a22] transition-colors"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: text inputs */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-brand-text-secondary uppercase tracking-wider mb-1.5 font-mono">
                        Display Athlete Name
                      </label>
                      <input 
                        type="text" 
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        placeholder="e.g. Guest User"
                        className="w-full bg-[#13151a] border border-brand-border rounded-lg p-2.5 text-xs text-brand-text-primary focus:outline-none focus:ring-1 focus:ring-[#21D4B5] focus:border-[#21D4B5] font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-brand-text-secondary uppercase tracking-wider mb-1.5 font-mono">
                        Weekly Training Target
                      </label>
                      <input 
                        type="text" 
                        value={tempWeeklyTarget}
                        onChange={(e) => setTempWeeklyTarget(e.target.value)}
                        placeholder="e.g. 4 workouts / week"
                        className="w-full bg-[#13151a] border border-brand-border rounded-lg p-2.5 text-xs text-brand-text-primary focus:outline-none focus:ring-1 focus:ring-[#21D4B5] focus:border-[#21D4B5] font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-brand-text-secondary uppercase tracking-wider mb-1.5 font-mono">
                        Fitness Focus & Primary Goals
                      </label>
                      <input 
                        type="text" 
                        value={tempGoals}
                        onChange={(e) => setTempGoals(e.target.value)}
                        placeholder="e.g. Weight Loss & Strength Training"
                        className="w-full bg-[#13151a] border border-brand-border rounded-lg p-2.5 text-xs text-brand-text-primary focus:outline-none focus:ring-1 focus:ring-[#21D4B5] focus:border-[#21D4B5] font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-brand-text-secondary uppercase tracking-wider mb-1.5 font-mono">
                        Motivation Status & Bio Message
                      </label>
                      <textarea
                        value={tempBio}
                        onChange={(e) => setTempBio(e.target.value)}
                        placeholder="Write something that motivates you..."
                        rows={3}
                        className="w-full bg-[#13151a] border border-brand-border rounded-lg p-2.5 text-xs text-brand-text-primary focus:outline-none focus:ring-1 focus:ring-[#21D4B5] focus:border-[#21D4B5] scrollbar-none font-semibold resize-none"
                      />
                    </div>
                  </div>

                  {/* Right Column: Pictures/Avatars */}
                  <div className="space-y-5">
                    {/* Profile Picture upload customizer */}
                    <div>
                      <label className="block text-xs font-bold text-brand-text-secondary uppercase tracking-wider mb-2 font-mono">
                        Custom Avatar Image
                      </label>
                      <div className="flex items-center gap-4 bg-[#181a22] p-4 rounded-xl border border-brand-border">
                        <div className="w-16 h-16 rounded-full bg-brand-surface border-2 border-brand-border overflow-hidden flex items-center justify-center text-brand-accent text-2xl font-bold shrink-0 shadow-lg">
                          {tempProfilePic ? (
                            <img src={tempProfilePic} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            (tempName || currentUser).charAt(0)
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <button
                            type="button"
                            onClick={handleUploadProfilePicTemp}
                            className="bg-[#2a2d3a] hover:bg-[#343949] text-brand-text-primary text-xs font-semibold px-4 py-2 rounded-lg border border-brand-border transition-colors flex items-center gap-1.5"
                          >
                            <Camera className="w-4 h-4 text-brand-accent" /> Select Image file
                          </button>
                          {tempProfilePic && (
                            <button
                              type="button"
                              onClick={() => setTempProfilePic(null)}
                              className="text-red-400 hover:text-red-300 text-[10px] uppercase font-bold text-left px-1 transition-colors"
                            >
                              Reset to standard initials
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Cover Banner upload picker */}
                    <div>
                      <label className="block text-xs font-bold text-brand-text-secondary uppercase tracking-wider mb-2 font-mono">
                        Custom Cover Banner Image
                      </label>
                      <div className="flex flex-col gap-3.5 bg-[#181a22] p-4 rounded-xl border border-brand-border">
                        <div className="h-16 rounded-lg overflow-hidden border border-brand-border bg-brand-surface relative flex items-center justify-center shadow-inner">
                          {tempCoverPic ? (
                            <img src={tempCoverPic} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="absolute inset-0 bg-[#0f1115]" style={{ backgroundImage: 'radial-gradient(#21D4B5 1.5px, transparent 1.5px)', backgroundSize: '16px 16px', opacity: 0.15 }}></div>
                          )}
                        </div>
                        <div className="flex gap-2.5">
                          <button
                            type="button"
                            onClick={handleUploadCoverPicTemp}
                            className="bg-[#2a2d3a] hover:bg-[#343949] text-brand-text-primary text-xs font-semibold px-4 py-2 rounded-lg border border-brand-border transition-colors flex-1 flex items-center justify-center gap-1.5"
                          >
                            <Camera className="w-4 h-4 text-brand-accent" /> Upload Banner
                          </button>
                          {tempCoverPic && (
                            <button
                              type="button"
                              onClick={() => setTempCoverPic(null)}
                              className="bg-red-500/10 hover:bg-red-500/15 text-red-400 border border-red-500/20 text-xs px-3.5 py-2 rounded-lg font-semibold transition-colors"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-brand-border flex justify-end gap-3">
                  <button 
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 text-xs font-semibold hover:text-brand-text-primary text-brand-text-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveProfileChanges}
                    className="bg-[#21D4B5] text-[#13151a] font-bold px-6 py-2.5 rounded-lg text-xs transition-transform hover:scale-[1.02] flex items-center gap-1.5 shadow-lg shadow-[#21D4B5]/20"
                  >
                    Save Profile Changes ✨
                  </button>
                </div>
              </div>
            ) : (
              /* Athlete Cover & Header Normal mode */
              <div className="bg-brand-surface border border-brand-border rounded-[20px] overflow-hidden shadow-xl">
                <div className="relative h-28 md:h-36 bg-[#21D4B5]/20 overflow-hidden">
                  {coverPic ? (
                    <img src={coverPic} alt="Athlete Cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-[#0f1115]" style={{ backgroundImage: 'radial-gradient(#21D4B5 1.5px, transparent 1.5px)', backgroundSize: '24px 24px', opacity: 0.15 }}></div>
                  )}
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-[#13151a]/80 backdrop-blur-sm border border-brand-border px-3 py-1 rounded-full text-[11px] font-mono font-bold text-brand-accent shadow">
                    <Award className="w-4 h-4 text-brand-accent animate-bounce" /> Level {motivationLevel} Athlete
                  </div>
                </div>

                <div className="px-5 md:px-8 pb-6 relative">
                  {/* Big Floating Avatar */}
                  <div className="absolute -top-12 left-5 md:left-8 w-24 h-24 rounded-full bg-brand-surface border-4 border-brand-bg flex items-center justify-center text-brand-accent text-3xl font-bold shadow-2xl overflow-hidden">
                    {profilePic ? (
                      <img src={profilePic} alt={currentUser} className="w-full h-full object-cover" />
                    ) : (
                      currentUser.charAt(0)
                    )}
                  </div>

                  <div className="pt-14 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-xl font-bold text-brand-text-primary leading-none">{currentUser}</h3>
                        <button 
                          onClick={handleStartEditing}
                          className="px-2.5 py-1 bg-[#2A2D3A] hover:bg-[#343949] border border-brand-border rounded-lg text-[9px] font-bold text-[#21D4B5] uppercase tracking-wider flex items-center gap-1 transition-colors"
                        >
                          <Sparkles className="w-3 h-3 text-[#21D4B5]" /> Customize Profile
                        </button>
                      </div>
                      <p className="text-xs text-brand-accent font-semibold flex items-center gap-1 mt-0.5">
                        <Sparkles className="w-3 h-3 text-brand-accent" /> Premium Community Motivator
                      </p>
                      
                      {/* Athlete focus goals & active target tags */}
                      <div className="flex flex-wrap gap-2 pt-1.5">
                        <span className="text-[10px] bg-teal-500/10 text-teal-300 border border-teal-500/15 rounded-md px-2 py-0.5 font-mono uppercase font-bold">
                          Goal: {fitnessGoals}
                        </span>
                        <span className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/15 rounded-md px-2 py-0.5 font-mono uppercase font-bold">
                          Target: {weeklyTarget}
                        </span>
                      </div>
                    </div>

                    {/* Following counters */}
                    <div className="flex gap-4 border-t border-brand-border md:border-t-0 pt-4 md:pt-0">
                      <div className="text-center bg-[#181a22] px-4 py-2 rounded-lg border border-brand-border min-w-[70px] shadow-sm">
                        <p className="text-base font-bold text-brand-text-primary font-mono">{followersCount}</p>
                        <p className="text-[10px] text-brand-text-secondary uppercase">Followers</p>
                      </div>
                      <div className="text-center bg-[#181a22] px-4 py-2 rounded-lg border border-brand-border min-w-[70px] shadow-sm">
                        <p className="text-base font-bold text-brand-text-primary font-mono">{followingCount}</p>
                        <p className="text-[10px] text-brand-text-secondary uppercase">Following</p>
                      </div>
                      <div className="text-center bg-[#181a22] px-4 py-2 rounded-lg border border-[#21D4B5]/30 min-w-[70px] shadow-sm">
                        <p className="text-base font-bold text-[#21D4B5] font-mono">{currentUserFeed.length}</p>
                        <p className="text-[10px] text-brand-text-secondary uppercase">Workout Shared</p>
                      </div>
                    </div>
                  </div>

                  {/* Bio text displays nicely */}
                  <div className="mt-5 p-3.5 rounded-xl bg-[#181a22] border border-brand-border shadow-inner">
                    <label className="block text-[10px] text-brand-text-secondary uppercase tracking-widest font-mono font-bold mb-1">
                      Athlete Bio Status
                    </label>
                    <p className="text-xs text-brand-text-primary font-medium leading-relaxed italic">
                      "{athleteBio}"
                    </p>
                  </div>

                  {/* Level Progress Gauge Bar */}
                  <div className="mt-5 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-brand-text-secondary">Community Engagement Ranking</span>
                      <span className="text-brand-accent font-mono font-bold">{motivationXP} / 1000 XP</span>
                    </div>
                    <div className="w-full bg-[#1c1e26] h-2.5 rounded-full overflow-hidden border border-brand-border p-0.5 shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-teal-400 to-[#21D4B5] h-full rounded-full transition-all duration-500"
                        style={{ width: `${(motivationXP / 1000) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-brand-text-secondary">
                      Earn XP by liking, commenting, and publishing workout cards with photos to drive public engagement.
                    </p>
                  </div>
                  
                  {/* Badges System */}
                  <div className="mt-6 border-t border-brand-border pt-5">
                    <h4 className="text-[10px] text-brand-text-secondary uppercase tracking-widest font-bold mb-3 font-mono">Unlocked Achievements</h4>
                    <div className="flex flex-wrap gap-3">
                      <div className="w-14 h-14 rounded-full bg-[#2A2D3A] flex flex-col items-center justify-center border-2 border-[#21D4B5] shadow-[0_0_10px_rgba(33,212,181,0.3)] text-center" title="First Steps: Complete initial setup">
                         <Award className="w-5 h-5 text-[#21D4B5] mb-0.5" />
                         <span className="text-[8px] font-bold text-white uppercase font-mono">Setup</span>
                      </div>
                      
                      <div className={cn(
                        "w-14 h-14 rounded-full flex flex-col items-center justify-center border-2 text-center transition-all",
                        currentUserFeed.length >= 1 ? "bg-[#2A2D3A] border-[#FFB300] shadow-[0_0_10px_rgba(255,179,0,0.25)]" : "bg-[#181a22] border-[#333] opacity-40 grayscale"
                      )} title="First Workout: Post 1 activity">
                         <Flame className={cn("w-5 h-5 mb-0.5", currentUserFeed.length >= 1 ? "text-[#FFB300]" : "text-gray-500")} />
                         <span className={cn("text-[8px] font-bold uppercase font-mono", currentUserFeed.length >= 1 ? "text-white" : "text-gray-500")}>1st Win</span>
                      </div>

                      <div className={cn(
                        "w-14 h-14 rounded-full flex flex-col items-center justify-center border-2 text-center transition-all",
                        currentUserFeed.length >= 5 ? "bg-[#2A2D3A] border-[#814FFF] shadow-[0_0_10px_rgba(129,79,255,0.25)]" : "bg-[#181a22] border-[#333] opacity-40 grayscale"
                      )} title="5 Workouts: Shared 5 public activities">
                         <ActivityIcon className={cn("w-5 h-5 mb-0.5", currentUserFeed.length >= 5 ? "text-[#C08CFF]" : "text-gray-500")} />
                         <span className={cn("text-[8px] font-bold uppercase font-mono", currentUserFeed.length >= 5 ? "text-white" : "text-gray-500")}>5 Posts</span>
                      </div>
                      
                      <div className={cn(
                        "w-14 h-14 rounded-full flex flex-col items-center justify-center border-2 text-center transition-all",
                        motivationLevel >= 2 ? "bg-[#2A2D3A] border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.25)]" : "bg-[#181a22] border-[#333] opacity-40 grayscale"
                      )} title="Level 2: Reached Motivation Level 2">
                         <Star className={cn("w-5 h-5 mb-0.5", motivationLevel >= 2 ? "text-blue-400" : "text-gray-500")} />
                         <span className={cn("text-[8px] font-bold uppercase font-mono", motivationLevel >= 2 ? "text-white" : "text-gray-500")}>Lvl 2</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Workout History Album / Page Feed */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-brand-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-blue-400" /> My Personal Training Photo Feed
              </h4>

              {currentUserFeed.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatePresence>
                  {currentUserFeed.map(item => (
                    <motion.div 
                      key={item.id} 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden flex flex-col"
                    >
                      <div className="aspect-video relative overflow-hidden bg-black">
                        <img src={item.imageUri} alt={item.activity} className="w-full h-full object-cover" />
                        <div className="absolute top-2 right-2 bg-brand-bg/85 font-mono text-[9px] text-brand-accent px-2 py-0.5 rounded font-bold border border-brand-border">
                          {item.activity}
                        </div>
                        <div className="absolute bottom-2 left-2 bg-[#21D4B5] text-[#13151a] font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                          {item.metrics}
                        </div>
                      </div>
                      <div className="p-3.5 flex-1 flex flex-col justify-between">
                        <p className="text-xs text-brand-text-primary italic line-clamp-2">
                          "{item.caption}"
                        </p>
                        <div className="mt-3 pt-2.5 border-t border-brand-border flex items-center justify-between text-[11px] text-brand-text-secondary font-mono">
                          <span>❤️ {item.likes} Likes</span>
                          <span>💬 {(item.comments || []).length} Replies</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="bg-brand-surface border border-brand-border rounded-xl p-8 text-center flex flex-col items-center justify-center">
                  <PlusCircle className="w-8 h-8 text-brand-text-secondary mb-2 opacity-50" />
                  <h4 className="text-sm font-bold text-brand-text-primary mb-1">Your Story is Empty</h4>
                  <p className="text-xs text-brand-text-secondary max-w-xs mb-4">
                    Share your daily effort with an inspirational picture is the absolute best way to motivate others.
                  </p>
                  <button 
                    onClick={() => {
                      setActiveTab("feed");
                      setShowSharePanel(true);
                    }}
                    className="bg-brand-accent text-[#13151a] hover:bg-[#1bc1a4] font-bold text-xs px-4 py-2 rounded transition-colors"
                  >
                    Post First Workout Photo Now
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PROGRESS GALLERY TAB (MIGRATED TO PROFILE VIEW) */}
        {false && activeTab === "progress" && (
          <div className="space-y-6 pb-6 animate-in fade-in duration-300">
            <div className="bg-brand-surface border border-brand-border rounded-[20px] p-6 shadow-xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-brand-text-primary flex items-center gap-2">
                    <Camera className="w-5 h-5 text-purple-400" /> Progress Timeline
                  </h3>
                  <p className="text-xs text-brand-text-secondary mt-1 max-w-sm">
                    Snap a quick selfie after your workout to visually track your body transformation.
                  </p>
                </div>
                <button
                  onClick={() => setIsCameraOpen(!isCameraOpen)}
                  className="bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs px-4 py-2.5 rounded-md flex items-center gap-2 transition-all shadow-md shrink-0 w-full justify-center md:w-auto"
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
                <div className="mb-8 border border-purple-500/30 rounded-xl p-4 bg-[#181a22] animate-in slide-in-from-top-4">
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
                       <label className="text-[10px] text-brand-text-secondary uppercase tracking-widest font-bold mb-1 block">
                          Current Weight (optional)
                       </label>
                       <input 
                         type="text" 
                         value={photoWeight}
                         onChange={e => setPhotoWeight(e.target.value)}
                         placeholder="e.g. 75.5 kg"
                         className="w-full bg-[#13151a] border border-brand-border rounded py-2 px-3 text-xs text-brand-text-primary focus:outline-none focus:border-purple-500"
                       />
                     </div>
                     <button
                        onClick={capturePhoto}
                        className="bg-brand-accent hover:bg-[#1bc1a4] text-[#13151a] font-bold text-sm px-6 py-2 rounded self-end sm:self-end h-[38px] flex items-center justify-center min-w-[120px]"
                     >
                       Capture
                     </button>
                   </div>
                </div>
              )}

              <div className="relative">
                 {/* Timeline Line */}
                 {progressPhotos.length > 0 && (
                   <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-brand-border hidden md:block z-0"></div>
                 )}

                 <div className="space-y-8 relative z-10">
                   {progressPhotos.length > 0 ? (
                     progressPhotos.map((photo, index) => (
                       <div key={photo.id} className="flex flex-col md:flex-row gap-4 md:gap-8 relative animate-in fade-in duration-500 group">
                         {/* Timeline Dot */}
                         <div className="hidden md:flex shrink-0 w-12 items-center justify-center">
                           <div className="w-4 h-4 rounded-full bg-purple-500 border-4 border-[#1c1e26] shadow-[0_0_10px_rgba(168,85,247,0.4)] group-hover:scale-125 transition-transform z-10"></div>
                         </div>
                         
                         <div className="flex-1 bg-[#181a22] border border-brand-border rounded-xl p-4 md:p-5 flex flex-col sm:flex-row gap-5 hover:border-purple-500/30 transition-colors">
                           <div className="w-full sm:w-48 aspect-[3/4] shrink-0 rounded-lg overflow-hidden border border-brand-border relative">
                              <img src={photo.uri} alt="Progress" className="w-full h-full object-cover" />
                           </div>
                           <div className="flex flex-col justify-center">
                             <h4 className="text-base font-bold text-brand-text-primary mb-1">
                                {new Date(photo.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                             </h4>
                             <p className="text-xs text-brand-text-secondary font-mono mb-4">
                                {new Date(photo.date).toLocaleTimeString()}
                             </p>
                             
                             {photo.weight && (
                               <div className="inline-flex self-start items-center gap-1.5 bg-purple-500/10 text-purple-400 px-3 py-1.5 rounded border border-purple-500/20 font-bold font-mono text-sm">
                                 <TrendingUp className="w-4 h-4" /> {photo.weight}
                               </div>
                             )}
                             
                             {index === progressPhotos.length - 1 && index !== 0 && (
                               <div className="mt-4 pt-4 border-t border-brand-border">
                                 <p className="text-xs text-brand-text-secondary">
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
                        <ImageIcon className="w-12 h-12 text-brand-text-secondary opacity-30 mx-auto mb-3" />
                        <h4 className="text-brand-text-primary font-bold text-sm mb-1">No Progress Photos Yet</h4>
                        <p className="text-xs text-brand-text-secondary max-w-sm mx-auto">
                          Start tracking your transformation by snapping your first post-workout selfie!
                        </p>
                     </div>
                   )}
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* ARCHIVED Tab content: MY GROUPS */}
        {activeTab === "groups" && (
          <div className="space-y-4">
            <button className="w-full bg-[#1e1e1e] border-2 border-dashed border-brand-border hover:border-brand-accent/30 text-brand-text-primary py-4 rounded-md flex flex-col items-center justify-center gap-2 transition-colors group">
              <Plus className="w-6 h-6 text-brand-accent group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold">Create New Group</span>
            </button>

            <div 
              onClick={() => setActiveTab("chat")}
              className="bg-brand-surface border border-brand-border rounded-md p-4 flex items-center justify-between cursor-pointer hover:bg-brand-surface-light transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-md border border-purple-500/20 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-brand-text-primary text-sm group-hover:text-brand-accent transition-colors">City Runners FC</h3>
                  <p className="text-[11px] text-brand-text-secondary">Alex: "Who's up for 5k tomorrow?"</p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                <span className="text-[10px] text-brand-text-secondary">2m ago</span>
                <span className="bg-brand-accent text-[#1e1e1e] text-[10px] font-bold px-1.5 py-0.5 rounded-full w-4 h-4 flex items-center justify-center leading-none">3</span>
              </div>
            </div>

            <div className="bg-brand-surface border border-brand-border rounded-md p-4 flex items-center justify-between opacity-60">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-md border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Dumbbell className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-brand-text-primary text-sm">Heavy Lifters</h3>
                  <p className="text-[11px] text-brand-text-secondary">No new messages</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUGGESTED LOCAL GROUPS & MAP */}
        {activeTab === "nearby" && (
          <div className="space-y-4">
             <div className="w-full h-48 bg-brand-surface border border-brand-border rounded-md relative overflow-hidden flex items-center justify-center shadow-inner group mb-6">
                <div className="absolute inset-0 bg-[#0a0a0a]" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '16px 16px', opacity: 0.5 }}></div>
                <div className="absolute top-1/2 left-1/4 w-3 h-3 bg-brand-accent rounded-full animate-ping"></div>
                <div className="absolute top-1/3 left-1/2 w-3 h-3 bg-purple-500 rounded-full animate-pulse shadow-[0_0_15px_#a855f7]"></div>
                <div className="absolute bottom-1/4 right-1/3 w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-[0_0_15px_#3b82f6]"></div>
                
                <div className="relative z-10 bg-[#1e1e1e]/80 border border-[rgba(255,255,255,0.1)] px-4 py-2 rounded-md backdrop-blur-sm text-[12px] font-semibold flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-brand-accent" /> Finding groups near you...
                </div>
             </div>

             <h3 className="text-sm font-semibold text-brand-text-primary uppercase tracking-wider">Suggested Local Groups</h3>

             <div className="grid gap-3">
               <div className="bg-brand-surface border border-brand-border rounded-md p-4 flex items-center justify-between hover:bg-brand-surface-light transition-colors relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-8 h-8 rounded-bl-full bg-brand-accent/20 flex items-end justify-start p-1.5 pointer-events-none">
                   <MapPin className="w-3 h-3 text-brand-accent" />
                 </div>
                 <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-md flex items-center justify-center shrink-0">
                     <Users className="w-5 h-5" />
                   </div>
                   <div>
                     <h3 className="font-semibold text-brand-text-primary text-[13px]">Central Park Morning Squad</h3>
                     <p className="text-[11px] text-brand-text-secondary">2.5km away • 42 Members</p>
                   </div>
                 </div>
                 <button className="text-[11px] bg-[#333] hover:bg-brand-accent hover:text-[#1e1e1e] text-brand-text-primary font-semibold px-3 py-1.5 rounded transition-colors border border-brand-border">
                   Join
                 </button>
               </div>
               <div className="bg-brand-surface border border-brand-border rounded-md p-4 flex items-center justify-between hover:bg-brand-surface-light transition-colors relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-8 h-8 rounded-bl-full bg-brand-accent/20 flex items-end justify-start p-1.5 pointer-events-none">
                   <MapPin className="w-3 h-3 text-brand-accent" />
                 </div>
                 <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-orange-500/10 text-orange-400 rounded-md flex items-center justify-center shrink-0">
                     <Users className="w-5 h-5" />
                   </div>
                   <div>
                     <h3 className="font-semibold text-brand-text-primary text-[13px]">Downtown Crossfitters</h3>
                     <p className="text-[11px] text-brand-text-secondary">1.2km away • 18 Members</p>
                   </div>
                 </div>
                 <button className="text-[11px] bg-[#333] hover:bg-brand-accent hover:text-[#1e1e1e] text-brand-text-primary font-semibold px-3 py-1.5 rounded transition-colors border border-brand-border">
                   Join
                 </button>
               </div>
             </div>
          </div>
        )}

        {/* SINGLE GROUP LIVE CHAT VIEW */}
        {activeTab === "chat" && (
          <div className="bg-brand-surface border border-brand-border rounded-md flex flex-col h-[520px] overflow-hidden">
            <div className="p-3 border-b border-brand-border flex items-center gap-3 shrink-0 bg-brand-surface-light">
              <button 
                onClick={() => setActiveTab("groups")}
                className="text-brand-text-secondary hover:text-brand-text-primary font-bold text-sm px-2 py-0.5 rounded"
              >
                ←
              </button>
              <h3 className="font-bold text-[13px] text-brand-text-primary">City Runners FC</h3>
              <Users className="w-4 h-4 text-brand-text-secondary ml-auto" />
            </div>

            <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
              {messages.map((msg, index) => {
                const isMe = msg.user === currentUser;
                const showAvatar = index === 0 || messages[index - 1].user !== msg.user;
                const readByOthers = msg.readBy.filter(u => u !== msg.user).length > 0;
                const isSOS = msg.text.includes("EMERGENCY SOS");
                
                return (
                  <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                    {!isMe && showAvatar && <span className="text-[11px] text-brand-text-secondary ml-8 mb-1">{msg.user}</span>}
                    <div className={cn("flex", isMe ? "flex-row-reverse" : "flex-row", "items-end gap-2 max-w-[80%]")}>
                      {!isMe && (
                        <div className="w-6 h-6 rounded bg-brand-surface-light border border-brand-border flex items-center justify-center font-bold text-[10px] flex-shrink-0 text-brand-text-secondary">
                          {showAvatar ? msg.user.charAt(0) : ""}
                        </div>
                      )}
                      <div className={cn(
                        "p-2.5 px-3 rounded-md",
                        isSOS ? "bg-red-600/20 text-red-500 border border-red-500/50 shadow-[0_0_15px_rgba(220,38,38,0.2)] animate-pulse rounded-bl-sm"
                        : isMe ? "bg-[#e5e5e5] text-[#1e1e1e] rounded-br-sm" 
                        : "bg-brand-surface-light border border-brand-border text-brand-text-primary rounded-bl-sm"
                      )}>
                        <p className={cn("text-[13px]", isSOS && "font-bold")}>{msg.text}</p>
                        {msg.imageUri && (
                          <div className="mt-2 rounded overflow-hidden">
                             <img src={msg.imageUri} alt="Shared" className="max-w-[200px] h-auto object-cover" />
                          </div>
                        )}
                        {msg.location && (
                          <div className={cn(
                            "mt-2 flex flex-col items-center justify-center text-center p-2 rounded w-full",
                            isMe ? "bg-black/10 border border-black/10 text-[#1e1e1e]" : "bg-[#111] border border-[#333] text-brand-accent"
                          )}>
                             <a href={`https://www.openstreetmap.org/?mlat=${msg.location.lat}&mlon=${msg.location.lng}#map=16/${msg.location.lat}/${msg.location.lng}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] font-semibold hover:opacity-80">
                               <MapPin className="w-3 h-3" /> View Map
                             </a>
                          </div>
                        )}
                      </div>
                    </div>
                    {isMe && (
                      <div className="flex items-center gap-1 mt-1 mr-1">
                        <span className="text-[10px] text-brand-text-secondary">{formatDistanceToNow(new Date(msg.time))}</span>
                        {readByOthers ? (
                           <CheckCheck className="w-3 h-3 text-brand-accent" />
                        ) : (
                           <Check className="w-3 h-3 text-brand-text-secondary" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="p-3 border-t border-brand-border bg-[#1a1a24] relative shrink-0">
               {_typingUsersArr.length > 0 && (
                 <div className="absolute -top-7 left-3 text-[11px] text-brand-accent flex items-center gap-1 font-medium bg-[#1e1e1e] px-2 py-0.5 rounded shadow-sm border border-brand-border">
                   <div className="flex space-x-1">
                     <div className="w-1 h-1 bg-brand-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                     <div className="w-1 h-1 bg-brand-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                     <div className="w-1 h-1 bg-brand-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                   </div>
                   <span>{_typingUsersArr.join(", ")} is typing...</span>
                 </div>
               )}
              <form onSubmit={sendMessage} className="flex gap-2 h-9">
                <button
                  type="button"
                  onClick={shareLocation}
                  className="bg-brand-surface-light border border-brand-border text-brand-accent w-9 rounded flex items-center justify-center transition-colors hover:bg-brand-border shrink-0"
                  title="Share Location"
                >
                  <MapPin className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={sharePhotoInChat}
                  className="bg-brand-surface-light border border-brand-border text-brand-accent w-9 rounded flex items-center justify-center transition-colors hover:bg-brand-border shrink-0"
                  title="Share Photo"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={inputText}
                  onChange={handleTyping}
                  placeholder="Message group..."
                  className="flex-1 bg-[#111] border border-brand-border rounded px-3 text-[13px] text-brand-text-primary focus:outline-none focus:border-brand-accent/50 transition-colors placeholder-[#666]"
                />
                <button 
                  type="submit"
                  disabled={!inputText.trim()}
                  className="bg-brand-accent disabled:opacity-50 text-[#1e1e1e] w-9 rounded flex items-center justify-center transition-colors hover:bg-[#b0d800]"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
