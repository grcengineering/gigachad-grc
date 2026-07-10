import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Send, Sparkles, User, Bot } from 'lucide-react';
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
  message?: { role: 'assistant'; content: string };
  reply?: string;
  content?: string;
}

const SUGGESTED_PROMPTS = [
  'What are my top 5 critical risks?',
  'Show overdue control tests',
  "Compare this quarter's compliance score vs last",
  'Draft a risk treatment for X',
];

export default function AIRiskAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMutation = useMutation({
    mutationFn: async (next: ChatMessage[]) => {
      const res = await api.post<AssistantResponse>('/api/ai/risk-assistant', {
        messages: next,
      });
      return res.data;
    },
    onSuccess: (data) => {
      const reply = data?.message?.content ?? data?.reply ?? data?.content ?? '';
      if (reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      }
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Something went wrong reaching the assistant. Please try again in a moment.',
        },
      ]);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, sendMutation.isPending]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || sendMutation.isPending) return;
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
        description="Ask questions about your risks, controls, and compliance posture. The assistant has context across your GRC program."
      />

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
                  Pick a suggested prompt or ask anything about your risk posture, controls,
                  evidence, or compliance frameworks.
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
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask the assistant…  (Enter to send, Shift+Enter for newline)"
                rows={2}
                className="flex-1 min-h-[48px]"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || sendMutation.isPending}
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
