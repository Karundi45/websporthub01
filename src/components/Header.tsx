import { useState, useEffect, useRef } from "react";
import { ShieldAlert, Bell, User, X, Check, Dumbbell, Footprints, Target, Settings, FileText, LogOut, ChevronRight, Sun, Moon } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "gym" | "steps" | "alert";
  title: string;
  message: string;
  read: boolean;
  time: string;
}

export function Header() {
  const [sosStatus, setSosStatus] = useState<"idle" | "sending" | "active">("idle");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isDaytime, setIsDaytime] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (isDaytime) {
      document.body.classList.add('daytime');
    } else {
      document.body.classList.remove('daytime');
    }
  }, [isDaytime]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    socketRef.current = io({
      auth: { token }
    });

    socketRef.current.on('sos_contacts_notified', () => {
      setSosStatus("active");
      setTimeout(() => {
        setSosStatus("idle");
      }, 10000);
    });
    
    const timers = [
      setTimeout(() => {
        setNotifications(prev => [{
          id: "n1",
          type: "steps",
          title: "Daily Step Goal",
          message: "You're 2,500 steps away from your daily goal! A short evening walk will get you there.",
          read: false,
          time: "Just now"
        }, ...prev]);
      }, 3000),
      setTimeout(() => {
        setNotifications(prev => [{
          id: "n2",
          type: "gym",
          title: "Gym Check-in Pattern",
          message: "You usually hit the gym around 6 PM on Wednesdays. Want to load your Leg Day plan?",
          read: false,
          time: "5 min ago"
        }, ...prev]);
      }, 8000)
    ];

    return () => {
      socketRef.current?.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  const triggerSOS = () => {
    if (sosStatus !== "idle") return;
    
    setSosStatus("sending");
    
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          socketRef.current?.emit("sos_alert", {
            user: "Guest User",
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          });
        },
        (error) => {
          console.error("SOS Location error:", error);
          socketRef.current?.emit("sos_alert", {
            user: "Guest User",
            location: { lat: 0, lng: 0 }
          });
        }
      );
    } else {
      socketRef.current?.emit("sos_alert", {
        user: "Guest User",
        location: { lat: 0, lng: 0 }
      });
    }
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({...n, read: true})));
  };
  
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <header className="h-14 bg-[#1A1C23] border-b border-[#2A2D3A] flex items-center justify-between px-4 shrink-0 z-40 sticky top-0">
        <div className="flex-1 md:hidden">
           <h1 className="text-[13px] font-bold tracking-tight text-[#FFFFFF] flex items-center gap-1">
             <Target className="w-4 h-4 text-[#21D4B5]" />
             SPORTHUB
           </h1>
        </div>
        
        <div className="hidden md:flex flex-1">
        </div>

        <div className="flex items-center gap-4 relative">
          <button
            onClick={() => setIsDaytime(!isDaytime)}
            className="w-7 h-7 rounded-md flex items-center justify-center transition-colors text-[#8E92A4] hover:text-[#FFFFFF] hover:bg-[#2A2D3A]"
            title={isDaytime ? "Switch to Dark Mode" : "Switch to Daytime Mode"}
          >
            {isDaytime ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          
          <button 
            onClick={triggerSOS}
            disabled={sosStatus !== "idle"}
            className={cn(
              "px-3 py-1.5 md:px-3 md:py-1.5 rounded-md font-medium text-[11px] md:text-[12px] tracking-wide flex items-center gap-1.5 transition-colors border",
              sosStatus === "idle" ? "bg-[#3a1a1a] hover:bg-[#4a1a1a] text-[#ff6b6b] border-[#5a1a1a]" : "",
              sosStatus === "sending" ? "bg-[#ff6b6b] text-white border-[#ff6b6b] cursor-wait animate-pulse" : "",
              sosStatus === "active" ? "bg-[#ff4b4b] text-white border-[#ff4b4b] shadow-[0_0_15px_rgba(255,107,107,0.5)]" : ""
            )}
          >
            <ShieldAlert className={cn("w-3 h-3 md:w-3.5 md:h-3.5", sosStatus === "sending" && "animate-ping")} /> 
            <span className="hidden sm:inline">
              {sosStatus === "idle" ? "SOS" : sosStatus === "sending" ? "SENDING..." : "NOTIFIED"}
            </span>
            <span className="sm:hidden">
              SOS
            </span>
          </button>
          
          <div className="relative">
            <button 
              onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false); }}
              className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center transition-colors relative",
                showNotifications ? "bg-[#2A2D3A] text-[#21D4B5]" : "text-[#8E92A4] hover:text-[#FFFFFF] hover:bg-[#2A2D3A]"
              )}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#21D4B5] rounded-full border border-[#1A1C23] animate-pulse"></span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full right-0 mt-4 w-80 sm:w-96 bg-brand-surface border border-brand-border rounded-[24px] shadow-2xl overflow-hidden z-50 flex flex-col max-h-[80vh]"
                >
                  <div className="p-4 border-b border-brand-border flex items-center justify-between shrink-0 bg-brand-surface-light">
                    <h3 className="font-bold text-brand-text-primary">Notifications</h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllRead}
                        className="text-xs text-brand-accent hover:underline flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Mark all read
                      </button>
                    )}
                  </div>
                  
                  <div className="overflow-y-auto flex-1 p-2 space-y-2">
                    <AnimatePresence>
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-brand-text-secondary flex flex-col items-center justify-center h-full">
                           <Bell className="w-8 h-8 mb-4 opacity-20" />
                           <p className="text-sm">You are all caught up!</p>
                        </div>
                      ) : (
                        notifications.map(note => (
                          <motion.div 
                            key={note.id}
                            layout
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className={cn(
                              "p-4 rounded-[16px] border flex gap-3 group relative transition-colors",
                              !note.read ? "bg-brand-surface-light border-brand-accent/30" : "bg-transparent border-transparent hover:bg-brand-surface-light hover:border-brand-border"
                            )}
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0",
                              note.type === "steps" ? "bg-blue-500/10 text-blue-400" :
                              note.type === "gym" ? "bg-orange-500/10 text-orange-400" : "bg-brand-accent-dim text-brand-accent"
                            )}>
                              {note.type === "steps" ? <Footprints className="w-5 h-5" /> :
                               note.type === "gym" ? <Dumbbell className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                            </div>
                            <div className="flex-1 pr-6">
                               <div className="flex items-center justify-between mb-1">
                                 <h4 className={cn("text-sm font-bold", !note.read ? "text-brand-text-primary" : "text-brand-text-secondary")}>{note.title}</h4>
                                 <span className="text-[10px] text-brand-text-secondary">{note.time}</span>
                               </div>
                               <p className="text-xs text-brand-text-secondary leading-relaxed">{note.message}</p>
                            </div>
                            <button 
                              onClick={() => removeNotification(note.id)}
                              className="absolute top-4 right-4 text-brand-text-secondary opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}
              className="w-10 h-10 rounded-full bg-brand-surface-light border border-brand-border flex items-center justify-center text-brand-text-primary transition-colors hover:border-brand-accent/50 overflow-hidden"
            >
              <User className="w-5 h-5 opacity-50" />
            </button>

            <AnimatePresence>
              {showProfileMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full right-0 mt-4 w-64 bg-brand-surface border border-brand-border rounded-[16px] shadow-2xl overflow-hidden z-50 flex flex-col"
                >
                  <div className="p-4 border-b border-brand-border shrink-0 bg-brand-surface-light flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#111] rounded-full flex items-center justify-center font-bold text-lg border border-brand-border">
                      G
                    </div>
                    <div>
                      <h3 className="font-bold text-brand-text-primary">Guest User</h3>
                      <p className="text-[11px] text-brand-text-secondary">Free Plan</p>
                    </div>
                  </div>
                  
                  <div className="p-2 flex flex-col">
                    <button className="flex items-center gap-3 p-3 rounded-md hover:bg-brand-surface-light hover:text-brand-accent transition-colors text-brand-text-secondary text-sm group">
                      <Settings className="w-4 h-4 group-hover:text-brand-accent" />
                      <span className="flex-1 text-left font-medium">Profile & Settings</span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                    </button>
                    <button className="flex items-center gap-3 p-3 rounded-md hover:bg-brand-surface-light transition-colors text-brand-text-secondary text-sm group">
                      <FileText className="w-4 h-4 group-hover:text-brand-text-primary" />
                      <span className="flex-1 text-left font-medium group-hover:text-brand-text-primary">Terms & Conditions</span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                    </button>
                    <div className="h-px w-full bg-brand-border my-2 px-4"></div>
                    <button className="flex items-center gap-3 p-3 rounded-md hover:bg-red-500/10 hover:text-red-500 transition-colors text-brand-text-secondary text-sm group">
                      <LogOut className="w-4 h-4 group-hover:text-red-500" />
                      <span className="flex-1 text-left font-medium group-hover:text-red-500">Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {sosStatus === "active" && (
        <div className="fixed top-20 right-4 sm:right-8 bg-brand-surface border border-red-500/50 rounded-[16px] p-4 shadow-2xl z-[100] animate-in fade-in slide-in-from-top-4 flex flex-col max-w-sm w-full">
          <div className="flex items-start gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center shrink-0">
               <ShieldAlert className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="font-bold text-red-500 mt-0.5">Emergency Alert Active</h3>
              <p className="text-xs text-brand-text-secondary mt-1">
                Your location has been shared. Emergency contacts (Sarah, Dad) have been notified. Avoid unnecessary movement if injured.
              </p>
            </div>
          </div>
          <button 
             onClick={() => setSosStatus("idle")}
             className="w-full mt-3 bg-brand-surface-light border border-brand-border py-2 text-xs font-bold text-brand-text-primary rounded-[8px] hover:bg-[#333]"
          >
            DISMISS
          </button>
        </div>
      )}
    </>
  );
}
