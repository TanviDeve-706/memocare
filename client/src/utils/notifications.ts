// Notification utility for handling browser notifications and sound alerts
export class NotificationManager {
  private static audioContext: AudioContext | null = null;
  private static notificationSound: HTMLAudioElement | null = null;
  private static audioEnabled: boolean = false;
  private static permissionsRequested: boolean = false;

  // Request notification permission
  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notification');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  // Initialize audio context and sound
  static async initializeAudio(): Promise<boolean> {
    try {
      // Create notification sound using Web Audio API for better browser compatibility
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Resume audio context if suspended (required for autoplay policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // Create a simple beep sound programmatically
      this.notificationSound = new Audio();
      // Data URL for a simple notification beep (440Hz for 0.5 seconds)
      const audioData = this.generateBeepSound();
      this.notificationSound.src = audioData;
      this.notificationSound.preload = 'auto';
      
      this.audioEnabled = true;
      return true;
    } catch (error) {
      console.warn('Audio initialization failed:', error);
      this.audioEnabled = false;
      return false;
    }
  }

  // Generate a simple beep sound as data URL
  private static generateBeepSound(): string {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const sampleRate = audioContext.sampleRate;
      const duration = 0.5; // 0.5 seconds
      const numSamples = sampleRate * duration;
      const arrayBuffer = audioContext.createBuffer(1, numSamples, sampleRate);
      const channelData = arrayBuffer.getChannelData(0);

      // Generate a 440Hz sine wave
      for (let i = 0; i < numSamples; i++) {
        channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.3;
      }

      // Convert to WAV format data URL
      const wavData = this.encodeWAV(arrayBuffer);
      return `data:audio/wav;base64,${btoa(String.fromCharCode.apply(null, Array.from(wavData)))}`;
    } catch (error) {
      console.warn('Could not generate beep sound:', error);
      // Fallback: empty data URL
      return 'data:audio/wav;base64,';
    }
  }

  // Simple WAV encoding
  private static encodeWAV(audioBuffer: AudioBuffer): Uint8Array {
    const length = audioBuffer.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, audioBuffer.sampleRate, true);
    view.setUint32(28, audioBuffer.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }

    return new Uint8Array(arrayBuffer);
  }

  // Play notification sound
  static async playNotificationSound(): Promise<boolean> {
    try {
      if (!this.audioEnabled || !this.notificationSound) {
        const initialized = await this.initializeAudio();
        if (!initialized) {
          return false;
        }
      }

      if (this.notificationSound && this.audioEnabled) {
        // Reset audio to beginning and play
        this.notificationSound.currentTime = 0;
        await this.notificationSound.play();
        return true;
      }
    } catch (error) {
      console.warn('Could not play notification sound:', error);
      // Mark audio as disabled if it fails due to autoplay policy
      if (error instanceof Error && error.name === 'NotAllowedError') {
        this.audioEnabled = false;
      }
    }
    return false;
  }

  // Show browser notification with sound
  static async showNotification(
    title: string,
    body: string,
    options: {
      icon?: string;
      tag?: string;
      requireInteraction?: boolean;
      silent?: boolean;
    } = {}
  ): Promise<Notification | null> {
    const hasPermission = await this.requestPermission();
    
    if (!hasPermission) {
      console.warn('Notification permission denied');
      return null;
    }

    try {
      // Play sound if not silent
      if (!options.silent) {
        const soundPlayed = await this.playNotificationSound();
        if (!soundPlayed && navigator.vibrate) {
          // Fallback to vibration on mobile if sound fails
          navigator.vibrate([200, 100, 200]);
        }
      }

      // Show browser notification
      const notification = new Notification(title, {
        body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag || 'reminder',
        requireInteraction: options.requireInteraction !== false, // Default to true for reminders
        ...options
      });

      // Auto-close notification after 10 seconds if not requiring interaction
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 10000);
      }

      return notification;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return null;
    }
  }

  // Show reminder notification with sound
  static async showReminderNotification(
    title: string,
    body: string
  ): Promise<Notification | null> {
    return this.showNotification(`🔔 Reminder: ${title}`, body, {
      tag: 'reminder',
      requireInteraction: true, // Require user interaction for reminders
      silent: false
    });
  }

  // Check if audio is enabled
  static isAudioEnabled(): boolean {
    return this.audioEnabled;
  }

  // Enable audio with user interaction - must be called from user gesture
  static async enableAudioWithUserGesture(): Promise<boolean> {
    try {
      // CRITICAL: Create audio and play immediately within user gesture
      // Do NOT await anything before the play() call
      
      // Create audio element if not exists
      if (!this.notificationSound) {
        this.notificationSound = new Audio();
        const audioData = this.generateBeepSound();
        this.notificationSound.src = audioData;
      }
      
      // Create/resume AudioContext synchronously
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // CRITICAL: Play immediately without awaiting to preserve user gesture
      const originalVolume = this.notificationSound.volume;
      this.notificationSound.volume = 0; // Mute for unlock test
      this.notificationSound.currentTime = 0;
      
      // Synchronous play() call - do not await here!
      const playPromise = this.notificationSound.play();
      
      // Immediately pause and restore volume
      this.notificationSound.pause();
      this.notificationSound.volume = originalVolume;
      this.notificationSound.currentTime = 0;
      
      // WebAudio unlock as backup (more robust on Safari)
      if (this.audioContext.state === 'suspended') {
        // Resume without await to stay in user gesture
        this.audioContext.resume();
      }
      
      // Create a short silent oscillator to unlock WebAudio
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 0; // Silent
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + 0.01);
      
      // Now we can await the play promise
      await playPromise;
      
      // If we got here, audio is truly unlocked
      this.audioEnabled = true;
      
      // Store the permission in localStorage
      localStorage.setItem('memocare_audio_enabled', 'true');
      
      return true;
    } catch (error) {
      console.warn('Failed to enable audio with user gesture:', error);
      this.audioEnabled = false;
      localStorage.setItem('memocare_audio_enabled', 'false');
      return false;
    }
  }
}

// Initialize permissions request on first import
if (typeof window !== 'undefined') {
  // Request notification permission
  NotificationManager.requestPermission();
}