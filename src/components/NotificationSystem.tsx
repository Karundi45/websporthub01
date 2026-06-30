import React, { useState, useEffect } from 'react';
import { Bell, X, Calendar, Activity, CheckCircle2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '@/lib/api';

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
  const [pushPermission, setPushPermission] = useState(Notification.permission);

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
        const registration = await navigator.serviceWorker.ready;
        const response = await fetch('/api/notifications/vapid-public-key');
        const vapidPublicKey = await response.text();
        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
        
        await api.post('/notifications/subscribe', subscription);
        
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
    // Check if user has notifications enabled
    const profileDataStr = localStorage.getItem('social_profile_data');
    let notificationsEnabled = true;
    if (profileDataStr) {
      try {
        const data = JSON.parse(profileDataStr);
        notificationsEnabled = data.notifications !== false;
      } catch (e) {}
    }

    if (!notificationsEnabled) return;

    // Simulate scheduling a notification for an upcoming workout based on weekly goals
    // We'll show one shortly after the app loads to demonstrate the feature
    const timers: ReturnType<typeof setTimeout>[] = [];

    const sendEmailNotification = async (title: string, message: string) => {
      try {
        await fetch('/api/notifications/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: 'karundi2004@gmail.com', // Using user email provided in context
            subject: title,
            html: `<p><strong>${title}</strong></p><p>${message}</p>`,
          }),
        });
      } catch (e) {
        console.error('Failed to send email:', e);
      }
    };

    // Notification 1: Upcoming scheduled workout
    timers.push(setTimeout(() => {
      const title = "Upcoming Workout Reminder";
      const message = "You have an 'Intervals' session scheduled in 15 minutes! Ready to crush it?";
      
      const newNotification = {
        id: Date.now() + 1,
        title,
        message,
        icon: <Calendar className="w-5 h-5 text-[#32ADE6]" />,
        time: "Just now",
        action: "Start Workout"
      };
      setNotifications(prev => [newNotification, ...prev]);
      sendEmailNotification(title, message);
    }, 6000));

    // Notification 2: Goal progress update
    timers.push(setTimeout(() => {
      const title = "Weekly Goal Update";
      const message = "You've completed 5 out of 6 workouts this week. Just one more to hit your target!";
      
      const newNotification = {
        id: Date.now() + 2,
        title,
        message,
        icon: <Activity className="w-5 h-5 text-[#21D4B5]" />,
        time: "Just now"
      };
      setNotifications(prev => [newNotification, ...prev]);
      sendEmailNotification(title, message);
    }, 18000)); // Show 12 seconds after the first one

    return () => timers.forEach(clearTimeout);
  }, []);

  const dismissNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleAction = (id: number) => {
    dismissNotification(id);
    // In a real app, this would navigate to the workout screen
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
