import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { gamesApi } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Brain, Trophy, RotateCcw, Home, ArrowLeft, ArrowRight, Grid3x3, Zap } from 'lucide-react';

interface QuizQuestion {
  type: string;
  question: string;
  answer: string;
  options: string[];
}

type GameType = 'menu' | 'quiz' | 'memory-match' | 'pattern-recall';
type GameState = GameType | 'quiz-playing' | 'quiz-results' | 'match-playing' | 'match-results' | 'pattern-playing' | 'pattern-results';

export default function Games() {
  const [gameState, setGameState] = useState<GameState>('menu');
  
  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [quizScore, setQuizScore] = useState(0);
  const [timeStarted, setTimeStarted] = useState<Date | null>(null);
  
  // Memory Match state
  const [matchCards, setMatchCards] = useState<Array<{id: number, value: string, flipped: boolean, matched: boolean}>>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchMoves, setMatchMoves] = useState(0);
  const [matchScore, setMatchScore] = useState(0);
  
  // Pattern Recall state
  const [patternSequence, setPatternSequence] = useState<number[]>([]);
  const [playerSequence, setPlayerSequence] = useState<number[]>([]);
  const [patternLevel, setPatternLevel] = useState(1);
  const [isShowingPattern, setIsShowingPattern] = useState(false);
  const [patternScore, setPatternScore] = useState(0);
  const [highlightedCell, setHighlightedCell] = useState<number | null>(null);
  
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['quiz-questions'],
    queryFn: async () => await gamesApi.getQuiz(),
    enabled: false,
  });

  const questions: QuizQuestion[] = data || [];
  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  const saveQuizScoreMutation = useMutation({
    mutationFn: async (scoreData: { score: number; total_questions: number; percentage: number }) => {
      return await fetch('/api/performance/quiz-scores', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scoreData),
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/performance/quiz-scores'] });
    },
  });

  const saveMemoryGameScoreMutation = useMutation({
    mutationFn: async (scoreData: { game_type: string; score: number; max_score: number; time_taken?: number; percentage: number }) => {
      return await fetch('/api/performance/memory-game-scores', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scoreData),
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/performance/memory-game-scores'] });
    },
  });

  // Quiz functions
  const startQuiz = () => {
    setGameState('quiz-playing');
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setCurrentAnswer('');
    setQuizScore(0);
    setTimeStarted(new Date());
    refetch();
  };

  const selectAnswer = (answer: string) => setCurrentAnswer(answer);

  const nextQuestion = () => {
    const newAnswers = [...selectedAnswers, currentAnswer];
    setSelectedAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setCurrentAnswer('');
    } else {
      let finalScore = 0;
      questions.forEach((q, idx) => {
        if (newAnswers[idx]?.toLowerCase() === q.answer.toLowerCase()) finalScore++;
      });
      setQuizScore(finalScore);

      const percentage = (finalScore / questions.length) * 100;
      saveQuizScoreMutation.mutate({ score: finalScore, total_questions: questions.length, percentage });
      setGameState('quiz-results');
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setCurrentAnswer(selectedAnswers[currentQuestionIndex - 1] || '');
    }
  };

  // Memory Match functions
  const startMemoryMatch = () => {
    const emojis = ['🌟', '🎯', '🎨', '🎭', '🎪', '🎸', '🎺', '🎻'];
    const cards = [...emojis, ...emojis]
      .sort(() => Math.random() - 0.5)
      .map((value, id) => ({ id, value, flipped: false, matched: false }));
    
    setMatchCards(cards);
    setFlippedIndices([]);
    setMatchMoves(0);
    setMatchScore(0);
    setTimeStarted(new Date());
    setGameState('match-playing');
  };

  const handleCardClick = (index: number) => {
    if (flippedIndices.length >= 2 || matchCards[index].flipped || matchCards[index].matched) return;

    const newCards = [...matchCards];
    newCards[index].flipped = true;
    setMatchCards(newCards);
    
    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMatchMoves(matchMoves + 1);
      const [first, second] = newFlipped;
      
      if (newCards[first].value === newCards[second].value) {
        // Match found
        setTimeout(() => {
          newCards[first].matched = true;
          newCards[second].matched = true;
          setMatchCards(newCards);
          setFlippedIndices([]);
          
          const matchedCount = newCards.filter(c => c.matched).length / 2;
          setMatchScore(matchedCount);
          
          // Check if game complete
          if (matchedCount === 8) {
            const timeTaken = timeStarted ? Math.floor((Date.now() - timeStarted.getTime()) / 1000) : 0;
            const percentage = Math.max(0, 100 - (matchMoves * 2)); // Deduct points for moves
            saveMemoryGameScoreMutation.mutate({
              game_type: 'memory_match',
              score: matchedCount,
              max_score: 8,
              time_taken: timeTaken,
              percentage
            });
            setGameState('match-results');
          }
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          newCards[first].flipped = false;
          newCards[second].flipped = false;
          setMatchCards(newCards);
          setFlippedIndices([]);
        }, 1000);
      }
    }
  };

  // Pattern Recall functions
  const startPatternRecall = () => {
    setPatternLevel(1);
    setPatternScore(0);
    setPlayerSequence([]);
    setTimeStarted(new Date());
    setGameState('pattern-playing');
    generateNewPattern(1);
  };

  const generateNewPattern = (level: number) => {
    const length = Math.min(level + 2, 10);
    const pattern = Array.from({ length }, () => Math.floor(Math.random() * 9));
    setPatternSequence(pattern);
    setPlayerSequence([]);
    showPattern(pattern);
  };

  const showPattern = async (pattern: number[]) => {
    setIsShowingPattern(true);
    for (let i = 0; i < pattern.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setHighlightedCell(pattern[i]);
      await new Promise(resolve => setTimeout(resolve, 600));
      setHighlightedCell(null);
    }
    setIsShowingPattern(false);
  };

  const handleCellClick = (cellIndex: number) => {
    if (isShowingPattern) return;

    const newPlayerSequence = [...playerSequence, cellIndex];
    setPlayerSequence(newPlayerSequence);

    // Check if player made a mistake
    if (patternSequence[newPlayerSequence.length - 1] !== cellIndex) {
      toast({
        title: 'Incorrect!',
        description: `You reached level ${patternLevel}`,
        variant: 'destructive',
      });
      const timeTaken = timeStarted ? Math.floor((Date.now() - timeStarted.getTime()) / 1000) : 0;
      const percentage = (patternScore / (patternLevel + 2)) * 100;
      saveMemoryGameScoreMutation.mutate({
        game_type: 'pattern_recall',
        score: patternScore,
        max_score: patternLevel + 2,
        time_taken: timeTaken,
        percentage
      });
      setGameState('pattern-results');
      return;
    }

    // Check if pattern complete
    if (newPlayerSequence.length === patternSequence.length) {
      const newScore = patternScore + patternSequence.length;
      setPatternScore(newScore);
      setPatternLevel(patternLevel + 1);
      
      toast({
        title: 'Correct!',
        description: `Level ${patternLevel} complete! Moving to level ${patternLevel + 1}`,
      });
      
      setTimeout(() => {
        generateNewPattern(patternLevel + 1);
      }, 1500);
    }
  };

  const backToMenu = () => setGameState('menu');

  const getTimeTaken = () => {
    if (!timeStarted) return '0:00';
    const seconds = Math.floor((Date.now() - timeStarted.getTime()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isLoading && gameState === 'quiz-playing') {
    return (
      <div className="p-8">
        <div className="text-center">Loading quiz questions...</div>
      </div>
    );
  }

  if (gameState === 'quiz-playing' && !currentQuestion) {
    return (
      <div className="p-8">
        <div className="text-center">No questions available.</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Main Menu */}
        {gameState === 'menu' && (
          <div>
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-semibold text-foreground mb-4">Memory Games</h2>
              <p className="text-xl text-muted-foreground">Exercise your mind with fun memory challenges</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Quiz Card */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={startQuiz}>
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-8 h-8 text-accent-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Daily Quiz</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Answer questions about your contacts, medications, journal entries, and memories
                  </p>
                  <Button className="w-full">Start Quiz</Button>
                </CardContent>
              </Card>

              {/* Memory Match Card */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={startMemoryMatch}>
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Grid3x3 className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Memory Match</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Find matching pairs of cards by remembering their locations
                  </p>
                  <Button className="w-full">Play Game</Button>
                </CardContent>
              </Card>

              {/* Pattern Recall Card */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={startPatternRecall}>
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-secondary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Pattern Recall</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Watch and repeat increasingly complex pattern sequences
                  </p>
                  <Button className="w-full">Play Game</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Quiz Game */}
        {gameState === 'quiz-playing' && currentQuestion && (
          <div>
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-semibold">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </h3>
                  <div className="flex space-x-2">
                    {questions.map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-4 h-4 rounded-full ${
                          idx < currentQuestionIndex ? 'bg-accent' : idx === currentQuestionIndex ? 'bg-primary' : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <Progress value={progress} className="h-3" />
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardContent className="p-8 text-center">
                <div className="text-center mb-8">
                  <div className="w-32 h-32 mx-auto mb-6 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                    <Brain className="w-16 h-16 text-muted-foreground" />
                  </div>
                  <h3 className="text-3xl font-semibold text-card-foreground mb-4">{currentQuestion.question}</h3>
                  <p className="text-lg text-muted-foreground">Select the correct answer</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {currentQuestion.options.map((option, idx) => (
                    <Button
                      key={idx}
                      variant={currentAnswer === option ? 'default' : 'outline'}
                      className="p-6 text-left h-auto justify-start"
                      onClick={() => selectAnswer(option)}
                    >
                      <span className="text-xl">{option}</span>
                    </Button>
                  ))}
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={previousQuestion} disabled={currentQuestionIndex === 0}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Previous
                  </Button>
                  <Button onClick={nextQuestion} disabled={!currentAnswer}>
                    {currentQuestionIndex === questions.length - 1 ? 'Finish' : 'Next'} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {gameState === 'quiz-results' && (
          <div>
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-semibold text-foreground mb-4">Quiz Complete!</h2>
              <p className="text-xl text-muted-foreground">Here are your results</p>
            </div>

            <Card className="max-w-2xl mx-auto text-center">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="text-2xl text-accent-foreground" />
                </div>
                <h3 className="text-2xl font-semibold text-card-foreground mb-2">Great job!</h3>
                <p className="text-lg text-muted-foreground mb-6">
                  You answered {quizScore} out of {questions.length} questions correctly
                </p>
                <div className="flex space-x-4 justify-center">
                  <Button onClick={startQuiz}>
                    <RotateCcw className="w-4 h-4 mr-2" /> Try Again
                  </Button>
                  <Button variant="outline" onClick={backToMenu}>
                    <Home className="w-4 h-4 mr-2" /> Back to Menu
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Memory Match Game */}
        {gameState === 'match-playing' && (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-3xl font-semibold">Memory Match</h2>
              <div className="text-right">
                <p className="text-lg">Moves: {matchMoves}</p>
                <p className="text-lg">Matched: {matchScore}/8</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 max-w-2xl mx-auto mb-6">
              {matchCards.map((card, index) => (
                <Card
                  key={card.id}
                  className={`h-24 flex items-center justify-center text-4xl cursor-pointer transition-all ${
                    card.matched ? 'bg-green-100 dark:bg-green-900' : card.flipped ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                  onClick={() => handleCardClick(index)}
                >
                  <CardContent className="p-0">
                    {card.flipped || card.matched ? card.value : '❓'}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <Button variant="outline" onClick={backToMenu}>
                <Home className="w-4 h-4 mr-2" /> Back to Menu
              </Button>
            </div>
          </div>
        )}

        {gameState === 'match-results' && (
          <div>
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-semibold text-foreground mb-4">Match Complete!</h2>
            </div>

            <Card className="max-w-2xl mx-auto text-center">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="text-2xl text-accent-foreground" />
                </div>
                <h3 className="text-2xl font-semibold text-card-foreground mb-2">Excellent!</h3>
                <p className="text-lg text-muted-foreground mb-2">
                  You matched all pairs in {matchMoves} moves
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Time: {getTimeTaken()}
                </p>
                <div className="flex space-x-4 justify-center">
                  <Button onClick={startMemoryMatch}>
                    <RotateCcw className="w-4 h-4 mr-2" /> Play Again
                  </Button>
                  <Button variant="outline" onClick={backToMenu}>
                    <Home className="w-4 h-4 mr-2" /> Back to Menu
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pattern Recall Game */}
        {gameState === 'pattern-playing' && (
          <div>
            <div className="mb-6 text-center">
              <h2 className="text-3xl font-semibold mb-2">Pattern Recall</h2>
              <p className="text-lg text-muted-foreground">Level {patternLevel} • Score: {patternScore}</p>
              {isShowingPattern && <p className="text-accent font-semibold mt-2">Watch the pattern...</p>}
              {!isShowingPattern && <p className="text-primary font-semibold mt-2">Repeat the pattern!</p>}
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
              {Array.from({ length: 9 }, (_, i) => (
                <Card
                  key={i}
                  className={`h-24 flex items-center justify-center text-2xl cursor-pointer transition-all ${
                    highlightedCell === i ? 'bg-accent' : 'bg-gray-100 dark:bg-gray-800'
                  } ${isShowingPattern ? 'cursor-not-allowed' : ''}`}
                  onClick={() => handleCellClick(i)}
                >
                  <CardContent className="p-0">
                    {i + 1}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <Button variant="outline" onClick={backToMenu}>
                <Home className="w-4 h-4 mr-2" /> Back to Menu
              </Button>
            </div>
          </div>
        )}

        {gameState === 'pattern-results' && (
          <div>
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-semibold text-foreground mb-4">Game Over!</h2>
            </div>

            <Card className="max-w-2xl mx-auto text-center">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="text-2xl text-accent-foreground" />
                </div>
                <h3 className="text-2xl font-semibold text-card-foreground mb-2">Well done!</h3>
                <p className="text-lg text-muted-foreground mb-2">
                  You reached level {patternLevel} with a score of {patternScore}
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Time: {getTimeTaken()}
                </p>
                <div className="flex space-x-4 justify-center">
                  <Button onClick={startPatternRecall}>
                    <RotateCcw className="w-4 h-4 mr-2" /> Play Again
                  </Button>
                  <Button variant="outline" onClick={backToMenu}>
                    <Home className="w-4 h-4 mr-2" /> Back to Menu
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
