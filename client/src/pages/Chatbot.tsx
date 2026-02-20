import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api, contactsApi } from '@/lib/api';
import { MessageCircle, Send, Brain, User, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your memory assistant. I can help you remember information about your medications, people you know, places you've been, and things you've identified. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch user data for chatbot to use
  const { data: medications = [] } = useQuery({
    queryKey: ['medications'],
    queryFn: () => api('/api/medications'),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => contactsApi.list(),
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => api('/api/reminders'),
  });

  const { data: journalEntries = [] } = useQuery({
    queryKey: ['journal-entries'],
    queryFn: () => api('/api/journal'),
  });

  const { data: memoryItems = [] } = useQuery({
    queryKey: ['memory-items'],
    queryFn: () => api('/api/memory'),
  });

  const { data: objectRecognitions = [] } = useQuery({
    queryKey: ['objects'],
    queryFn: () => api('/api/identify/objects'),
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Rule-based chatbot logic
  const processQuery = (query: string): string => {
    const lowerQuery = query.toLowerCase();

    // Medication queries
    if (lowerQuery.includes('medication') || lowerQuery.includes('medicine') || lowerQuery.includes('pill') || lowerQuery.includes('drug')) {
      if (medications.length === 0) {
        return "You don't have any medications recorded yet. You can add them in the Medications section.";
      }
      
      const medList = medications.map((med: any) => 
        `- ${med.name} (${med.dosage})${med.notes ? ': ' + med.notes : ''}`
      ).join('\n');
      
      return `Here are your medications:\n\n${medList}\n\nYou can find more details in the Medications section.`;
    }

    // People/Contact queries
    if (lowerQuery.includes('who is') || lowerQuery.includes('people') || lowerQuery.includes('contact') || lowerQuery.includes('person') || lowerQuery.includes('family') || lowerQuery.includes('friend')) {
      const nameMatch = lowerQuery.match(/who is\s+(.+?)(\?|$)/);
      
      if (nameMatch) {
        const searchName = nameMatch[1].trim();
        const found = contacts.find((c: any) => 
          c.name.toLowerCase().includes(searchName) || searchName.includes(c.name.toLowerCase())
        );
        
        if (found) {
          let response = `${found.name} is your ${found.relation}.`;
          if (found.phone) response += `\nPhone: ${found.phone}`;
          if (found.email) response += `\nEmail: ${found.email}`;
          return response;
        }
        return `I couldn't find anyone named "${nameMatch[1]}" in your contacts. You have ${contacts.length} people saved.`;
      }
      
      if (contacts.length === 0) {
        return "You don't have any contacts saved yet. You can add them in the People Cards section.";
      }
      
      const contactList = contacts.slice(0, 5).map((c: any) => 
        `- ${c.name} (${c.relation})`
      ).join('\n');
      
      return `Here are some people you know:\n\n${contactList}\n\n${contacts.length > 5 ? `...and ${contacts.length - 5} more. ` : ''}Check the People Cards section for full details.`;
    }

    // Reminder/Schedule queries
    if (lowerQuery.includes('when') || lowerQuery.includes('reminder') || lowerQuery.includes('schedule') || lowerQuery.includes('appointment')) {
      if (reminders.length === 0) {
        return "You don't have any reminders set up yet. You can create them in the Reminders section.";
      }
      
      const reminderList = reminders.slice(0, 5).map((r: any) => 
        `- ${r.title} (${r.type})`
      ).join('\n');
      
      return `Here are your reminders:\n\n${reminderList}\n\n${reminders.length > 5 ? `...and ${reminders.length - 5} more. ` : ''}Check the Reminders section for full schedule.`;
    }

    // Object/Item queries
    if (lowerQuery.includes('what is') || lowerQuery.includes('object') || lowerQuery.includes('thing') || lowerQuery.includes('item') || lowerQuery.includes('identified')) {
      if (objectRecognitions.length === 0) {
        return "You haven't identified any objects yet. Use the Identify & Tag section to scan and remember objects.";
      }
      
      const objectList = objectRecognitions.slice(0, 5).map((obj: any) => {
        let desc = `- ${obj.user_tag}`;
        if (obj.notes) desc += `: ${obj.notes}`;
        if (obj.transcription) desc += ` (Voice note: "${obj.transcription.substring(0, 50)}...")`;
        return desc;
      }).join('\n');
      
      return `Here are some objects you've identified:\n\n${objectList}\n\n${objectRecognitions.length > 5 ? `...and ${objectRecognitions.length - 5} more. ` : ''}Use the Identify & Tag section to see all of them.`;
    }

    // Journal/Memory queries - Enhanced to use journal content for meaningful responses
    if (lowerQuery.includes('remember') || lowerQuery.includes('memory') || lowerQuery.includes('journal') || lowerQuery.includes('wrote') || lowerQuery.includes('said') || lowerQuery.includes('thought') || lowerQuery.includes('noted')) {
      const totalEntries = journalEntries.length + memoryItems.length;
      
      if (totalEntries === 0) {
        return "You haven't recorded any memories or journal entries yet. Use the Journal and Memory Wall sections to capture your thoughts and memories.";
      }
      
      // Check for specific keyword searches in journal content
      const searchTerms = lowerQuery.match(/about\s+(.+?)(\?|$)|remember\s+(.+?)(\?|$)/);
      if (searchTerms && journalEntries.length > 0) {
        const keyword = (searchTerms[1] || searchTerms[3])?.trim().toLowerCase();
        if (keyword) {
          const matchingEntries = journalEntries.filter((entry: any) => 
            entry.content_text && entry.content_text.toLowerCase().includes(keyword)
          );
          
          if (matchingEntries.length > 0) {
            const recent = matchingEntries[0];
            let response = `I found ${matchingEntries.length} journal ${matchingEntries.length === 1 ? 'entry' : 'entries'} about "${keyword}".\n\n`;
            response += `Most recent entry from ${new Date(recent.created_at).toLocaleDateString()}:\n`;
            response += `"${recent.content_text.substring(0, 200)}${recent.content_text.length > 200 ? '...' : ''}"`;
            return response;
          }
        }
      }
      
      let response = `You have ${journalEntries.length} journal entries and ${memoryItems.length} memory items saved. `;
      
      if (journalEntries.length > 0) {
        const recentEntry = journalEntries[0];
        response += `\n\nYour most recent journal entry was on ${new Date(recentEntry.created_at).toLocaleDateString()}.`;
        if (recentEntry.content_text) {
          const preview = recentEntry.content_text.substring(0, 100);
          response += `\n\n"${preview}${recentEntry.content_text.length > 100 ? '...' : ''}"`;
        }
        response += `\n\nTry asking: "What did I write about [topic]?" to search your journal entries.`;
      }
      
      response += "\n\nCheck the Journal and Memory Wall sections to explore all your memories.";
      return response;
    }

    // Emergency queries
    if (lowerQuery.includes('emergency') || lowerQuery.includes('help') || lowerQuery.includes('alert')) {
      return "If you need emergency help, use the red Emergency button in the navigation menu. It will alert your emergency contacts immediately.";
    }

    // General help
    if (lowerQuery.includes('how') || lowerQuery.includes('what can you') || lowerQuery.includes('help')) {
      return "I can help you remember:\n\n" +
             "- Medications and when to take them\n" +
             "- People you know and their contact information\n" +
             "- Your reminders and schedule\n" +
             "- Objects you've identified\n" +
             "- Journal entries and memories\n\n" +
             "Try asking questions like:\n" +
             "- \"What medications do I take?\"\n" +
             "- \"Who is [name]?\"\n" +
             "- \"What are my reminders?\"\n" +
             "- \"What objects have I identified?\"";
    }

    // Default response
    return "I'm here to help you remember! Try asking me about your medications, the people you know, your schedule, or things you've identified. You can also ask 'what can you do?' to learn more about how I can help.";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);

    // Simulate thinking time for better UX
    setTimeout(() => {
      const response = processQuery(input);
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsThinking(false);
    }, 500);
  };

  const suggestedQuestions = [
    "What medications do I take?",
    "Who are my emergency contacts?",
    "What are my reminders?",
    "What objects have I identified?",
  ];

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="w-8 h-8 text-primary" />
        <h2 className="text-4xl font-semibold">Recollection Assistant</h2>
      </div>

      <Card className="flex-1 flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Your Memory Helper
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4" data-testid="chat-messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                data-testid={`message-${message.role}-${index}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-primary-foreground" />
                  </div>
                )}
                
                <div
                  className={`max-w-[70%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-2">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}
            
            {isThinking && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          {messages.length === 1 && (
            <div className="px-6 pb-4">
              <p className="text-sm text-muted-foreground mb-2">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => setInput(question)}
                    data-testid={`suggestion-${index}`}
                  >
                    {question}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="border-t p-4">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about your information..."
                className="flex-1"
                disabled={isThinking}
                data-testid="input-chat-message"
                autoComplete="off"
              />
              <Button type="submit" disabled={!input.trim() || isThinking} data-testid="button-send-message">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
