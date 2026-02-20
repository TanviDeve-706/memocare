import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, Phone, Mail, Calendar, Edit, Trash2 } from 'lucide-react';

export default function Contacts() {
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [relationFilter, setRelationFilter] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    relation: undefined as string | undefined,
    customRelation: '',
    phone: '',
    email: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: contactsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: (formDataToSend: FormData) => contactsApi.create(formDataToSend),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      resetForm();
      toast({ title: 'Contact added successfully' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, formData }: { id: number, formData: FormData }) => contactsApi.update(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      resetForm();
      toast({ title: 'Contact updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update contact', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => contactsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({ title: 'Contact deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete contact', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingContact(null);
    setFormData({ name: '', relation: undefined, customRelation: '', phone: '', email: '' });
    setPhotoFile(null);
  };

  const startEdit = (contact: any) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      relation: contact.relation === 'daughter' || contact.relation === 'son' || contact.relation === 'spouse' || contact.relation === 'doctor' || contact.relation === 'friend' || contact.relation === 'neighbor' || contact.relation === 'caregiver' ? contact.relation : 'custom',
      customRelation: contact.relation === 'daughter' || contact.relation === 'son' || contact.relation === 'spouse' || contact.relation === 'doctor' || contact.relation === 'friend' || contact.relation === 'neighbor' || contact.relation === 'caregiver' ? '' : contact.relation,
      phone: contact.phone || '',
      email: contact.email || '',
    });
    setPhotoFile(null);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.relation) return;
    
    // If custom is selected, use the custom relation instead
    const relationToSend = formData.relation === 'custom' ? formData.customRelation : formData.relation;
    if (!relationToSend) return;

    const formDataToSend = new FormData();
    formDataToSend.append('name', formData.name);
    formDataToSend.append('relation', relationToSend);
    formDataToSend.append('phone', formData.phone);
    formDataToSend.append('email', formData.email);
    if (photoFile) formDataToSend.append('photo', photoFile);

    if (editingContact) {
      updateMutation.mutate({ id: editingContact.id, formData: formDataToSend });
    } else {
      createMutation.mutate(formDataToSend);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const filteredContacts = contacts.filter((contact: any) => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesRelation = true;
    if (relationFilter !== 'all') {
      const relation = contact.relation.toLowerCase();
      switch (relationFilter) {
        case 'family':
          // Include both predefined and custom family relationships
          matchesRelation = ['daughter', 'son', 'spouse', 'family'].includes(relation) ||
                           relation.includes('mother') || relation.includes('father') ||
                           relation.includes('parent') || relation.includes('child') ||
                           relation.includes('sibling') || relation.includes('brother') || relation.includes('sister') ||
                           relation.includes('cousin') || relation.includes('aunt') || relation.includes('uncle') ||
                           relation.includes('grandmother') || relation.includes('grandfather') ||
                           relation.includes('grandchild') || relation.includes('grandson') || relation.includes('granddaughter');
          break;
        case 'friend':
          matchesRelation = relation === 'friend' || relation.includes('friend');
          break;
        case 'doctor':
          // Include medical professionals
          matchesRelation = relation === 'doctor' || relation.includes('doctor') ||
                           relation.includes('physician') || relation.includes('therapist') ||
                           relation.includes('nurse') || relation.includes('medical');
          break;
        case 'neighbor':
          // Include neighbors and caregivers
          matchesRelation = ['neighbor', 'caregiver'].includes(relation) ||
                           relation.includes('neighbor') || relation.includes('caregiver') ||
                           relation.includes('guardian') || relation.includes('helper');
          break;
        default:
          matchesRelation = relation === relationFilter;
      }
    }
    
    return matchesSearch && matchesRelation;
  });

  if (isLoading) return <div className="p-8">Loading contacts...</div>;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-semibold text-foreground mb-2" data-testid="contacts-title">
            People Cards
          </h2>
          <p className="text-xl text-muted-foreground">
            Keep track of important people in your life
          </p>
        </div>
        <Button onClick={() => {
          resetForm();
          setShowForm(true);
        }} data-testid="button-add-contact">
          <Plus className="w-4 h-4 mr-2" /> Add Person
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="mb-8 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search people..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-lg p-4"
            data-testid="input-search-contacts"
          />
        </div>
        <Select value={relationFilter} onValueChange={setRelationFilter}>
          <SelectTrigger className="text-lg p-4" data-testid="select-relation-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Relations</SelectItem>
            <SelectItem value="family">Family</SelectItem>
            <SelectItem value="friend">Friends</SelectItem>
            <SelectItem value="doctor">Medical</SelectItem>
            <SelectItem value="neighbor">Neighbors</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Add Contact Form */}
      {showForm && (
        <Card className="mb-8" data-testid="card-add-contact">
          <CardHeader>
            <CardTitle>{editingContact ? 'Edit Person' : 'Add New Person'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="John Smith"
                    required
                    data-testid="input-contact-name"
                  />
                </div>
                <div>
                  <Label htmlFor="relation">Relationship</Label>
                  <Select
                    value={formData.relation ?? ''}
                    onValueChange={(value) => handleInputChange('relation', value)}
                    required
                  >
                    <SelectTrigger data-testid="select-contact-relation">
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daughter">Daughter</SelectItem>
                      <SelectItem value="son">Son</SelectItem>
                      <SelectItem value="spouse">Spouse</SelectItem>
                      <SelectItem value="doctor">Doctor</SelectItem>
                      <SelectItem value="friend">Friend</SelectItem>
                      <SelectItem value="neighbor">Neighbor</SelectItem>
                      <SelectItem value="caregiver">Caregiver</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Custom Relationship Input */}
              {formData.relation === 'custom' && (
                <div>
                  <Label htmlFor="customRelation">Custom Relationship</Label>
                  <Input
                    id="customRelation"
                    value={formData.customRelation}
                    onChange={(e) => handleInputChange('customRelation', e.target.value)}
                    placeholder="Enter relationship (e.g., Cousin, Therapist, etc.)"
                    required
                    data-testid="input-custom-relation"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    data-testid="input-contact-phone"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="john@email.com"
                    data-testid="input-contact-email"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="photo">Photo</Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  data-testid="input-contact-photo"
                />
              </div>

              <div className="flex space-x-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-contact">
                  {editingContact 
                    ? (updateMutation.isPending ? 'Updating...' : 'Update Person')
                    : (createMutation.isPending ? 'Adding...' : 'Add Person')
                  }
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} data-testid="button-cancel-contact">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContacts.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="py-8 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">
                  {searchTerm || relationFilter !== 'all' ? 'No contacts found' : 'No contacts added'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || relationFilter !== 'all'
                    ? 'Try adjusting your search or filter'
                    : 'Add your first contact to get started'}
                </p>
                {!searchTerm && relationFilter === 'all' && (
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Person
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredContacts.map((contact: any) => (
            <Card key={contact.id} className="hover:shadow-lg transition-shadow" data-testid={`contact-card-${contact.id}`}>
              <CardContent className="p-6">
                <div className="text-center mb-4">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden bg-secondary flex items-center justify-center">
                    {contact.photo_path ? (
                      <img
                        src={`${import.meta.env.VITE_API_BASE || 'http://localhost:5000'}${contact.photo_path}`}
                        alt={`${contact.name} portrait`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="w-12 h-12 text-secondary-foreground" />
                    )}
                  </div>
                  <h3 className="text-2xl font-semibold text-card-foreground" data-testid={`contact-name-${contact.id}`}>
                    {contact.name}
                  </h3>
                  <span className="inline-block px-3 py-1 bg-accent text-accent-foreground rounded-full text-sm font-medium">
                    {contact.relation}
                  </span>
                </div>

                <div className="space-y-3 mb-6">
                  {contact.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="text-primary w-4 h-4" />
                      <span className="text-muted-foreground">{contact.phone}</span>
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex items-center space-x-3">
                      <Mail className="text-primary w-4 h-4" />
                      <span className="text-muted-foreground">{contact.email}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-3">
                    <Calendar className="text-primary w-4 h-4" />
                    <span className="text-muted-foreground">
                      Added {new Date(contact.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex space-x-2">
                    {contact.phone && (
                      <Button className="flex-1" onClick={() => window.open(`tel:${contact.phone}`)} data-testid={`button-call-${contact.id}`}>
                        <Phone className="w-4 h-4 mr-2" /> Call
                      </Button>
                    )}
                    {contact.email && (
                      <Button className="flex-1" variant="secondary" onClick={() => window.open(`mailto:${contact.email}`)} data-testid={`button-email-${contact.id}`}>
                        <Mail className="w-4 h-4 mr-2" /> Email
                      </Button>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      className="flex-1" 
                      variant="outline" 
                      onClick={() => startEdit(contact)}
                      data-testid={`button-edit-${contact.id}`}
                    >
                      <Edit className="w-4 h-4 mr-2" /> Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          className="flex-1" 
                          variant="destructive" 
                          data-testid={`button-delete-${contact.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {contact.name}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteMutation.mutate(contact.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
