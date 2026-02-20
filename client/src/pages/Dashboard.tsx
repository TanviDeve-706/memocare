import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useAuthContext } from '@/context/AuthContext';
import { remindersApi, medicationsApi, journalApi, memoryApi, emergencyApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Brain, 
  Plus, 
  AlertTriangle, 
  Bell,
  Check, 
  X,
  Clock,
  Phone,
  Edit
} from 'lucide-react';

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reminders = [] } = useQuery({
    queryKey: ['reminders'],
    queryFn: remindersApi.list,
  });

  const { data: medications = [] } = useQuery({
    queryKey: ['medications'],
    queryFn: medicationsApi.list,
  });

  const { data: journalEntries = [] } = useQuery({
    queryKey: ['journal'],
    queryFn: journalApi.list,
  });

  const { data: memoryItems = [] } = useQuery({
    queryKey: ['memory'],
    queryFn: memoryApi.list,
  });

  const emergencyMutation = useMutation({
    mutationFn: () => emergencyApi.trigger(),
    onSuccess: () => {
      toast({
        title: 'Emergency Alert Sent',
        description: 'Your emergency contacts have been notified.',
        variant: 'destructive',
      });
      queryClient.invalidateQueries({ queryKey: ['emergency'] });
    },
  });

  const logDoseMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'taken' | 'missed' }) =>
      medicationsApi.logDose(id, status, new Date().toISOString()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      toast({ title: 'Dose logged successfully' });
    },
  });

  const todayReminders = reminders.filter((r: any) => r.active).slice(0, 3);
  const recentJournal = journalEntries.slice(0, 3);
  const recentMemories = memoryItems.slice(0, 5);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-4xl font-semibold text-foreground mb-2" data-testid="welcome-title">
          Welcome back, {user?.name || 'User'}!
        </h2>
        <p className="text-xl text-muted-foreground" data-testid="current-date">
          Today is {new Date().toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Button
          onClick={() => setLocation('/games')}
          className="p-6 bg-accent text-accent-foreground rounded-xl shadow-lg hover:shadow-xl transition-shadow h-auto flex flex-col space-y-3"
          data-testid="button-daily-quiz"
        >
          <Brain className="text-3xl" />
          <div className="text-center">
            <h3 className="text-xl font-semibold">Daily Memory Quiz</h3>
            <p className="text-accent-foreground/80">Test your memory with today's questions</p>
          </div>
        </Button>

        <Button
          onClick={() => setLocation('/journal')}
          className="p-6 bg-primary text-primary-foreground rounded-xl shadow-lg hover:shadow-xl transition-shadow h-auto flex flex-col space-y-3"
          data-testid="button-add-journal"
        >
          <Plus className="text-3xl" />
          <div className="text-center">
            <h3 className="text-xl font-semibold">Add Journal Entry</h3>
            <p className="text-primary-foreground/80">Record your thoughts and memories</p>
          </div>
        </Button>

        <Button
          onClick={() => emergencyMutation.mutate()}
          className="p-6 bg-destructive text-destructive-foreground rounded-xl shadow-lg hover:shadow-xl transition-shadow emergency-pulse h-auto flex flex-col space-y-3"
          disabled={emergencyMutation.isPending}
          data-testid="button-emergency"
        >
          <AlertTriangle className="text-3xl" />
          <div className="text-center">
            <h3 className="text-xl font-semibold">Emergency Help</h3>
            <p className="text-destructive-foreground/80">Get immediate assistance</p>
          </div>
        </Button>
      </div>

      {/* Today's Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today's Reminders */}
        <Card data-testid="card-reminders">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Today's Reminders</CardTitle>
              <Badge variant="secondary" data-testid="badge-pending-reminders">
                {todayReminders.length} pending
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayReminders.length === 0 ? (
                <p className="text-muted-foreground" data-testid="text-no-reminders">No reminders for today</p>
              ) : (
                todayReminders.map((reminder: any) => (
                  <div key={reminder.id} className="flex items-center p-3 bg-muted rounded-lg" data-testid={`reminder-${reminder.id}`}>
                    <div className="w-3 h-3 bg-accent rounded-full mr-4"></div>
                    <div className="flex-1">
                      <p className="font-medium text-card-foreground">{reminder.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {reminder.type} • {new Date(reminder.next_run_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <Button size="sm" data-testid={`button-complete-reminder-${reminder.id}`}>
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
            
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => setLocation('/reminders')}
              data-testid="button-add-reminder"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Reminder
            </Button>
          </CardContent>
        </Card>

        {/* Medication Tracker */}
        <Card data-testid="card-medications">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Medication Tracker</CardTitle>
              <Badge variant="default" data-testid="badge-medication-status">On track</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {medications.length === 0 ? (
                <p className="text-muted-foreground" data-testid="text-no-medications">No medications added</p>
              ) : (
                medications.slice(0, 2).map((med: any) => (
                  <div key={med.id} className="p-4 border border-border rounded-lg" data-testid={`medication-${med.id}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-card-foreground">{med.name}</h4>
                      <span className="text-sm text-muted-foreground">{med.dosage}</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {[...Array(7)].map((_, index) => (
                        <div
                          key={index}
                          className="w-8 h-8 rounded bg-muted flex items-center justify-center"
                          data-testid={`medication-day-${index}`}
                        >
                          {index < 6 ? (
                            <Check className="w-3 h-3 text-accent" />
                          ) : (
                            <span className="text-xs text-muted-foreground">T</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Memory Wall Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Recent Journal Entries */}
        <Card data-testid="card-journal">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Recent Journal Entries</CardTitle>
              <Button variant="link" onClick={() => setLocation('/journal')} data-testid="button-view-journal">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentJournal.length === 0 ? (
                <p className="text-muted-foreground" data-testid="text-no-journal">No journal entries yet</p>
              ) : (
                recentJournal.map((entry: any) => (
                  <div key={entry.id} className="p-4 bg-muted rounded-lg" data-testid={`journal-entry-${entry.id}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </span>
                      <Badge variant="outline">{entry.type}</Badge>
                    </div>
                    <p className="text-card-foreground line-clamp-2">
                      {entry.content_text || 'Voice entry'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Memory Wall Preview */}
        <Card data-testid="card-memory-wall">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Memory Wall</CardTitle>
              <Button variant="link" onClick={() => setLocation('/memory')} data-testid="button-view-memory">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {recentMemories.map((memory: any) => (
                <div
                  key={memory.id}
                  className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer"
                  data-testid={`memory-item-${memory.id}`}
                  onClick={() => setLocation('/memory')}
                >
                  {memory.type === 'photo' ? (
                    <img 
                      src={memory.file_path} 
                      alt={memory.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                    <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <span className="text-white text-xs">{memory.title}</span>
                    </div>
                  )}
                  
                  {/* Fallback placeholders (hidden by default, shown on error) */}
                  <div className="absolute inset-0 bg-muted flex items-center justify-center hidden">
                    <span className="text-xs text-muted-foreground">{memory.title}</span>
                  </div>
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation('/memory');
                      }}
                      data-testid={`button-edit-memory-dashboard-${memory.id}`}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <Button
                variant="outline"
                className="aspect-square flex flex-col items-center justify-center"
                onClick={() => setLocation('/memory')}
                data-testid="button-add-memory"
              >
                <Plus className="w-6 h-6 mb-2" />
                <span className="text-xs">Add Memory</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
