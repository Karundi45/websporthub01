import React, { useState, useEffect } from 'react';
import { Bell, X, Calendar, Activity, CheckCircle2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';

// Utility to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationSystem() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
    }
  }, []);

  const subscribeToPush = async () => {
    if (!pushSupported) return;
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        
        // Mock VAPID key for frontend demo purposes since we don't have real keys loaded yet
        // In a real app, you fetch the public VAPID key from your server/edge function
        const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLcg05SR1XjM';
        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('User').update({ pushSubscription: JSON.parse(JSON.stringify(subscription)) }).eq('id', user.id);
        }
        
        // Show success notification
        setNotifications(prev => [{
          id: Date.now(),
          title: 'Push Enabled',
          message: 'You will now receive workout reminders via push notifications!',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
          time: 'Just now'
        }, ...prev]);
      }
    } catch (e) {
      console.error('Failed to subscribe to push:', e);
    }
  };

  useEffect(() => {
    // Listen to new activities from others
    const activitySub = supabase.channel('public:Activity:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Activity' }, (payload) => {
        const title = "New Activity!";
        const message = `A new workout was just posted.`;
        
        const newNotification = {
          id: Date.now(),
          title,
          message,
          icon: <Activity className="w-5 h-5 text-[#21D4B5]" />,
          time: "Just now"
        };
        setNotifications(prev => [newNotification, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(activitySub);
    };
  }, []);

  const dismissNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleAction = (id: number) => {
    dismissNotification(id);
  };

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-80 pointer-events-none">
      <AnimatePresence>
        {notifications.map(notification => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className="bg-[#22252E] border border-[#2A2D3A] rounded-2xl p-4 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] pointer-events-auto"
          >
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1A1C23] border border-[#2A2D3A] flex items-center justify-center shrink-0">
                {notification.icon || <Bell className="w-5 h-5 text-white" />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-white font-bold text-sm leading-tight pr-4">{notification.title}</h4>
                  <button 
                    onClick={() => dismissNotification(notification.id)}
                    className="text-[#8E92A4] hover:text-white transition-colors absolute top-4 right-4"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[#8E92A4] text-xs mb-2 leading-relaxed">{notification.message}</p>
                
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[#8E92A4] text-[10px] font-medium">{notification.time}</span>
                  {notification.action && (
                    <button 
                      onClick={() => handleAction(notification.id)}
                      className="text-xs font-bold text-[#1A1C23] bg-[#21D4B5] px-3 py-1 rounded-full hover:bg-[#1bb89c] transition-colors flex items-center gap-1"
                    >
                      {notification.action}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {pushSupported && pushPermission === 'default' && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="bg-brand-surface border border-brand-accent/50 rounded-2xl p-4 shadow-[0_10px_40px_-10px_rgba(33,212,181,0.2)] pointer-events-auto mt-4"
          >
            <div className="flex gap-3 items-start">
              <div className="w-10 h-10 rounded-full bg-brand-accent/10 border border-brand-accent/30 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-brand-accent" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold text-sm leading-tight mb-1">Stay on Track!</h4>
                <p className="text-brand-text-secondary text-xs mb-3">Enable push notifications so we can remind you about your scheduled workouts.</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setPushPermission('denied')}
                    className="text-xs font-medium text-brand-text-secondary hover:text-white px-2 py-1"
                  >
                    Not now
                  </button>
                  <button 
                    onClick={subscribeToPush}
                    className="text-xs font-bold text-[#1e1e1e] bg-brand-accent px-4 py-1.5 rounded-full hover:bg-[#b0d800] transition-colors"
                  >
                    Enable
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
