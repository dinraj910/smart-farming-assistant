/**
 * chatStore.ts
 * Zustand store managing chat sessions, messages, and loading/error state.
 * Session ID is persisted per fieldId so history is maintained across navigations.
 */
import { create } from 'zustand';
import { openSession, sendAgentMessage, ReasoningStep } from '../api/chatApi';

export type MessageStatus = 'sending' | 'sent' | 'failed';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  status?: MessageStatus;
  trace?: { tool: string }[];
  isThinking?: boolean;
  canRetry?: boolean;
  createdAt?: string;
}

interface ChatState {
  /** session_id keyed by fieldId */
  sessions: Record<string, string>;
  /** messages keyed by fieldId */
  messages: Record<string, ChatMessage[]>;
  /** is the current field's session being initialised */
  isInitializingSession: boolean;
  /** is a message being sent right now */
  isSending: boolean;
  /** last error, per field */
  error: string | null;

  // Actions
  initSession: (fieldId: string, farmId?: string) => Promise<void>;
  send: (fieldId: string, text: string, farmId?: string) => Promise<void>;
  retry: (fieldId: string, msgId: string, farmId?: string) => Promise<void>;
  clearError: () => void;
}

const MAX_RETRIES = 2;

async function attemptSend(
  message: string,
  sessionId: string,
  farmId?: string,
): ReturnType<typeof sendAgentMessage> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await sendAgentMessage(message, sessionId, farmId);
    } catch (err: any) {
      lastError = err;
      // Only retry on network / timeout errors, not 4xx
      const status = err?.response?.status;
      if (status && status < 500) throw err;
      if (attempt < MAX_RETRIES) {
        // Exponential back-off: 1 s, 2 s
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: {},
  messages: {},
  isInitializingSession: false,
  isSending: false,
  error: null,

  clearError: () => set({ error: null }),

  initSession: async (fieldId, farmId) => {
    // Don't re-init if we already have a session for this field
    if (get().sessions[fieldId]) return;
    set({ isInitializingSession: true, error: null });
    try {
      const { session_id, messages: history } = await openSession(farmId);
      const historyMessages: ChatMessage[] = history.map((m, i) => ({
        id: `hist-${i}`,
        role: m.role as 'user' | 'assistant',
        text: m.content,
        status: 'sent',
        createdAt: m.created_at,
      }));
      set(state => ({
        sessions: { ...state.sessions, [fieldId]: session_id },
        messages: { ...state.messages, [fieldId]: historyMessages },
        isInitializingSession: false,
      }));
    } catch (err: any) {
      set({
        isInitializingSession: false,
        error: 'Could not start a chat session. Check your connection.',
      });
    }
  },

  send: async (fieldId, text, farmId) => {
    const sessionId = get().sessions[fieldId];
    if (!sessionId || !text.trim()) return;

    const userMsgId = `user-${Date.now()}`;
    const thinkingId = 'thinking';

    const userMsg: ChatMessage = { id: userMsgId, role: 'user', text, status: 'sending', createdAt: new Date().toISOString() };
    const thinkingMsg: ChatMessage = { id: thinkingId, role: 'assistant', text: '', isThinking: true, createdAt: new Date().toISOString() };

    set(state => ({
      isSending: true,
      error: null,
      messages: {
        ...state.messages,
        [fieldId]: [...(state.messages[fieldId] || []), userMsg, thinkingMsg],
      },
    }));

    try {
      const data = await attemptSend(text, sessionId, farmId);

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        text: data.answer,
        status: 'sent',
        trace: data.reasoning_trace || [],
        createdAt: new Date().toISOString(),
      };

      set(state => {
        const existing = (state.messages[fieldId] || [])
          .filter(m => m.id !== thinkingId)
          .map(m => m.id === userMsgId ? { ...m, status: 'sent' as MessageStatus } : m);
        return {
          isSending: false,
          messages: { ...state.messages, [fieldId]: [...existing, assistantMsg] },
        };
      });
    } catch (err: any) {
      const errMsg =
        err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED'
          ? 'Request timed out. The agent is taking too long. Tap to retry.'
          : err?.response?.data?.detail || 'Could not reach the farm advisor. Tap to retry.';

      set(state => {
        const updated = (state.messages[fieldId] || [])
          .filter(m => m.id !== thinkingId)
          .map(m =>
            m.id === userMsgId
              ? { ...m, status: 'failed' as MessageStatus, canRetry: true }
              : m,
          );
        return {
          isSending: false,
          error: errMsg,
          messages: { ...state.messages, [fieldId]: updated },
        };
      });
    }
  },

  retry: async (fieldId, msgId, farmId) => {
    const msg = (get().messages[fieldId] || []).find(m => m.id === msgId);
    if (!msg || msg.role !== 'user') return;
    // Remove failed marker and re-send
    set(state => ({
      messages: {
        ...state.messages,
        [fieldId]: state.messages[fieldId].filter(m => m.id !== msgId),
      },
      error: null,
    }));
    await get().send(fieldId, msg.text, farmId);
  },
}));
