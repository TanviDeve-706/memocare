import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { remindersApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Bell, Pill, Calendar, ListTodo, Trash2 } from 'lucide-react';

export default function Reminders() {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('');
  const [schedule, setSchedule] = useState('');
  const [customDateTime, setCustomDateTime] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: remindersApi.list,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => remindersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      setShowForm(false);
      setTitle('');
      setType('');
      setSchedule('');
      setCustomDateTime('');
      toast({ title: 'Reminder created successfully' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => remindersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast({ title: 'Reminder deleted' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => 
      remindersApi.update(id, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !type || !schedule) return;

    let nextRun: Date;
    let scheduleCron: string;

    if (schedule === 'custom') {
      if (!customDateTime) {
        toast({ title: 'Please select a custom date and time', variant: 'destructive' });
        return;
      }
      nextRun = new Date(customDateTime);
      if (nextRun <= new Date()) {
        toast({ title: 'Custom time must be in the future', variant: 'destructive' });
        return;
      }
      scheduleCron = 'once';
    } else {
      const now = new Date();
      if (schedule === 'hourly') {
        nextRun = new Date(now);
        nextRun.setHours(nextRun.getHours() + 1, 0, 0, 0);
        scheduleCron = '0 * * * *';
      } else if (schedule === 'daily') {
        nextRun = new Date(now);
        nextRun.setHours(9, 0, 0, 0);
        if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 1);
        scheduleCron = '0 9 * * *';
      } else if (schedule === 'weekly') {
        nextRun = new Date(now);
        nextRun.setHours(9, 0, 0, 0);
        const dayOfWeek = nextRun.getDay();
        const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
        if (dayOfWeek === 1 && nextRun <= now) nextRun.setDate(nextRun.getDate() + 7);
        else if (dayOfWeek !== 1) nextRun.setDate(nextRun.getDate() + daysUntilMonday);
        scheduleCron = '0 9 * * 1';
      } else {
        nextRun = new Date(now);
        nextRun.setDate(nextRun.getDate() + 1);
        scheduleCron = '0 9 * * *';
      }
    }

    createMutation.mutate({
      title,
      type,
      schedule_cron: scheduleCron,
      next_run_at: nextRun.toISOString(),
      active: true, // ✅ Make reminder active so scheduler picks it up
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'medication': return <Pill className="w-5 h-5" />;
      case 'appointment': return <Calendar className="w-5 h-5" />;
      case 'task': return <ListTodo className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  if (isLoading) return <div className="p-8">Loading reminders...</div>;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-semibold text-foreground mb-2">Reminders</h2>
          <p className="text-xl text-muted-foreground">Stay on top of your daily tasks and medications</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" /> Add Reminder
        </Button>
      </div>

      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create New Reminder</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Take morning medication" required />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={type} onValueChange={setType} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="medication">Medication</SelectItem>
                      <SelectItem value="meal">Meal</SelectItem>
                      <SelectItem value="appointment">Appointment</SelectItem>
                      <SelectItem value="task">Task</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="schedule">Schedule</Label>
                <Select value={schedule} onValueChange={setSchedule} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Every Hour</SelectItem>
                    <SelectItem value="daily">Daily at 9:00 AM</SelectItem>
                    <SelectItem value="weekly">Weekly (Monday 9:00 AM)</SelectItem>
                    <SelectItem value="custom">Custom Date & Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {schedule === 'custom' && (
                <div>
                  <Label htmlFor="customDateTime">Custom Date & Time</Label>
                  <Input
                    id="customDateTime"
                    type="datetime-local"
                    value={customDateTime}
                    onChange={(e) => setCustomDateTime(e.target.value)}
                    min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                    required
                  />
                </div>
              )}

              <div className="flex space-x-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Reminder'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {reminders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No reminders yet</h3>
              <p className="text-muted-foreground mb-4">Create your first reminder to stay organized</p>
              <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" />Add Reminder</Button>
            </CardContent>
          </Card>
        ) : (
          reminders.map((reminder: any) => (
            <Card key={reminder.id}>
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full">{getTypeIcon(reminder.type)}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-card-foreground">{reminder.title}</h3>
                    <p className="text-muted-foreground">
                      {reminder.type} • Next: {new Date(reminder.next_run_at).toLocaleString([], {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit', hour12: false
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`active-${reminder.id}`}>Active</Label>
                    <Switch
                      id={`active-${reminder.id}`}
                      checked={reminder.active}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: reminder.id, active: checked })}
                    />
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(reminder.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
