import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { emergencyApi, contactsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Phone, MapPin, Clock, Check, Users, Plus, X, Mail } from 'lucide-react';

export default function Emergency() {
  const [isTriggering, setIsTriggering] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    relation: '',
    phone: '',
    email: '',
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: emergencyAlerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['emergency'],
    queryFn: emergencyApi.list,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: contactsApi.list,
  });

  const triggerEmergencyMutation = useMutation({
    mutationFn: (locationData?: { lat: number; lng: number }) => 
      emergencyApi.trigger(locationData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency'] });
      setIsTriggering(false);
      toast({
        title: 'Emergency Alert Sent',
        description: 'Your emergency contacts have been notified.',
        variant: 'destructive',
      });
    },
  });

  const resolveEmergencyMutation = useMutation({
    mutationFn: (id: number) => emergencyApi.resolve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency'] });
      toast({ title: 'Emergency alert resolved' });
    },
  });

  const addContactMutation = useMutation({
    mutationFn: (contactData: typeof newContact) => {
      const formData = new FormData();
      formData.append('name', contactData.name);
      formData.append('relation', contactData.relation);
      formData.append('phone', contactData.phone);
      formData.append('email', contactData.email);
      return contactsApi.create(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setShowAddForm(false);
      setNewContact({ name: '', relation: '', phone: '', email: '' });
      toast({ title: 'Emergency contact added successfully' });
    },
    onError: () => {
      toast({
        title: 'Failed to add emergency contact',
        description: 'Please try again',
        variant: 'destructive'
      });
    },
  });

  const removeContactMutation = useMutation({
    mutationFn: (id: number) => contactsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({ title: 'Emergency contact removed successfully' });
    },
    onError: () => {
      toast({
        title: 'Failed to remove emergency contact',
        description: 'Please try again',
        variant: 'destructive'
      });
    },
  });

  const handleEmergencyTrigger = () => {
    setIsTriggering(true);
    
    // Try to get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          triggerEmergencyMutation.mutate({ lat: latitude, lng: longitude });
        },
        (error) => {
          // If location fails, trigger without location
          console.warn('Location access failed:', error);
          triggerEmergencyMutation.mutate(undefined);
        },
        { timeout: 5000, enableHighAccuracy: false } // Quick timeout for emergency
      );
    } else {
      // If geolocation not supported, trigger without location
      triggerEmergencyMutation.mutate(undefined);
    }
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name || !newContact.relation) {
      toast({
        title: 'Missing information',
        description: 'Please enter at least a name and relationship',
        variant: 'destructive'
      });
      return;
    }
    addContactMutation.mutate(newContact);
  };

  const handleRemoveContact = (contactId: number) => {
    removeContactMutation.mutate(contactId);
  };

  const emergencyContacts = contacts.filter((contact: any) => {
    const relation = contact.relation.toLowerCase();
    // Include traditional emergency relations and common custom relations
    return ['family', 'caregiver', 'doctor', 'daughter', 'son', 'spouse'].includes(relation) ||
           // Include other custom relations that indicate close relationships
           relation.includes('mother') || relation.includes('father') ||
           relation.includes('parent') || relation.includes('child') ||
           relation.includes('sibling') || relation.includes('brother') || relation.includes('sister') ||
           relation.includes('cousin') || relation.includes('aunt') || relation.includes('uncle') ||
           relation.includes('therapist') || relation.includes('nurse') || 
           relation.includes('caregiver') || relation.includes('guardian');
  });

  if (alertsLoading) {
    return <div className="p-8">Loading emergency information...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8 text-center">
        <h2 className="text-4xl font-semibold text-foreground mb-2" data-testid="emergency-title">
          Emergency Help
        </h2>
        <p className="text-xl text-muted-foreground">
          Get immediate assistance when you need it most
        </p>
      </div>

      {/* Emergency Trigger Section */}
      <Card className="mb-8 border-destructive/20" data-testid="card-emergency-trigger">
        <CardContent className="p-8 text-center">
          <div className="w-24 h-24 bg-destructive rounded-full mx-auto mb-6 flex items-center justify-center emergency-pulse">
            <AlertTriangle className="text-4xl text-destructive-foreground" />
          </div>
          
          <h3 className="text-3xl font-semibold text-card-foreground mb-4">
            Need Help?
          </h3>
          <p className="text-lg text-muted-foreground mb-8">
            Press the button below to immediately notify your emergency contacts and request assistance.
          </p>
          
          <Button
            size="lg"
            variant="destructive"
            onClick={handleEmergencyTrigger}
            disabled={isTriggering || triggerEmergencyMutation.isPending}
            className="text-xl px-12 py-6 emergency-pulse"
            data-testid="button-trigger-emergency"
          >
            {isTriggering || triggerEmergencyMutation.isPending ? (
              'Sending Alert...'
            ) : (
              <>
                <AlertTriangle className="w-6 h-6 mr-3" />
                Emergency Alert
              </>
            )}
          </Button>
          
          <p className="text-sm text-muted-foreground mt-4">
            This will send alerts to {emergencyContacts.length} emergency contact(s)
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Emergency Contacts */}
        <Card data-testid="card-emergency-contacts">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-6 h-6" />
                <span>Emergency Contacts</span>
              </div>
              <Button
                size="sm"
                onClick={() => setShowAddForm(true)}
                data-testid="button-add-emergency-contact"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {emergencyContacts.length === 0 ? (
              <div className="text-center py-8" data-testid="empty-emergency-contacts">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No emergency contacts</h3>
                <p className="text-muted-foreground mb-4">
                  Add family members, caregivers, or doctors as emergency contacts
                </p>
                <Button variant="outline" onClick={() => setLocation('/contacts')} data-testid="button-add-contacts">
                  Add Contacts
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {emergencyContacts.map((contact: any) => (
                  <div key={contact.id} className="p-4 border border-border rounded-lg" data-testid={`emergency-contact-${contact.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                          <Users className="w-6 h-6 text-secondary-foreground" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-card-foreground">{contact.name}</h4>
                          <p className="text-sm text-muted-foreground">{contact.relation}</p>
                          {contact.phone && (
                            <button 
                              onClick={() => window.open(`tel:${contact.phone}`)}
                              className="text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer"
                              data-testid={`link-phone-emergency-${contact.id}`}
                            >
                              {contact.phone}
                            </button>
                          )}
                          {contact.email && (
                            <button 
                              onClick={() => window.open(`mailto:${contact.email}`)}
                              className="text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer block"
                              data-testid={`link-email-emergency-${contact.id}`}
                            >
                              {contact.email}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {contact.phone && (
                          <Button
                            size="sm"
                            onClick={() => window.open(`tel:${contact.phone}`)}
                            data-testid={`button-call-emergency-${contact.id}`}
                          >
                            <Phone className="w-4 h-4 mr-1" />
                            Call
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              data-testid={`button-remove-emergency-${contact.id}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Emergency Contact</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {contact.name} from your emergency contacts? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveContact(contact.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Remove Contact
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emergency History */}
        <Card data-testid="card-emergency-history">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center space-x-2">
              <Clock className="w-6 h-6" />
              <span>Recent Alerts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {emergencyAlerts.length === 0 ? (
              <div className="text-center py-8" data-testid="empty-emergency-alerts">
                <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No emergency alerts</h3>
                <p className="text-muted-foreground">
                  Your emergency alert history will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {emergencyAlerts.slice(0, 10).map((alert: any) => (
                  <div key={alert.id} className="p-4 border border-border rounded-lg" data-testid={`alert-${alert.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${alert.resolved ? 'bg-accent' : 'bg-destructive'}`} />
                        <div>
                          <p className={`font-medium text-card-foreground ${alert.resolved ? 'line-through text-muted-foreground' : ''}`}>
                            Emergency alert triggered
                          </p>
                          <p className={`text-sm text-muted-foreground ${alert.resolved ? 'line-through' : ''}`}>
                            {new Date(alert.triggered_at).toLocaleString([], { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: false 
                            })}
                            {alert.resolved && alert.resolved_at && (
                              <span className="ml-2 text-xs text-accent">
                                • Resolved {new Date(alert.resolved_at).toLocaleString([], { 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: '2-digit', 
                                  minute: '2-digit',
                                  hour12: false 
                                })}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={alert.resolved ? 'default' : 'destructive'}>
                          {alert.resolved ? 'Resolved' : 'Active'}
                        </Badge>
                        {alert.resolved ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled
                            className="cursor-not-allowed opacity-50"
                            data-testid={`button-resolved-${alert.id}`}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Resolved
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveEmergencyMutation.mutate(alert.id)}
                            disabled={resolveEmergencyMutation.isPending}
                            data-testid={`button-resolve-${alert.id}`}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Emergency Contact Form */}
      {showAddForm && (
        <Card className="mt-8" data-testid="card-add-emergency-contact">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center justify-between">
              <span>Add Emergency Contact</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddForm(false)}
                data-testid="button-cancel-add-contact"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddContact} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact-name">Name *</Label>
                  <Input
                    id="contact-name"
                    value={newContact.name}
                    onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Full name"
                    required
                    data-testid="input-emergency-contact-name"
                  />
                </div>
                <div>
                  <Label htmlFor="contact-relation">Relationship *</Label>
                  <Select 
                    value={newContact.relation} 
                    onValueChange={(value) => setNewContact(prev => ({ ...prev, relation: value }))}
                    required
                  >
                    <SelectTrigger data-testid="select-emergency-contact-relation">
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="family">Family</SelectItem>
                      <SelectItem value="spouse">Spouse</SelectItem>
                      <SelectItem value="daughter">Daughter</SelectItem>
                      <SelectItem value="son">Son</SelectItem>
                      <SelectItem value="mother">Mother</SelectItem>
                      <SelectItem value="father">Father</SelectItem>
                      <SelectItem value="sibling">Sibling</SelectItem>
                      <SelectItem value="caregiver">Caregiver</SelectItem>
                      <SelectItem value="doctor">Doctor</SelectItem>
                      <SelectItem value="nurse">Nurse</SelectItem>
                      <SelectItem value="therapist">Therapist</SelectItem>
                      <SelectItem value="guardian">Guardian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact-phone">Phone</Label>
                  <Input
                    id="contact-phone"
                    type="tel"
                    value={newContact.phone}
                    onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                    data-testid="input-emergency-contact-phone"
                  />
                </div>
                <div>
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com"
                    data-testid="input-emergency-contact-email"
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <Button 
                  type="submit" 
                  disabled={addContactMutation.isPending}
                  data-testid="button-save-emergency-contact"
                >
                  {addContactMutation.isPending ? 'Adding...' : 'Add Emergency Contact'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddForm(false)}
                  data-testid="button-cancel-emergency-contact"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Emergency Information */}
      <Card className="mt-8" data-testid="card-emergency-info">
        <CardHeader>
          <CardTitle className="text-2xl">Emergency Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-muted rounded-lg">
              <Phone className="w-8 h-8 mx-auto mb-2 text-destructive" />
              <h4 className="font-semibold mb-1">Emergency Services</h4>
              <p className="text-sm text-muted-foreground mb-2">Call 112 for immediate help</p>
              <Button size="sm" variant="destructive" onClick={() => window.open('tel:112')}>
                Call 112
              </Button>
            </div>
            
            <div className="text-center p-4 bg-muted rounded-lg">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-primary" />
              <h4 className="font-semibold mb-1">Location Sharing</h4>
              <p className="text-sm text-muted-foreground mb-2">Your location is shared when alerts are sent</p>
              <Button size="sm" variant="outline" disabled>
                Auto-Enabled
              </Button>
            </div>
            
            <div className="text-center p-4 bg-muted rounded-lg">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-accent" />
              <h4 className="font-semibold mb-1">Alert System</h4>
              <p className="text-sm text-muted-foreground mb-2">Contacts notified via call, text, and app</p>
              <Button size="sm" variant="outline" disabled>
                Active
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
