"use client";

import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Camera, Upload, Scan, Brain, Check, Eye } from 'lucide-react';
import { processImageForRecognition, findMatches, type DetectedObject, type ObjectSignature } from '@/lib/objectDetection';
import { api, contactsApi, apiFormData } from '@/lib/api';
import { VoiceRecorder } from '@/components/VoiceRecorder';

export default function Identify() {
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [tags, setTags] = useState('');
  const [linkedContactId, setLinkedContactId] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioTranscription, setAudioTranscription] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [objectSignature, setObjectSignature] = useState<ObjectSignature | null>(null);
  const [matchedObjects, setMatchedObjects] = useState<Array<{ id: number; userTag: string; confidence: number }>>([]);
  const [modelLoading, setModelLoading] = useState(false);
  const [recentlyIdentified, setRecentlyIdentified] = useState<{
    type: 'recognized' | 'saved';
    data: any;
  } | null>(() => {
    // Load from localStorage on component mount
    try {
      const saved = localStorage.getItem('memocare_recently_identified');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [expandedCard, setExpandedCard] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Save recently identified to localStorage whenever it changes
  useEffect(() => {
    if (recentlyIdentified) {
      localStorage.setItem('memocare_recently_identified', JSON.stringify(recentlyIdentified));
    } else {
      localStorage.removeItem('memocare_recently_identified');
    }
  }, [recentlyIdentified]);

  // Fetch contacts for linking
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => contactsApi.list(),
  });

  // Fetch stored object recognitions
  const { data: storedObjects = [] } = useQuery({
    queryKey: ['objects'],
    queryFn: () => api('/api/identify/objects'),
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return await apiFormData('/api/identify', formData);
    },
    onSuccess: (data) => {
      toast({ 
        title: 'Photo uploaded successfully',
        description: 'Photo has been tagged and saved'
      });
      
      // Set recently identified for saved object
      setRecentlyIdentified({
        type: 'saved',
        data: {
          userTag: tags,
          confidence: 1.0,
          notes: notes,
          linkedContact: linkedContactId ? contacts.find((c: any) => c.id.toString() === linkedContactId) : null
        }
      });
      setExpandedCard(false);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['objects'] });
      resetForm();
    },
    onError: () => {
      toast({ 
        title: 'Upload failed',
        description: 'Failed to upload and save photo',
        variant: 'destructive'
      });
    }
  });

  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setTimeout(() => videoRef.current?.play().catch(() => {}), 100);
      }
      setIsCapturing(true);
    } catch {
      toast({ title: 'Camera error', description: 'Could not access camera.', variant: 'destructive' });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCapturing(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (blob) {
        // Clear previous results when capturing new photo
        setMatchedObjects([]);
        setDetectedObjects([]);
        setRecentlyIdentified(null);
        setExpandedCard(false);
        
        const file = new File([blob], 'captured-photo.jpg', { type: 'image/jpeg' });
        setPhotoFile(file);
        setCapturedPhoto(URL.createObjectURL(blob));
        analyzePhoto(canvas);
      }
    }, 'image/jpeg', 0.8);
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Clear previous results when uploading new photo
      setMatchedObjects([]);
      setDetectedObjects([]);
      setRecentlyIdentified(null);
      setExpandedCard(false);
      
      setPhotoFile(file);
      const photoUrl = URL.createObjectURL(file);
      setCapturedPhoto(photoUrl);
      const img = new Image();
      img.onload = () => analyzePhoto(img);
      img.src = photoUrl;
    }
  };

  const analyzePhoto = async (imageElement: HTMLImageElement | HTMLCanvasElement) => {
    setIsAnalyzing(true);
    setModelLoading(true);
    try {
      const { detectedObjects, signature } = await processImageForRecognition(imageElement);
      setDetectedObjects(detectedObjects);
      setObjectSignature(signature);
      setModelLoading(false);

      if (storedObjects.length > 0) {
        const storedSignatures = storedObjects.map((obj: any) => ({
          id: obj.id,
          signature: JSON.parse(obj.visual_features || '{}'),
          userTag: obj.user_tag
        }));
        const matches = findMatches(signature, storedSignatures);
        setMatchedObjects(matches);
        if (matches.length > 0) {
          // Find the original stored object for more details
          const matchedStoredObject = storedObjects.find((obj: any) => obj.id === matches[0].id);
          
          // Set recently identified for recognized object
          setRecentlyIdentified({
            type: 'recognized',
            data: {
              ...matches[0],
              notes: matchedStoredObject?.notes,
              linkedContact: matchedStoredObject?.linked_contact_id ? 
                contacts.find((c: any) => c.id === matchedStoredObject.linked_contact_id) : null,
              photo_path: matchedStoredObject?.photo_path
            }
          });
          setExpandedCard(false);
          
          toast({ title: 'Object recognized!', description: `Found ${matches.length} similar object(s)` });
        }
      }
    } catch (error) {
      console.error('Object analysis failed:', error);
      toast({ title: 'Analysis failed', description: 'Could not analyze.', variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
      setModelLoading(false);
    }
  };

  const handleVoiceRecording = (blob: Blob, transcription: string) => {
    setAudioBlob(blob);
    setAudioTranscription(transcription);
  };

  const clearVoiceRecording = () => {
    setAudioBlob(null);
    setAudioTranscription('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile) {
      toast({ title: 'No photo selected', description: 'Please capture or upload a photo', variant: 'destructive' });
      return;
    }
    const formData = new FormData();
    formData.append('photo', photoFile);
    formData.append('tags', tags);
    if (linkedContactId) formData.append('linked_contact_id', linkedContactId);
    formData.append('notes', notes);
    if (audioBlob) {
      formData.append('audio', audioBlob, 'voice-note.webm');
    }
    if (audioTranscription) {
      formData.append('transcription', audioTranscription);
    }
    if (detectedObjects.length > 0) formData.append('detected_objects', JSON.stringify(detectedObjects));
    if (objectSignature) formData.append('visual_features', JSON.stringify(objectSignature));
    uploadMutation.mutate(formData);
  };

  const resetForm = () => {
    setCapturedPhoto(null);
    setPhotoFile(null);
    setTags('');
    setLinkedContactId(undefined);
    setNotes('');
    setAudioBlob(null);
    setAudioTranscription('');
    setDetectedObjects([]);
    setObjectSignature(null);
    setMatchedObjects([]);
    setIsAnalyzing(false);
    // Don't clear recentlyIdentified - it should persist until next action
    stopCamera();
  };

  const [showAllObjects, setShowAllObjects] = useState(false);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-4xl font-semibold">Identify & Tag</h2>
        <Button 
          onClick={() => setShowAllObjects(!showAllObjects)}
          variant="outline"
          data-testid="button-toggle-objects-list"
        >
          {showAllObjects ? 'Hide All Objects' : 'View All Objects'}
        </Button>
      </div>

      {/* All Scanned Objects List */}
      {showAllObjects && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>All Scanned Objects</CardTitle>
          </CardHeader>
          <CardContent>
            {storedObjects.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No objects scanned yet</p>
            ) : (
              <div className="space-y-4">
                {storedObjects.map((obj: any) => {
                  const linkedContact = obj.linked_contact_id ? 
                    contacts.find((c: any) => c.id === obj.linked_contact_id) : null;
                  
                  return (
                    <Card key={obj.id} className="overflow-hidden" data-testid={`card-object-${obj.id}`}>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                        {/* Image */}
                        <div className="flex justify-center">
                          <img 
                            src={obj.photo_path} 
                            alt={obj.user_tag} 
                            className="w-full h-48 object-cover rounded-lg"
                            data-testid={`img-object-${obj.id}`}
                          />
                        </div>
                        
                        {/* Object Details */}
                        <div className="md:col-span-2 space-y-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">Object Tag</Label>
                            <p className="font-semibold text-lg" data-testid={`text-tag-${obj.id}`}>{obj.user_tag}</p>
                          </div>
                          
                          {obj.notes && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Text Notes</Label>
                              <p className="text-sm" data-testid={`text-notes-${obj.id}`}>{obj.notes}</p>
                            </div>
                          )}
                          
                          {obj.transcription && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Voice Transcription</Label>
                              <p className="text-sm italic" data-testid={`text-transcription-${obj.id}`}>
                                "{obj.transcription}"
                              </p>
                            </div>
                          )}
                          
                          {obj.audio_path && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Voice Note</Label>
                              <audio 
                                controls 
                                src={obj.audio_path} 
                                className="w-full mt-1"
                                data-testid={`audio-note-${obj.id}`}
                              />
                            </div>
                          )}
                          
                          {linkedContact && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Linked Contact</Label>
                              <p className="text-sm" data-testid={`text-contact-${obj.id}`}>
                                {linkedContact.name} ({linkedContact.relation})
                              </p>
                            </div>
                          )}
                          
                          <div>
                            <Label className="text-xs text-muted-foreground">Detected Objects</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {JSON.parse(obj.detected_objects || '[]').slice(0, 3).map((detObj: any, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {detObj.class} ({Math.round(detObj.score * 100)}%)
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <Label className="text-xs text-muted-foreground">Created</Label>
                            <p className="text-xs">{new Date(obj.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recently Identified Box */}
      {recentlyIdentified && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5"/>
              Recently Identified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/20"
              onClick={() => setExpandedCard(!expandedCard)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                    {capturedPhoto ? (
                      <img 
                        src={capturedPhoto} 
                        alt="Detected object" 
                        className="w-full h-full object-cover"
                      />
                    ) : recentlyIdentified.data.photo_path ? (
                      <img 
                        src={recentlyIdentified.data.photo_path} 
                        alt="Stored object" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      recentlyIdentified.type === 'recognized' ? (
                        <Check className="w-8 h-8 text-green-600"/>
                      ) : (
                        <Brain className="w-8 h-8 text-blue-600"/>
                      )
                    )}
                  </div>
                  
                  {/* Basic Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{recentlyIdentified.data.userTag}</h3>
                    <p className="text-sm text-muted-foreground">
                      {recentlyIdentified.type === 'recognized' 
                        ? `Recognized with ${Math.round(recentlyIdentified.data.confidence * 100)}% confidence`
                        : 'Newly saved object'
                      }
                    </p>
                    {recentlyIdentified.data.linkedContact && (
                      <p className="text-xs text-muted-foreground">
                        Linked to: {recentlyIdentified.data.linkedContact.name}
                      </p>
                    )}
                  </div>
                  
                  {/* Expand indicator */}
                  <div className="flex-shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {expandedCard ? 'Less' : 'More'}
                    </Badge>
                  </div>
                </div>
                
                {/* Expanded Details */}
                {expandedCard && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div>
                      <Label className="font-medium text-muted-foreground">Object Tag</Label>
                      <p className="mt-1">{recentlyIdentified.data.userTag}</p>
                    </div>
                    
                    <div>
                      <Label className="font-medium text-muted-foreground">Linked Contact</Label>
                      <p className="mt-1">
                        {recentlyIdentified.data.linkedContact 
                          ? `${recentlyIdentified.data.linkedContact.name} (${recentlyIdentified.data.linkedContact.relation})`
                          : "—"
                        }
                      </p>
                    </div>
                    
                    <div>
                      <Label className="font-medium text-muted-foreground">Notes</Label>
                      <p className="mt-1">{recentlyIdentified.data.notes || "—"}</p>
                    </div>
                    
                    {recentlyIdentified.type === 'recognized' && (
                      <div>
                        <Label className="font-medium text-muted-foreground">Confidence</Label>
                        <p className="mt-1">{Math.round(recentlyIdentified.data.confidence * 100)}% match</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader><CardTitle>Capture / Upload Photo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {!capturedPhoto && !isCapturing && (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground"/>
                <div className="flex justify-center gap-4">
                  <Button onClick={startCamera}><Camera className="w-4 h-4 mr-2"/>Use Camera</Button>
                  <Label htmlFor="photo-upload" className="cursor-pointer">
                    <Button variant="outline" asChild>
                      <span><Upload className="w-4 h-4 mr-2"/>Upload Photo</span>
                    </Button>
                  </Label>
                  <Input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handleFileUpload}/>
                </div>
              </div>
            )}

            {isCapturing && (
              <div className="relative">
                <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg"/>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-4">
                  <Button onClick={capturePhoto} size="lg" className="rounded-full h-16 w-16"><Camera className="w-6 h-6"/></Button>
                  <Button onClick={stopCamera} variant="outline">Cancel</Button>
                </div>
              </div>
            )}

            {capturedPhoto && (
              <div className="relative">
                <img ref={imageRef} src={capturedPhoto} alt="Captured" className="w-full rounded-lg"/>
                <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none"/>
                <Button onClick={resetForm} variant="outline" className="absolute top-2 right-2">Retake</Button>
                {(isAnalyzing || modelLoading) && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                    <div className="text-white text-center">
                      <Brain className="w-8 h-8 mx-auto mb-2 animate-pulse"/>
                      <p>{modelLoading ? 'Loading AI model...' : 'Analyzing objects...'}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <canvas ref={canvasRef} className="hidden"/>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Eye className="w-5 h-5"/>Tag & Identify</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {matchedObjects.length > 0 ? (
              // 🎯 Case 1: Known object → show comprehensive info card
              <div className="space-y-4">
                <Alert className="border-green-200 bg-green-50">
                  <Check className="w-4 h-4 text-green-600"/>
                  <AlertDescription>
                    <strong className="text-green-800">Object recognized!</strong>
                  </AlertDescription>
                </Alert>
                
                {matchedObjects.map((match, i) => {
                  const originalObject = storedObjects.find((obj: any) => obj.id === match.id);
                  const linkedContact = originalObject?.linked_contact_id ? 
                    contacts.find((c: any) => c.id === originalObject.linked_contact_id) : null;
                  
                  return (
                    <Card key={i} className="border-green-200">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-lg">{match.userTag}</h3>
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                              {Math.round(match.confidence * 100)}% match
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-3 text-sm">
                            <div>
                              <Label className="font-medium text-muted-foreground">Object Tag</Label>
                              <p className="mt-1">{match.userTag}</p>
                            </div>
                            
                            <div>
                              <Label className="font-medium text-muted-foreground">Linked Contact</Label>
                              <p className="mt-1">
                                {linkedContact ? `${linkedContact.name} (${linkedContact.relation})` : "—"}
                              </p>
                            </div>
                            
                            <div>
                              <Label className="font-medium text-muted-foreground">Notes</Label>
                              <p className="mt-1">{originalObject?.notes || "—"}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              // 🎯 Case 2: New object → show detected objects + tagging form
              <>
                {detectedObjects.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Detected Objects</Label>
                    <div className="flex flex-wrap gap-2">
                      {detectedObjects.map((obj, i) => (
                        <Badge key={i} variant="secondary"><Scan className="w-3 h-3"/>{obj.class} ({Math.round(obj.score*100)}%)</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Your Tag/Description</Label>
                    <Input value={tags} onChange={e=>setTags(e.target.value)} placeholder="Describe what you see..."/>
                  </div>
                  <div>
                    <Label>Link to Contact</Label>
                    <Select value={linkedContactId} onValueChange={setLinkedContactId}>
                      <SelectTrigger><SelectValue placeholder="Select a person (optional)"/></SelectTrigger>
                      <SelectContent>
                        {contacts.map((c: any)=>(<SelectItem key={c.id} value={c.id.toString()}>{c.name} ({c.relation})</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Additional notes"/>
                  </div>
                  <div>
                    <Label>Voice Note (Optional)</Label>
                    <VoiceRecorder 
                      onRecordingComplete={handleVoiceRecording}
                      onClear={clearVoiceRecording}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={!photoFile || uploadMutation.isPending}>
                    {uploadMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
