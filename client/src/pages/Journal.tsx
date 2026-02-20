import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { journalApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Keyboard, Mic, Play, OctagonMinus, Pause, Download, Edit, Trash2, X, Check } from 'lucide-react';

export default function Journal() {
  const [entryType, setEntryType] = useState<'text' | 'voice'>('text');
  const [textContent, setTextContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [deletingEntry, setDeletingEntry] = useState<any>(null);
  const [editContent, setEditContent] = useState('');
  const audioRefs = useRef<{ [key: number]: HTMLAudioElement }>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: journalEntries = [], isLoading } = useQuery({
    queryKey: ['journal'],
    queryFn: journalApi.list,
  });

  const createMutation = useMutation({
    mutationFn: (formData: FormData) => journalApi.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal'] });
      setTextContent('');
      setTranscription('');
      setAudioBlob(null);
      toast({ title: 'Journal entry saved successfully' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: any }) => journalApi.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal'] });
      setEditingEntry(null);
      setEditContent('');
      toast({ title: 'Journal entry updated successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to update journal entry', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => journalApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal'] });
      setDeletingEntry(null);
      toast({ title: 'Journal entry deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to delete journal entry', variant: 'destructive' });
    },
  });

  const startVoiceRecording = async () => {
    try {
      // Start audio recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlob(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      // Start speech recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setTranscription(prev => prev + finalTranscript + ' ');
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
        };

        recognitionRef.current = recognition;
        recognition.start();
      }

      setIsRecording(true);
    } catch (error) {
      toast({
        title: 'Recording failed',
        description: 'Could not access microphone',
        variant: 'destructive',
      });
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    setIsRecording(false);
  };

  const playPreviewAudio = () => {
    if (audioBlob) {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.play();
    }
  };

  const playAudio = (entryId: number, audioPath: string) => {
    if (currentlyPlaying === entryId) {
      // Stop current audio
      if (audioRefs.current[entryId]) {
        audioRefs.current[entryId].pause();
        audioRefs.current[entryId].currentTime = 0;
      }
      setCurrentlyPlaying(null);
      return;
    }

    // Stop any currently playing audio
    if (currentlyPlaying && audioRefs.current[currentlyPlaying]) {
      audioRefs.current[currentlyPlaying].pause();
      audioRefs.current[currentlyPlaying].currentTime = 0;
    }

    // Create and play new audio
    if (!audioRefs.current[entryId]) {
      audioRefs.current[entryId] = new Audio(audioPath);
      audioRefs.current[entryId].addEventListener('ended', () => {
        setCurrentlyPlaying(null);
      });
    }
    
    audioRefs.current[entryId].play();
    setCurrentlyPlaying(entryId);
  };

  const downloadAudio = (audioPath: string, entryId: number) => {
    const link = document.createElement('a');
    link.href = audioPath;
    link.download = `journal-entry-${entryId}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const saveEntry = () => {
    const formData = new FormData();
    
    if (entryType === 'text') {
      if (!textContent.trim()) {
        toast({
          title: 'No content',
          description: 'Please enter some text before saving',
          variant: 'destructive',
        });
        return;
      }
      formData.append('type', 'text');
      formData.append('content_text', textContent);
    } else {
      if (!audioBlob || !transcription.trim()) {
        toast({
          title: 'No content',
          description: 'Please record audio before saving',
          variant: 'destructive',
        });
        return;
      }
      formData.append('type', 'audio');
      formData.append('content_text', transcription);
      formData.append('audio', audioBlob, 'journal-entry.wav');
    }

    createMutation.mutate(formData);
  };

  const handleEdit = (entry: any) => {
    setEditingEntry(entry);
    setEditContent(entry.content_text || '');
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editContent.trim()) {
      toast({
        title: 'Missing content',
        description: 'Please enter some content for the journal entry',
        variant: 'destructive',
      });
      return;
    }

    updateMutation.mutate({
      id: editingEntry.id,
      updates: {
        content_text: editContent,
      },
    });
  };

  const handleDelete = (entry: any) => {
    setDeletingEntry(entry);
  };

  const confirmDelete = () => {
    if (deletingEntry) {
      deleteMutation.mutate(deletingEntry.id);
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading journal entries...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-semibold text-foreground mb-2" data-testid="journal-title">
            Personal Journal
          </h2>
          <p className="text-xl text-muted-foreground">
            Record your thoughts, memories, and daily experiences
          </p>
        </div>
      </div>

      {/* New Entry Form */}
      <Card className="mb-8" data-testid="card-new-entry">
        <CardHeader>
          <CardTitle>Write New Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Entry Type Selection */}
          <div>
            <label className="block text-lg font-medium text-card-foreground mb-2">Entry Type</label>
            <div className="flex space-x-4">
              <Button
                variant={entryType === 'text' ? 'default' : 'outline'}
                className="flex-1 p-4 h-auto flex flex-col space-y-2"
                onClick={() => setEntryType('text')}
                data-testid="button-text-entry"
              >
                <Keyboard className="text-2xl" />
                <div>Text Entry</div>
              </Button>
              <Button
                variant={entryType === 'voice' ? 'default' : 'outline'}
                className="flex-1 p-4 h-auto flex flex-col space-y-2"
                onClick={() => setEntryType('voice')}
                data-testid="button-voice-entry"
              >
                <Mic className="text-2xl" />
                <div>Voice Entry</div>
              </Button>
            </div>
          </div>

          {/* Text Entry Area */}
          {entryType === 'text' && (
            <div>
              <label className="block text-lg font-medium text-card-foreground mb-2">Your thoughts</label>
              <Textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="What would you like to remember about today?"
                className="h-40 text-lg resize-none"
                data-testid="textarea-journal-content"
              />
            </div>
          )}

          {/* Voice Recording Controls */}
          {entryType === 'voice' && (
            <div className="space-y-4">
              {!isRecording && !audioBlob && (
                <div className="text-center py-8">
                  <Button
                    size="lg"
                    onClick={startVoiceRecording}
                    className="h-20 w-20 rounded-full"
                    data-testid="button-start-recording"
                  >
                    <Mic className="text-2xl" />
                  </Button>
                  <p className="mt-4 text-muted-foreground">Tap to start recording</p>
                </div>
              )}

              {isRecording && (
                <div className="bg-muted p-6 rounded-lg text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-destructive rounded-full mx-auto flex items-center justify-center animate-pulse">
                      <Mic className="text-2xl text-destructive-foreground" />
                    </div>
                  </div>
                  <p className="text-lg text-card-foreground mb-4">Recording... Speak clearly</p>
                  <Button
                    onClick={stopVoiceRecording}
                    variant="destructive"
                    data-testid="button-stop-recording"
                  >
                    <OctagonMinus className="w-4 h-4 mr-2" />
                    OctagonMinus Recording
                  </Button>
                  {transcription && (
                    <div className="mt-4 p-4 bg-background rounded border">
                      <p className="text-sm text-muted-foreground mb-2">Live transcription:</p>
                      <p className="text-card-foreground">{transcription}</p>
                    </div>
                  )}
                </div>
              )}

              {audioBlob && !isRecording && (
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Recording completed</p>
                    <div className="flex items-center space-x-4">
                      <Button size="sm" variant="outline" onClick={playPreviewAudio} data-testid="button-play-recording">
                        <Play className="w-4 h-4" />
                      </Button>
                      <div className="flex-1 bg-background rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full w-0"></div>
                      </div>
                      <span className="text-sm text-muted-foreground">0:00</span>
                    </div>
                  </div>
                  
                  {transcription && (
                    <div className="bg-background p-4 rounded-lg">
                      <h4 className="font-medium text-card-foreground mb-2">Transcription:</h4>
                      <Textarea
                        value={transcription}
                        onChange={(e) => setTranscription(e.target.value)}
                        className="min-h-[100px]"
                        data-testid="textarea-transcription"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex space-x-4">
            <Button
              onClick={saveEntry}
              disabled={createMutation.isPending}
              data-testid="button-save-entry"
            >
              {createMutation.isPending ? 'Saving...' : 'Save Entry'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setTextContent('');
                setTranscription('');
                setAudioBlob(null);
                setEntryType('text');
              }}
              data-testid="button-clear-entry"
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Entries */}
      <div className="space-y-6">
        <h3 className="text-2xl font-semibold text-foreground">Recent Entries</h3>

        {journalEntries.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center" data-testid="empty-journal">
                <Plus className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No journal entries yet</h3>
                <p className="text-muted-foreground">Start writing your first entry above</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          journalEntries.map((entry: any) => (
            <Card key={entry.id} data-testid={`journal-entry-${entry.id}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {entry.type === 'text' ? (
                      <Keyboard className="text-primary" />
                    ) : (
                      <Mic className="text-accent" />
                    )}
                    <span className="text-lg font-medium text-card-foreground">
                      {entry.type === 'text' ? 'Text Entry' : 'Voice Entry'}
                    </span>
                    {entry.type === 'audio' && (
                      <span className="text-sm text-muted-foreground">(Audio recording)</span>
                    )}
                  </div>
                  <div className="text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString([], { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: false 
                    })}
                  </div>
                </div>

                {entry.type === 'audio' && entry.audio_path && (
                  <div className="bg-muted p-4 rounded-lg mb-4">
                    <div className="flex items-center space-x-4">
                      <Button 
                        size="sm" 
                        onClick={() => playAudio(entry.id, entry.audio_path)}
                        data-testid={`button-play-${entry.id}`}
                      >
                        {currentlyPlaying === entry.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <div className="flex-1 bg-background rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: '30%' }}></div>
                      </div>
                      <div className="text-sm text-muted-foreground">1:30</div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => downloadAudio(entry.audio_path, entry.id)}
                        data-testid={`button-download-${entry.id}`}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {entry.content_text && (
                  <div className="mb-4">
                    {entry.type === 'audio' && (
                      <h4 className="font-medium text-card-foreground mb-2">Transcription:</h4>
                    )}
                    <p className="text-lg text-card-foreground leading-relaxed">
                      {entry.content_text}
                    </p>
                  </div>
                )}

                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleEdit(entry)}
                    data-testid={`button-edit-${entry.id}`}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleDelete(entry)}
                    data-testid={`button-delete-${entry.id}`}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Entry Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(isOpen) => !isOpen && setEditingEntry(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Journal Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Entry Content</label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Write your thoughts..."
                className="min-h-32"
                required
                data-testid="input-edit-journal-content"
              />
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditingEntry(null)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateMutation.isPending}
                data-testid="button-save-edit"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingEntry} onOpenChange={(isOpen) => !isOpen && setDeletingEntry(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Journal Entry</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete this journal entry? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setDeletingEntry(null)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
