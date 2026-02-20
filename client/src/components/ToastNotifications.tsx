import { useEffect, useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { socketManager } from '@/lib/socket';
import { useToast } from '@/hooks/use-toast';
import { Bell, AlertTriangle } from 'lucide-react';
import { NotificationManager } from '@/utils/notifications';
import { AudioPermissionBanner } from './AudioPermissionBanner';

export function ToastNotifications() {
  const { user, isAuthenticated } = useAuthContext();
  const { toast } = useToast();
  const [showAudioBanner, setShowAudioBanner] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Request notification permissions when component mounts
    NotificationManager.requestPermission();
    
    // Try to restore audio preference on first user interaction
    const audioWasPreviouslyEnabled = localStorage.getItem('memocare_audio_enabled') === 'true';
    if (audioWasPreviouslyEnabled && !NotificationManager.isAudioEnabled()) {
      // Set up one-time listener to restore audio on first interaction
      const restoreAudioOnInteraction = async () => {
        const restored = await NotificationManager.enableAudioWithUserGesture();
        if (restored) {
          console.log('Audio restored from previous session');
        }
        // Remove listener after first attempt
        document.removeEventListener('click', restoreAudioOnInteraction, { capture: true });
        document.removeEventListener('touchstart', restoreAudioOnInteraction, { capture: true });
      };
      
      // Add listeners for first interaction
      document.addEventListener('click', restoreAudioOnInteraction, { capture: true, once: true });
      document.addEventListener('touchstart', restoreAudioOnInteraction, { capture: true, once: true });
    }

    const socket = socketManager.getSocket();
    if (!socket) return;

    // Listen for reminder notifications
    socket.on('reminder:due', async (data) => {
      // Show browser notification with sound
      const notification = await NotificationManager.showReminderNotification(
        data.title,
        `Type: ${data.type}\nTime: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
      );
      
      // Check if audio is disabled and show banner if needed
      if (!NotificationManager.isAudioEnabled() && !showAudioBanner) {
        setShowAudioBanner(true);
      }
      
      // Also show toast notification as fallback
      toast({
        title: '🔔 Reminder',
        description: data.title,
        duration: 10000,
      });
    });

    // Listen for emergency alerts
    socket.on('emergency:alert', (data) => {
      toast({
        title: 'Emergency Alert Sent',
        description: 'Your emergency contacts have been notified.',
        variant: 'destructive',
        duration: 10000,
      });
    });

    // Listen for location sharing events
    socket.on('location:shared', (data) => {
      toast({
        title: `📍 Location Shared`,
        description: `${data.from_user} shared their location: ${data.address}`,
        duration: 15000,
      });
    });

    socket.on('location:share_sent', (data) => {
      toast({
        title: '📍 Location Shared Successfully',
        description: data.message,
        duration: 8000,
      });
    });

    return () => {
      socket.off('reminder:due');
      socket.off('emergency:alert');
      socket.off('location:shared');
      socket.off('location:share_sent');
    };
  }, [isAuthenticated, user, toast]);

  return (
    <>
      {showAudioBanner && (
        <AudioPermissionBanner onClose={() => setShowAudioBanner(false)} />
      )}
    </>
  );
}
