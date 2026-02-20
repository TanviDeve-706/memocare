import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Brain, Pill, TrendingUp, Award } from 'lucide-react';

export default function PerformanceAnalysis() {
  // Fetch quiz scores
  const { data: quizScores = [] } = useQuery({
    queryKey: ['quiz-scores'],
    queryFn: () => api('/api/performance/quiz-scores'),
  });

  // Fetch medication logs
  const { data: medicationLogs = [] } = useQuery({
    queryKey: ['medication-performance'],
    queryFn: () => api('/api/performance/medication-logs'),
  });

  // Fetch memory game scores
  const { data: memoryGameScores = [] } = useQuery({
    queryKey: ['memory-game-scores'],
    queryFn: () => api('/api/performance/memory-game-scores'),
  });

  // Process quiz data for charts
  const quizChartData = quizScores.map((score: any, index: number) => ({
    session: `Quiz ${index + 1}`,
    percentage: score.percentage,
    score: score.score,
    total: score.total_questions,
    date: new Date(score.completed_at).toLocaleDateString(),
  }));

  // Calculate medication compliance
  const medicationStats = medicationLogs.reduce((acc: any, log: any) => {
    acc[log.status] = (acc[log.status] || 0) + 1;
    return acc;
  }, {});

  const medicationPieData = [
    { name: 'Taken', value: medicationStats.taken || 0, color: '#10b981' },
    { name: 'Missed', value: medicationStats.missed || 0, color: '#ef4444' },
  ];

  const medicationComplianceRate = medicationStats.taken && medicationLogs.length > 0
    ? ((medicationStats.taken / medicationLogs.length) * 100).toFixed(1)
    : 0;

  // Recent medication logs for timeline
  const recentMedicationLogs = medicationLogs.slice(0, 10).reverse();

  // Calculate average quiz score
  const averageQuizScore = quizScores.length > 0
    ? (quizScores.reduce((acc: number, score: any) => acc + score.percentage, 0) / quizScores.length).toFixed(1)
    : 0;

  // Process memory game data for charts
  const memoryGameChartData = memoryGameScores.map((score: any, index: number) => ({
    session: `Game ${index + 1}`,
    percentage: score.percentage,
    score: score.score,
    maxScore: score.max_score,
    date: new Date(score.completed_at).toLocaleDateString(),
    gameType: score.game_type,
  }));

  // Calculate average memory game score
  const averageMemoryGameScore = memoryGameScores.length > 0
    ? (memoryGameScores.reduce((acc: number, score: any) => acc + score.percentage, 0) / memoryGameScores.length).toFixed(1)
    : 0;

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-8 h-8 text-primary" />
        <h2 className="text-4xl font-semibold">Performance Analysis</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quiz Performance</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-quiz-score">{averageQuizScore}%</div>
            <p className="text-xs text-muted-foreground">Average score from {quizScores.length} quizzes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Games</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-memory-score">{averageMemoryGameScore}%</div>
            <p className="text-xs text-muted-foreground">Average from {memoryGameScores.length} games</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medication Compliance</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-med-compliance">{medicationComplianceRate}%</div>
            <p className="text-xs text-muted-foreground">
              {medicationStats.taken || 0} taken, {medicationStats.missed || 0} missed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{medicationLogs.length + quizScores.length + memoryGameScores.length}</div>
            <p className="text-xs text-muted-foreground">All tracked activities</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quiz Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Quiz Performance Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {quizChartData.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No quiz data available yet</p>
                <p className="text-sm">Complete quizzes in the Games section to see your progress</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={quizChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="session" />
                  <YAxis domain={[0, 100]} label={{ value: 'Score %', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-semibold">{data.session}</p>
                            <p className="text-sm">Score: {data.score}/{data.total}</p>
                            <p className="text-sm">Percentage: {data.percentage}%</p>
                            <p className="text-xs text-muted-foreground">{data.date}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="percentage" stroke="#8b5cf6" strokeWidth={2} name="Score %" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Memory Games Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Memory Games Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {memoryGameChartData.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Award className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No memory game data yet</p>
                <p className="text-sm">Play Memory Match or Pattern Recall to track progress</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={memoryGameChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="session" />
                  <YAxis domain={[0, 100]} label={{ value: 'Score %', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-semibold">{data.gameType}</p>
                            <p className="text-sm">Score: {data.score}/{data.maxScore}</p>
                            <p className="text-sm">Percentage: {data.percentage}%</p>
                            <p className="text-xs text-muted-foreground">{data.date}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="percentage" stroke="#10b981" strokeWidth={2} name="Score %" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Medication Compliance */}
        <Card>
          <CardHeader>
            <CardTitle>Medication Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            {medicationLogs.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Pill className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No medication data available yet</p>
                <p className="text-sm">Track your medications to see compliance statistics</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={medicationPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {medicationPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Medication Logs Table */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent Medication Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {medicationLogs.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No medication logs yet</p>
          ) : (
            <div className="space-y-2">
              {recentMedicationLogs.map((log: any, index: number) => (
                <div 
                  key={log.id || index} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                  data-testid={`log-medication-${log.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Pill className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{log.medication_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(log.taken_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={log.status === 'taken' ? 'default' : 'destructive'}
                    data-testid={`badge-status-${log.id}`}
                  >
                    {log.status === 'taken' ? 'Taken' : 'Missed'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quiz History Table */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Quiz History</CardTitle>
        </CardHeader>
        <CardContent>
          {quizScores.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No quiz history yet</p>
          ) : (
            <div className="space-y-2">
              {quizScores.map((score: any, index: number) => (
                <div 
                  key={score.id || index} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                  data-testid={`log-quiz-${score.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Brain className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Quiz Session #{quizScores.length - index}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(score.completed_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{score.percentage}%</p>
                    <p className="text-xs text-muted-foreground">{score.score}/{score.total_questions} correct</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Memory Games History Table */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Memory Games History</CardTitle>
        </CardHeader>
        <CardContent>
          {memoryGameScores.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No memory game history yet</p>
          ) : (
            <div className="space-y-2">
              {memoryGameScores.map((score: any, index: number) => (
                <div 
                  key={score.id || index} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                  data-testid={`log-memory-game-${score.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{score.game_type}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(score.completed_at).toLocaleString()}
                        {score.time_taken && ` • ${score.time_taken}s`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{score.percentage}%</p>
                    <p className="text-xs text-muted-foreground">{score.score}/{score.max_score} points</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
