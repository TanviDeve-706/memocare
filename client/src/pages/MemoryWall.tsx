import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memoryApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Images, Camera, Video, Music, Search, Filter, Edit, Trash2, X, Check } from 'lucide-react';

export default function MemoryWall() {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [uploadData, setUploadData] = useState({
    title: '',
    tags: '',
    type: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewingMemory, setViewingMemory] = useState<any>(null);
  const [editingMemory, setEditingMemory] = useState<any>(null);
  const [deletingMemory, setDeletingMemory] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: memoryItems = [], isLoading } = useQuery({
    queryKey: ['memory'],
    queryFn: memoryApi.list,
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => memoryApi.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memory'] });
      setShowUploadForm(false);
      setUploadData({ title: '', tags: '', type: '' });
      setSelectedFile(null);
      toast({ title: 'Memory uploaded successfully' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: any }) => memoryApi.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memory'] });
      setEditingMemory(null);
      setUploadData({ title: '', tags: '', type: '' });
      toast({ title: 'Memory updated successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to update memory', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => memoryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memory'] });
      setDeletingMemory(null);
      toast({ title: 'Memory deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to delete memory', variant: 'destructive' });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    
    // Auto-detect type based on file
    if (file.type.startsWith('image/')) {
      setUploadData(prev => ({ ...prev, type: 'photo' }));
    } else if (file.type.startsWith('video/')) {
      setUploadData(prev => ({ ...prev, type: 'video' }));
    } else if (file.type.startsWith('audio/')) {
      setUploadData(prev => ({ ...prev, type: 'audio' }));
    }
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadData.title || !uploadData.type) {
      toast({
        title: 'Missing information',
        description: 'Please select a file, enter a title, and specify the type',
        variant: 'destructive',
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', uploadData.title);
    formData.append('type', uploadData.type);
    formData.append('tags', uploadData.tags);

    uploadMutation.mutate(formData);
  };

  const handleEdit = (memory: any) => {
    setEditingMemory(memory);
    setUploadData({
      title: memory.title,
      tags: memory.tags || '',
      type: memory.type,
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadData.title || !uploadData.type) {
      toast({
        title: 'Missing information',
        description: 'Please enter a title and specify the type',
        variant: 'destructive',
      });
      return;
    }

    updateMutation.mutate({
      id: editingMemory.id,
      updates: {
        title: uploadData.title,
        type: uploadData.type,
        tags: uploadData.tags,
      },
    });
  };

  const handleDelete = (memory: any) => {
    setDeletingMemory(memory);
  };

  const confirmDelete = () => {
    if (deletingMemory) {
      deleteMutation.mutate(deletingMemory.id);
    }
  };

  // Get unique tags for filter
  const allTags: string[] = Array.from(
    new Set(
      memoryItems
        .flatMap((item: any) => item.tags ? item.tags.split(',').map((tag: string) => tag.trim()) : [])
        .filter(Boolean)
    )
  );

  const filteredMemories = memoryItems.filter((item: any) => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.tags && item.tags.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesTag = tagFilter === 'all' || (item.tags && item.tags.includes(tagFilter));
    return matchesSearch && matchesType && matchesTag;
  });

  const getMemoryIcon = (type: string) => {
    switch (type) {
      case 'photo': return <Camera className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      default: return <Images className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading memory wall...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-semibold text-foreground mb-2" data-testid="memory-wall-title">
            Memory Wall
          </h2>
          <p className="text-xl text-muted-foreground">
            Your collection of precious moments and memories
          </p>
        </div>
        <Button 
          onClick={() => setShowUploadForm(!showUploadForm)}
          data-testid="button-add-memory"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Memory
        </Button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <Card className="mb-8" data-testid="card-upload-memory">
          <CardHeader>
            <CardTitle>Upload New Memory</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <Label htmlFor="file">Choose File</Label>
                <Input
                  id="file"
                  type="file"
                  accept="image/*,video/*,audio/*"
                  onChange={handleFileSelect}
                  required
                  data-testid="input-memory-file"
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={uploadData.title}
                    onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Family dinner, Birthday party, etc."
                    required
                    data-testid="input-memory-title"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select 
                    value={uploadData.type} 
                    onValueChange={(value) => setUploadData(prev => ({ ...prev, type: value }))}
                    required
                  >
                    <SelectTrigger data-testid="select-memory-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="photo">Photo</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={uploadData.tags}
                  onChange={(e) => setUploadData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="family, celebration, birthday, etc."
                  data-testid="input-memory-tags"
                />
              </div>

              <div className="flex space-x-2">
                <Button 
                  type="submit" 
                  disabled={uploadMutation.isPending}
                  data-testid="button-upload-memory"
                >
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload Memory'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowUploadForm(false)}
                  data-testid="button-cancel-upload"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Edit Memory Dialog */}
      <Dialog open={!!editingMemory} onOpenChange={(isOpen) => !isOpen && setEditingMemory(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Memory</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={uploadData.title}
                onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Family dinner, Birthday party, etc."
                required
                data-testid="input-edit-memory-title"
              />
            </div>
            <div>
              <Label htmlFor="edit-type">Type</Label>
              <Select 
                value={uploadData.type} 
                onValueChange={(value) => setUploadData(prev => ({ ...prev, type: value }))}
                required
              >
                <SelectTrigger data-testid="select-edit-memory-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="photo">Photo</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
              <Input
                id="edit-tags"
                value={uploadData.tags}
                onChange={(e) => setUploadData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="family, celebration, birthday, etc."
                data-testid="input-edit-memory-tags"
              />
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditingMemory(null)}
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
      <Dialog open={!!deletingMemory} onOpenChange={(isOpen) => !isOpen && setDeletingMemory(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Memory</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete "{deletingMemory?.title}"? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setDeletingMemory(null)}
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

      {/* Search and Filter Controls */}
      <Card className="mb-8" data-testid="card-filters">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search memories by title or tag..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-lg"
                  data-testid="input-search-memories"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40" data-testid="select-type-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="photo">Photos</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-40" data-testid="select-tag-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {allTags.map((tag: string) => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Memory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredMemories.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="py-8">
                <div className="text-center" data-testid="empty-memories">
                  <Images className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">
                    {searchTerm || typeFilter !== 'all' || tagFilter !== 'all' 
                      ? 'No memories found' 
                      : 'No memories uploaded'
                    }
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || typeFilter !== 'all' || tagFilter !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'Upload your first memory to get started'
                    }
                  </p>
                  {!searchTerm && typeFilter === 'all' && tagFilter === 'all' && (
                    <Button onClick={() => setShowUploadForm(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Memory
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {filteredMemories.map((memory: any) => (
              <Card key={memory.id} className="overflow-hidden hover:shadow-lg transition-shadow group" data-testid={`memory-${memory.id}`}>
                <div 
                  className="relative aspect-square overflow-hidden cursor-pointer"
                  onClick={() => setViewingMemory(memory)}
                >
                  {memory.type === 'photo' ? (
                    <img 
                      src={memory.file_path} 
                      alt={memory.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        // Fallback to placeholder if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : memory.type === 'video' ? (
                    <video 
                      src={memory.file_path}
                      className="w-full h-full object-cover"
                      preload="metadata"
                      onError={(e) => {
                        // Fallback to placeholder if video fails to load
                        const target = e.target as HTMLVideoElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                      <Music className="w-12 h-12 text-white" />
                      <div className="absolute bottom-2 left-2 text-white text-sm bg-black/50 px-2 py-1 rounded">
                        Audio
                      </div>
                    </div>
                  )}
                  
                  {/* Fallback placeholders (hidden by default, shown on error) */}
                  <div className="absolute inset-0 bg-muted flex items-center justify-center hidden">
                    {memory.type === 'photo' ? (
                      <Camera className="w-12 h-12 text-muted-foreground" />
                    ) : (
                      <Video className="w-12 h-12 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="absolute top-2 right-2 bg-black/50 rounded-full p-2">
                    {getMemoryIcon(memory.type)}
                  </div>
                  
                  {memory.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors cursor-pointer">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
                          <path d="M8 5v14l11-7z" fill="currentColor"/>
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
                
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-card-foreground flex-1">{memory.title}</h3>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(memory);
                        }}
                        data-testid={`button-edit-memory-${memory.id}`}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(memory);
                        }}
                        data-testid={`button-delete-memory-${memory.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {memory.tags && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {memory.tags.split(',').map((tag: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag.trim()}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-sm text-muted-foreground">
                    Added {new Date(memory.created_at).toLocaleDateString()}
                    {memory.type === 'audio' && ' • Audio recording'}
                    {memory.type === 'video' && ' • Video file'}
                  </p>
                </CardContent>
              </Card>
            ))}
            
            {/* Upload New Memory Card */}
            <Card 
              className="border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all cursor-pointer" 
              onClick={() => setShowUploadForm(true)}
              data-testid="card-upload-new"
            >
              <div className="aspect-square flex items-center justify-center">
                <div className="text-center py-8">
                  <Plus className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold text-card-foreground mb-2">Add Memory</h3>
                  <p className="text-muted-foreground">Upload photo, video, or audio</p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Media Viewer Modal */}
      {viewingMemory && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingMemory(null)}
        >
          <div 
            className="max-w-4xl max-h-full bg-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{viewingMemory.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(viewingMemory.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setViewingMemory(null)}
                >
                  Close
                </Button>
              </div>
            </div>
            
            <div className="relative">
              {viewingMemory.type === 'photo' ? (
                <img 
                  src={viewingMemory.file_path} 
                  alt={viewingMemory.title}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              ) : viewingMemory.type === 'video' ? (
                <video 
                  src={viewingMemory.file_path}
                  controls
                  className="max-w-full max-h-[70vh]"
                  autoPlay
                />
              ) : (
                <div className="p-8 text-center">
                  <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <audio 
                    src={viewingMemory.file_path}
                    controls
                    className="w-full max-w-md mx-auto"
                    autoPlay
                  />
                </div>
              )}
            </div>
            
            {viewingMemory.tags && (
              <div className="p-4 border-t">
                <div className="flex flex-wrap gap-2">
                  {viewingMemory.tags.split(',').map((tag: string, index: number) => (
                    <Badge key={index} variant="secondary">
                      {tag.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
