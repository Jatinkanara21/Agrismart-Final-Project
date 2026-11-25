import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { useAgri } from '../../context/AgriContext';
import { apiClient } from '../../lib/apiClient';
import { ErrorAlert, SourceBanner } from '../SourceNotice';

const STARTER_QUESTIONS = [
  'Best split Urea and DAP schedule for my active plot?',
  'When should I irrigate during hot afternoons to save water?',
  'How do I prevent early blight and whiteflies organically?',
  'Which short-duration Zaid crop fits after Rabi wheat?',
];

export function AgriBotModule() {
  const { activeFarm, chatMessages, saveChatTurn, clearChat, systemStatus } = useAgri();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSource, setLastSource] = useState<'LIVE_OLLAMA' | 'DEMO' | null>(null);
  const [lastModel, setLastModel] = useState<string | null>(null);
  const [lastNotice, setLastNotice] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length, sending]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || sending) return;
    setError(null);
    setInput('');
    setSending(true);

    try {
      await saveChatTurn({
        farmId: activeFarm?.id,
        sender: 'user',
        content: trimmed,
        source: 'USER',
      });

      const historyPayload = chatMessages.slice(-8).map((m) => ({
        sender: m.sender,
        content: m.content,
      }));

      const res = await apiClient.chatAgriBot({
        message: trimmed,
        history: historyPayload,
        farmContext: activeFarm
          ? {
              name: activeFarm.name,
              district: activeFarm.district,
              state: activeFarm.state,
              areaAcres: activeFarm.areaAcres,
              soilType: activeFarm.soilType,
              irrigationType: activeFarm.irrigationType,
              season: activeFarm.season,
              currentCrop: activeFarm.currentCrop,
              soilPh: activeFarm.soilPh,
            }
          : undefined,
      });

      const replyText = typeof res?.reply === 'string' ? res.reply.trim() : '';
      if (!replyText) {
        throw new Error('AgriBot returned an empty response. Please try asking again.');
      }

      const normalizedSource = res.source === 'LIVE_OLLAMA' ? 'LIVE_OLLAMA' : 'DEMO';
      setLastSource(normalizedSource);
      setLastModel(typeof res.model === 'string' && res.model.trim() ? res.model.trim() : null);
      setLastNotice(typeof res.notice === 'string' && res.notice.trim() ? res.notice.trim() : null);

      await saveChatTurn({
        ...(activeFarm?.id ? { farmId: activeFarm.id } : {}),
        sender: 'assistant',
        content: replyText,
        source: normalizedSource,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AgriBot could not reply right now.');
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#17211A]">AgriBot AI Chatbot</h2>
          <p className="text-sm text-[#526157] mt-1">
            Ask plain-language questions about fertilizers, irrigation, pests, or seasonal crops.
            {activeFarm ? ` Using context from ${activeFarm.name} (${activeFarm.areaAcres} ac).` : ''}
          </p>
        </div>
        {chatMessages.length > 0 && (
          <button
            type="button"
            onClick={() => void clearChat()}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[#DCE3D7] bg-white text-xs font-semibold text-[#526157] hover:text-red-700 hover:border-red-200 inline-flex items-center gap-1.5 self-start sm:self-auto whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            Clear Chat
          </button>
        )}
      </div>

      <SourceBanner
        source={lastSource ?? (systemStatus?.ollamaConfigured ? 'LIVE_OLLAMA' : 'DEMO')}
        modelOrProvider={
          lastModel ??
          (systemStatus?.ollamaConfigured
            ? systemStatus.textModel
            : 'agrismart-demo-chat-v1')
        }
        notice={
          lastNotice ??
          (systemStatus?.ollamaConfigured
            ? undefined
            : 'DEMO Advisory Mode: Configure OLLAMA_API_KEY on the server to enable live Ollama Cloud chat responses.')
        }
      />

      {error && <ErrorAlert message={error} />}

      <section className="bg-white border border-[#DCE3D7] rounded-3xl flex flex-col h-[540px] overflow-hidden">
        {/* Conversation Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {chatMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-6">
              <div className="w-12 h-12 rounded-2xl bg-[#E7F2EC] text-[#1B5E3C] flex items-center justify-center">
                <MessageSquare className="w-6 h-6" aria-hidden="true" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="font-display text-lg font-bold text-[#17211A]">
                  Ask AgriBot anything about your fields
                </h3>
                <p className="text-xs text-[#526157] leading-relaxed">
                  Pick a starter question below or type your own question about Kharif/Rabi crops,
                  soil pH, drip schedules, or pest prevention.
                </p>
              </div>
            </div>
          ) : (
            chatMessages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                      isUser
                        ? 'bg-[#1B5E3C] text-white'
                        : 'bg-[#F6F7F4] border border-[#DCE3D7] text-[#17211A]'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[11px] text-[#526157] mt-1 px-1">
                    {isUser
                      ? 'You'
                      : msg.source === 'LIVE_OLLAMA'
                        ? 'AgriBot · Live Ollama'
                        : 'AgriBot · DEMO Advisory'}{' '}
                    ·{' '}
                    <span className="font-mono tabular-nums">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>
                </div>
              );
            })
          )}

          {sending && (
            <div className="flex items-start">
              <div className="rounded-2xl bg-[#F6F7F4] border border-[#DCE3D7] px-4 py-3 text-xs text-[#526157] animate-pulse">
                AgriBot is preparing field guidance...
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Starter Question Bar */}
        <div className="px-4 py-2.5 border-t border-[#EDF1EA] bg-[#F6F7F4]/60 flex items-center gap-2 overflow-x-auto">
          {STARTER_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={sending}
              onClick={() => void sendMessage(q)}
              className="min-h-[36px] px-3 py-1.5 rounded-xl border border-[#DCE3D7] bg-white hover:border-[#1B5E3C] text-xs font-medium text-[#17211A] whitespace-nowrap shrink-0 transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Message Input */}
        <form
          onSubmit={handleSubmit}
          className="p-3 sm:p-4 border-t border-[#DCE3D7] bg-white flex items-center gap-2.5"
        >
          <label htmlFor="agribot-input" className="sr-only">
            Ask AgriBot a farming question
          </label>
          <input
            id="agribot-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a question about crops, soil, pests, or irrigation..."
            className="flex-1 min-h-[44px] px-3.5 rounded-xl border border-[#DCE3D7] bg-[#F6F7F4] text-sm focus:outline-none focus:border-[#1B5E3C] focus:bg-white"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            aria-label="Send message to AgriBot"
            className="min-h-[44px] px-4 rounded-xl bg-[#1B5E3C] text-white text-sm font-semibold hover:bg-[#14482D] transition-colors inline-flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </section>
    </div>
  );
}
