import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Volume2, VolumeX, X } from 'lucide-react';
import { NotificationManager } from '@/utils/notifications';

interface AudioPermissionBannerProps {
  onClose: () => void;
}

export function AudioPermissionBanner({ onClose }: AudioPermissionBannerProps) {
  const [isEnabling, setIsEnabling] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);

  const handleEnableAudio = async () => {
    setIsEnabling(true);
    try {
      const enabled = await NotificationManager.enableAudioWithUserGesture();
      setAudioEnabled(enabled);
      if (enabled) {
        // Auto-close banner after successful enablement
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to enable audio:', error);
    } finally {
      setIsEnabling(false);
    }
  };

  return (
    <Card className="fixed top-4 right-4 z-50 w-96 shadow-lg border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950" data-testid="audio-permission-banner">
      <CardContent className="p-4">
        <div className="flex items-start justify-between space-x-3">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              {audioEnabled ? (
                <Volume2 className="w-5 h-5 text-green-600" />
              ) : (
                <VolumeX className="w-5 h-5 text-orange-600" />
              )}
            </div>
            <div className="flex-1">
              {audioEnabled ? (
                <>
                  <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                    🔊 Sound Alerts Enabled
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    You'll now hear audio notifications for reminders!
                  </p>
                </>
              ) : (
                <>
                  <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    🔇 Enable Sound Alerts
                  </h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                    Click to enable audio notifications for your reminders
                  </p>
                  <Button
                    size="sm"
                    onClick={handleEnableAudio}
                    disabled={isEnabling}
                    data-testid="button-enable-audio"
                  >
                    <Volume2 className="w-4 h-4 mr-2" />
                    {isEnabling ? 'Enabling...' : 'Enable Sound'}
                  </Button>
                </>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1 h-auto text-orange-700 hover:text-orange-900 dark:text-orange-300 dark:hover:text-orange-100"
            data-testid="button-close-audio-banner"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}