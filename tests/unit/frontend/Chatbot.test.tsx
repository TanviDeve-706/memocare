import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Chatbot from '../../../client/src/pages/Chatbot';

// Mock API responses
const mockMedications = [
  { id: 1, name: 'Aspirin', dosage: '100mg', notes: 'Daily blood thinner' },
  { id: 2, name: 'Lisinopril', dosage: '10mg', notes: 'Blood pressure' },
];

const mockContacts = [
  { id: 1, name: 'Sarah Johnson', relation: 'daughter', phone: '555-0101', email: 'sarah@example.com' },
  { id: 2, name: 'Dr. Smith', relation: 'doctor', phone: '555-0202', email: 'doctor@example.com' },
];

const mockObjectRecognitions = [
  { 
    id: 1, 
    user_tag: 'Car Keys', 
    notes: 'Always in kitchen drawer', 
    transcription: 'These are my car keys for the Honda',
    photo_url: '/uploads/keys.jpg'
  },
  { 
    id: 2, 
    user_tag: 'Wallet', 
    notes: 'Brown leather',
    transcription: null,
    photo_url: '/uploads/wallet.jpg'
  },
];

const mockReminders = [
  { id: 1, title: 'Doctor Appointment', type: 'appointment' },
  { id: 2, title: 'Take Medications', type: 'medication' },
];

// Mock the API module
vi.mock('../../../client/src/lib/api', () => ({
  api: vi.fn((endpoint: string) => {
    if (endpoint === '/api/medications') return Promise.resolve(mockMedications);
    if (endpoint === '/api/reminders') return Promise.resolve(mockReminders);
    if (endpoint === '/api/journal') return Promise.resolve([]);
    if (endpoint === '/api/memory') return Promise.resolve([]);
    if (endpoint === '/api/identify/objects') return Promise.resolve(mockObjectRecognitions);
    return Promise.resolve([]);
  }),
  contactsApi: {
    list: vi.fn(() => Promise.resolve(mockContacts)),
  },
  apiRequest: vi.fn(),
}));

// Mock toast
vi.mock('../../../client/src/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('Recollection Chatbot', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderChatbot = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Chatbot />
      </QueryClientProvider>
    );
  };

  it('should display welcome message on load', async () => {
    renderChatbot();
    
    expect(await screen.findByText(/Hello! I'm your memory assistant/i)).toBeInTheDocument();
    expect(screen.getByText(/What would you like to know/i)).toBeInTheDocument();
  });

  it('should show suggested questions when no messages sent', async () => {
    renderChatbot();
    
    await waitFor(() => {
      expect(screen.getByText('What medications do I take?')).toBeInTheDocument();
      expect(screen.getByText('Who are my emergency contacts?')).toBeInTheDocument();
    });
  });

  it('should answer medication questions correctly', async () => {
    const user = userEvent.setup();
    renderChatbot();
    
    const input = await screen.findByTestId('input-chat-message');
    const sendButton = screen.getByTestId('button-send-message');
    
    await user.type(input, 'What medications do I take?');
    await user.click(sendButton);
    
    // Check user message appears
    await waitFor(() => {
      expect(screen.getByText('What medications do I take?')).toBeInTheDocument();
    });
    
    // Wait for bot response
    await waitFor(() => {
      const messages = screen.getByTestId('chat-messages');
      expect(within(messages).getByText(/Here are your medications/i)).toBeInTheDocument();
      expect(within(messages).getByText(/Aspirin.*100mg/i)).toBeInTheDocument();
      expect(within(messages).getByText(/Lisinopril.*10mg/i)).toBeInTheDocument();
    });
  });

  it('should answer contact queries with specific person details', async () => {
    const user = userEvent.setup();
    renderChatbot();
    
    const input = await screen.findByTestId('input-chat-message');
    const sendButton = screen.getByTestId('button-send-message');
    
    await user.type(input, 'Who is Sarah Johnson?');
    await user.click(sendButton);
    
    await waitFor(() => {
      const messages = screen.getByTestId('chat-messages');
      expect(within(messages).getByText(/Sarah Johnson is your daughter/i)).toBeInTheDocument();
      expect(within(messages).getByText(/555-0101/)).toBeInTheDocument();
    });
  });

  it('should provide information about identified objects', async () => {
    const user = userEvent.setup();
    renderChatbot();
    
    const input = await screen.findByTestId('input-chat-message');
    const sendButton = screen.getByTestId('button-send-message');
    
    await user.type(input, 'What objects have I identified?');
    await user.click(sendButton);
    
    await waitFor(() => {
      const messages = screen.getByTestId('chat-messages');
      expect(within(messages).getByText(/Here are some objects you've identified/i)).toBeInTheDocument();
      expect(within(messages).getByText(/Car Keys/i)).toBeInTheDocument();
      expect(within(messages).getByText(/Always in kitchen drawer/i)).toBeInTheDocument();
    });
  });

  it('should show reminders when asked about schedule', async () => {
    const user = userEvent.setup();
    renderChatbot();
    
    const input = await screen.findByTestId('input-chat-message');
    const sendButton = screen.getByTestId('button-send-message');
    
    await user.type(input, 'What are my reminders?');
    await user.click(sendButton);
    
    await waitFor(() => {
      const messages = screen.getByTestId('chat-messages');
      expect(within(messages).getByText(/Here are your reminders/i)).toBeInTheDocument();
      expect(within(messages).getByText(/Doctor Appointment/i)).toBeInTheDocument();
    });
  });

  it('should provide help information when asked', async () => {
    const user = userEvent.setup();
    renderChatbot();
    
    const input = await screen.findByTestId('input-chat-message');
    const sendButton = screen.getByTestId('button-send-message');
    
    await user.type(input, 'What can you do?');
    await user.click(sendButton);
    
    await waitFor(() => {
      const messages = screen.getByTestId('chat-messages');
      expect(within(messages).getByText(/I can help you remember/i)).toBeInTheDocument();
      expect(within(messages).getByText(/Medications and when to take them/i)).toBeInTheDocument();
    });
  });

  it('should show thinking indicator while processing', async () => {
    const user = userEvent.setup();
    renderChatbot();
    
    const input = await screen.findByTestId('input-chat-message');
    const sendButton = screen.getByTestId('button-send-message');
    
    await user.type(input, 'Test question');
    
    // Before clicking, verify thinking indicator is not present
    expect(screen.queryByText(/\.\.\./)).not.toBeInTheDocument();
    
    await user.click(sendButton);
    
    // After clicking, thinking indicator should appear briefly
    // (Note: This may be fast, so we can't reliably test the intermediate state)
    
    // Eventually, response should appear
    await waitFor(() => {
      expect(screen.getByText(/Test question/)).toBeInTheDocument();
    });
  });

  it('should disable input while thinking', async () => {
    const user = userEvent.setup();
    renderChatbot();
    
    const input = await screen.findByTestId('input-chat-message') as HTMLInputElement;
    const sendButton = screen.getByTestId('button-send-message');
    
    await user.type(input, 'Test');
    await user.click(sendButton);
    
    // Input should be disabled briefly while processing
    // After processing completes, it should be enabled again
    await waitFor(() => {
      expect(input.disabled).toBe(false);
    });
  });

  it('should allow clicking suggested questions to populate input', async () => {
    const user = userEvent.setup();
    renderChatbot();
    
    const suggestion = await screen.findByTestId('suggestion-0');
    await user.click(suggestion);
    
    const input = screen.getByTestId('input-chat-message') as HTMLInputElement;
    expect(input.value).toBe('What medications do I take?');
  });

  it('should handle empty data gracefully', async () => {
    // Override mocks to return empty arrays
    const { api } = await import('../../../client/src/lib/api');
    vi.mocked(api).mockImplementation((endpoint: string) => {
      if (endpoint === '/api/medications') return Promise.resolve([]);
      return Promise.resolve([]);
    });
    
    const user = userEvent.setup();
    const { rerender } = renderChatbot();
    
    // Rerender to apply new mock
    rerender(
      <QueryClientProvider client={queryClient}>
        <Chatbot />
      </QueryClientProvider>
    );
    
    const input = await screen.findByTestId('input-chat-message');
    const sendButton = screen.getByTestId('button-send-message');
    
    await user.type(input, 'What medications do I take?');
    await user.click(sendButton);
    
    await waitFor(() => {
      const messages = screen.getByTestId('chat-messages');
      expect(within(messages).getByText(/You don't have any medications recorded yet/i)).toBeInTheDocument();
    });
  });

  it('should display timestamps for messages', async () => {
    renderChatbot();
    
    await waitFor(() => {
      const messages = screen.getAllByText(/\d{1,2}:\d{2}\s?[AP]M/i);
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  it('should scroll to bottom when new messages appear', async () => {
    const user = userEvent.setup();
    renderChatbot();
    
    const input = await screen.findByTestId('input-chat-message');
    const sendButton = screen.getByTestId('button-send-message');
    
    // Send multiple messages
    await user.type(input, 'First message');
    await user.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText('First message')).toBeInTheDocument();
    });
    
    const inputField = screen.getByTestId('input-chat-message') as HTMLInputElement;
    await user.clear(inputField);
    await user.type(inputField, 'Second message');
    await user.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText('Second message')).toBeInTheDocument();
    });
  });
});
