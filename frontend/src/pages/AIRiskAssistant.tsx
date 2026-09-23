import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, Send, Sparkles, User, Bot } from 'lucide-react';
import api from '@/lib/api';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  PageHeader,
  Textarea,
} from '@/components/ui';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AssistantResponse {
  content: string;
  model: string;
  tokensUsed: number;
}

interface AssistantStatus {
  available: boolean;
  enabled: boolean;
  isMockMode: boolean;
  unavailableReason?: string;
  config: { provider: string; model: string };
}

const SUGGESTED_PROMPTS = [
  'Help me structure a risk assessment for this scenario: ',
  'Suggest controls for this risk: ',
  'Draft a risk treatment plan for: ',
  'Explain how to evaluate residual risk after mitigation.',
];

export default function AIRiskAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [requestError, setRequestError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    data: status,
    isLoading: statusLoading,
    isError: statusError,
  } = useQuery<AssistantStatus>({
    queryKey: ['ai', 'status'],
    queryFn: () => api.get<AssistantStatus>('/api/ai/status').then((res) => res.data),
    retry: false,
  });

  const assistantAvailable =
    !!status && status.enabled && status.available && !status.isMockMode && !statusError;

  const sendMutation = useMutation({
    mutationFn: async (next: ChatMessage[]) => {
      const conversation = next
        .map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`)
        .join('\n\n');
      const res = await api.post<AssistantResponse>('/api/ai/complete', {
        prompt: conversation,
        systemPrompt:
          'You are a governance, risk, and compliance assistant. Answer only from context the user supplies, clearly identify missing organization data, and give concise, actionable guidance.',
      });
      return res.data;
    },
    onSuccess: (data) => {
      const reply = data.content;
      if (reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      }
      setRequestError('');
    },
    onError: () => {
      setRequestError('The configured AI provider could not complete this request.');
    },
  });

  useEffect(() => {
    const conversation = scrollRef.current;
    if (!conversation) return;
    if (typeof conversation.scrollTo === 'function') {
      conversation.scrollTo({
        top: conversation.scrollHeight,
        behavior: 'smooth',
      });
    } else {
      conversation.scrollTop = conversation.scrollHeight;
    }
  }, [messages, sendMutation.isPending]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || sendMutation.isPending || !assistantAvailable) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    sendMutation.mutate(next);
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="AI Risk Assistant"
        description="Use the organization-configured AI provider for GRC analysis and drafting."
      />

      {!statusLoading && !assistantAvailable && (
        <Card className="border-amber-300 bg-amber-50">
          <CardBody density="cozy" className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">
                {status?.enabled === false
                  ? 'AI assistant is disabled'
                  : 'AI assistant unavailable'}
              </p>
              <p className="text-small text-amber-800 mt-1">
                {statusError
                  ? 'The AI status endpoint could not be reached.'
                  : status?.isMockMode
                    ? 'Development mock mode is active. Configure a real provider before using the assistant.'
                    : status?.unavailableReason ||
                      `Configure credentials for ${status?.config.provider ?? 'an AI provider'} in organization settings.`}
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Suggested prompts</CardTitle>
          </CardHeader>
          <CardBody density="cozy">
            <div className="flex flex-col gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <Button
                  key={prompt}
                  variant="outline"
                  size="sm"
                  className="justify-start text-left whitespace-normal h-auto py-2"
                  onClick={() => handlePromptClick(prompt)}
                  disabled={!assistantAvailable}
                  leftIcon={<Sparkles className="h-3.5 w-3.5 shrink-0" />}
                >
                  <span className="text-small text-surface-800">{prompt}</span>
                </Button>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2 flex flex-col h-[640px]">
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
          </CardHeader>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && !sendMutation.isPending && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="rounded-full bg-brand-500/10 p-3 text-brand-700 mb-3">
                  <Bot className="h-6 w-6" />
                </div>
                <h3 className="text-h3 text-surface-900">Start a conversation</h3>
                <p className="mt-1 max-w-sm text-small text-surface-600">
                  Pick a suggested prompt or provide the risk and control context you want analyzed.
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === 'user'
                    ? 'flex items-start gap-2 justify-end'
                    : 'flex items-start gap-2 justify-start'
                }
              >
                {m.role === 'assistant' && (
                  <div className="shrink-0 rounded-md bg-brand-500/10 p-1.5 text-brand-700">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={
                    m.role === 'user'
                      ? 'max-w-[75%] rounded-lg bg-brand-600 text-white px-3 py-2 text-small whitespace-pre-wrap'
                      : 'max-w-[75%] rounded-lg bg-surface-100 text-surface-900 px-3 py-2 text-small whitespace-pre-wrap border border-surface-200'
                  }
                >
                  {m.content}
                </div>
                {m.role === 'user' && (
                  <div className="shrink-0 rounded-md bg-surface-200 p-1.5 text-surface-700">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {sendMutation.isPending && (
              <div className="flex items-start gap-2 justify-start">
                <div className="shrink-0 rounded-md bg-brand-500/10 p-1.5 text-brand-700">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-lg bg-surface-100 border border-surface-200 px-3 py-2 text-small text-surface-700 inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-surface-500 animate-bounce" />
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-surface-500 animate-bounce"
                    style={{ animationDelay: '120ms' }}
                  />
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-surface-500 animate-bounce"
                    style={{ animationDelay: '240ms' }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-surface-200 p-3">
            {requestError && (
              <p role="alert" className="text-small text-red-700 mb-2">
                {requestError}
              </p>
            )}
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask the assistant…  (Enter to send, Shift+Enter for newline)"
                rows={2}
                className="flex-1 min-h-[48px]"
                disabled={!assistantAvailable}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || sendMutation.isPending || !assistantAvailable}
                loading={sendMutation.isPending}
                leftIcon={!sendMutation.isPending ? <Send className="h-4 w-4" /> : undefined}
              >
                Send
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
