import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { routinesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Plus, List, Check, X, Edit } from 'lucide-react';

export default function Routines() {
  const [showRoutineForm, setShowRoutineForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState<number | null>(null);
  const [routineData, setRoutineData] = useState({
    title: '',
    description: '',
  });
  const [taskData, setTaskData] = useState<{ [routineId: number]: { title: string } }>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: routines = [], isLoading } = useQuery({
    queryKey: ['routines'],
    queryFn: routinesApi.list,
  });

  const createRoutineMutation = useMutation({
    mutationFn: (data: any) => routinesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      setShowRoutineForm(false);
      setRoutineData({ title: '', description: '' });
      toast({ title: 'Routine created successfully' });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: ({ routineId, task }: { routineId: number; task: any }) =>
      routinesApi.createTask(routineId, task),
    onSuccess: (_, { routineId }) => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      queryClient.invalidateQueries({ queryKey: ['routine-tasks', routineId] });
      setShowTaskForm(null);
      setTaskData(prev => ({ ...prev, [routineId]: { title: '' } }));
      toast({ title: 'Task added successfully' });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, updates, routineId }: { taskId: number; updates: any; routineId: number }) =>
      routinesApi.updateTask(taskId, updates),
    onMutate: async ({ taskId, updates, routineId }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['routine-tasks', routineId] });
      
      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData(['routine-tasks', routineId]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['routine-tasks', routineId], (old: any) => {
        if (!old) return old;
        return old.map((task: any) => 
          task.id === taskId ? { ...task, ...updates } : task
        );
      });
      
      // Return a context object with the snapshotted value
      return { previousTasks, routineId };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTasks) {
        queryClient.setQueryData(['routine-tasks', context.routineId], context.previousTasks);
      }
    },
    onSettled: (_, __, { routineId }) => {
      // Always refetch after error or success to ensure data is consistent
      queryClient.invalidateQueries({ queryKey: ['routine-tasks', routineId] });
      queryClient.invalidateQueries({ queryKey: ['routines'] });
    },
  });

  // Fetch tasks for each routine
  const useRoutineTasks = (routineId: number) => {
    return useQuery({
      queryKey: ['routine-tasks', routineId],
      queryFn: () => routinesApi.tasks(routineId),
    });
  };

  const handleCreateRoutine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineData.title) return;
    createRoutineMutation.mutate(routineData);
  };

  const handleCreateTask = (routineId: number) => (e: React.FormEvent) => {
    e.preventDefault();
    const currentTaskData = taskData[routineId] || { title: '' };
    if (!currentTaskData.title) return;
    createTaskMutation.mutate({ routineId, task: currentTaskData });
  };

  const toggleTask = (taskId: number, done: boolean, routineId: number) => {
    updateTaskMutation.mutate({ taskId, updates: { done }, routineId });
  };

  if (isLoading) {
    return <div className="p-8">Loading routines...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-semibold text-foreground mb-2" data-testid="routines-title">
            Routines & Tasks
          </h2>
          <p className="text-xl text-muted-foreground">
            Organize your daily activities with structured routines
          </p>
        </div>
        <Button 
          onClick={() => setShowRoutineForm(!showRoutineForm)}
          data-testid="button-add-routine"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Routine
        </Button>
      </div>

      {/* Add Routine Form */}
      {showRoutineForm && (
        <Card className="mb-8" data-testid="card-add-routine">
          <CardHeader>
            <CardTitle>Create New Routine</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateRoutine} className="space-y-4">
              <div>
                <Label htmlFor="title">Routine Title</Label>
                <Input
                  id="title"
                  value={routineData.title}
                  onChange={(e) => setRoutineData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Morning routine, Evening checklist, etc."
                  required
                  data-testid="input-routine-title"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={routineData.description}
                  onChange={(e) => setRoutineData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description of this routine"
                  data-testid="textarea-routine-description"
                />
              </div>
              <div className="flex space-x-2">
                <Button 
                  type="submit" 
                  disabled={createRoutineMutation.isPending}
                  data-testid="button-save-routine"
                >
                  {createRoutineMutation.isPending ? 'Creating...' : 'Create Routine'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowRoutineForm(false)}
                  data-testid="button-cancel-routine"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Routines List */}
      <div className="space-y-6">
        {routines.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center" data-testid="empty-routines">
                <List className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No routines created</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first routine to organize your daily activities
                </p>
                <Button onClick={() => setShowRoutineForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Routine
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          routines.map((routine: any) => <RoutineCard key={routine.id} routine={routine} />)
        )}
      </div>
    </div>
  );

  function RoutineCard({ routine }: { routine: any }) {
    const { data: tasks = [] } = useRoutineTasks(routine.id);
    const completedTasks = tasks.filter((task: any) => task.done).length;
    const progressPercentage = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
    const taskInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (showTaskForm === routine.id && taskInputRef.current) {
        taskInputRef.current.focus();
      }
    }, [showTaskForm, routine.id]);

    return (
      <Card data-testid={`routine-card-${routine.id}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl">{routine.title}</CardTitle>
              {routine.description && (
                <p className="text-muted-foreground mt-1">{routine.description}</p>
              )}
              {tasks.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{completedTasks}/{tasks.length} completed</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>
              )}
            </div>
            <div className="text-right ml-4">
              <div className="text-2xl font-semibold text-primary">
                {Math.round(progressPercentage)}%
              </div>
              <div className="text-sm text-muted-foreground">Complete</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Task List */}
          <div className="space-y-3 mb-4">
            {tasks.length === 0 ? (
              <p className="text-muted-foreground italic" data-testid={`empty-tasks-${routine.id}`}>
                No tasks added yet
              </p>
            ) : (
              tasks.map((task: any) => (
                <div 
                  key={task.id} 
                  className="flex items-center space-x-3 p-3 bg-muted rounded-lg"
                  data-testid={`task-${task.id}`}
                >
                  <Checkbox
                    checked={task.done}
                    onCheckedChange={(checked) => toggleTask(task.id, !!checked, routine.id)}
                    data-testid={`checkbox-task-${task.id}`}
                  />
                  <span 
                    className={`flex-1 text-lg ${
                      task.done ? 'line-through text-muted-foreground' : 'text-card-foreground'
                    }`}
                  >
                    {task.title}
                  </span>
                  {task.done && (
                    <Check className="w-5 h-5 text-accent" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add Task Form */}
          {showTaskForm === routine.id ? (
            <form onSubmit={handleCreateTask(routine.id)} className="flex space-x-2">
              <Input
                ref={taskInputRef}
                value={taskData[routine.id]?.title || ''}
                onChange={(e) => setTaskData(prev => ({ 
                  ...prev, 
                  [routine.id]: { title: e.target.value } 
                }))}
                placeholder="Enter task title"
                required
                data-testid={`input-task-${routine.id}`}
              />
              <Button 
                type="submit" 
                size="sm" 
                disabled={createTaskMutation.isPending}
                data-testid={`button-save-task-${routine.id}`}
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button 
                type="button" 
                size="sm" 
                variant="outline"
                onClick={() => setShowTaskForm(null)}
                data-testid={`button-cancel-task-${routine.id}`}
              >
                <X className="w-4 h-4" />
              </Button>
            </form>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowTaskForm(routine.id)}
              data-testid={`button-add-task-${routine.id}`}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }
}
