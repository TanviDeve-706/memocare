import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, StopCircle, Play, Pause, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, transcription: string) => void;
  onClear?: () => void;
  existingAudioUrl?: string;
  existingTranscription?: string;
}

export function VoiceRecorder({ 
  onRecordingComplete, 
  onClear,
  existingAudioUrl,
  existingTranscription 
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingAudioUrl || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcription, setTranscription] = useState<string>(existingTranscription || '');
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize Web Speech API for transcription
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        setTranscription(prev => prev + finalTranscript);
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          toast({
            title: 'No speech detected',
            description: 'Please speak into your microphone',
            variant: 'destructive',
          });
        }
      };
      
      recognitionRef.current.onend = () => {
        setIsTranscribing(false);
      };
    }
    
    return () => {
      if (audioUrl && !existingAudioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // Stop transcription
        if (recognitionRef.current && isTranscribing) {
          recognitionRef.current.stop();
        }
        
        // Call the callback with the recording and transcription
        onRecordingComplete(audioBlob, transcription);
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // Start transcription if available
      if (recognitionRef.current) {
        setTranscription('');
        setIsTranscribing(true);
        recognitionRef.current.start();
      }
      
      toast({
        title: 'Recording started',
        description: 'Speak now to record your voice note',
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Microphone access denied',
        description: 'Please allow microphone access to record voice notes',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      toast({
        title: 'Recording stopped',
        description: 'Your voice note has been saved',
      });
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current && audioUrl) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const clearRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    if (audioUrl && !existingAudioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    setAudioUrl(null);
    setIsPlaying(false);
    setTranscription('');
    audioChunksRef.current = [];
    
    if (onClear) {
      onClear();
    }
    
    toast({
      title: 'Recording cleared',
      description: 'Voice note has been removed',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {!isRecording && !audioUrl && (
          <Button
            type="button"
            onClick={startRecording}
            variant="outline"
            className="flex items-center gap-2"
            data-testid="button-start-recording"
          >
            <Mic className="w-4 h-4" />
            Record Voice Note
          </Button>
        )}
        
        {isRecording && (
          <Button
            type="button"
            onClick={stopRecording}
            variant="destructive"
            className="flex items-center gap-2 animate-pulse"
            data-testid="button-stop-recording"
          >
            <StopCircle className="w-4 h-4" />
            Stop Recording
          </Button>
        )}
        
        {audioUrl && !isRecording && (
          <>
            <Button
              type="button"
              onClick={togglePlayback}
              variant="outline"
              className="flex items-center gap-2"
              data-testid="button-play-recording"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Play
                </>
              )}
            </Button>
            
            <Button
              type="button"
              onClick={clearRecording}
              variant="outline"
              className="flex items-center gap-2"
              data-testid="button-clear-recording"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </Button>
          </>
        )}
      </div>
      
      {isRecording && (
        <div className="text-sm text-muted-foreground animate-pulse" data-testid="text-recording-status">
          🎤 Recording... Speak now
        </div>
      )}
      
      {transcription && (
        <div className="p-3 bg-muted rounded-md space-y-1">
          <div className="text-xs font-medium text-muted-foreground">
            Transcription:
          </div>
          <div className="text-sm" data-testid="text-transcription">
            {transcription}
          </div>
        </div>
      )}
    </div>
  );
}
