/**
 * chatApi.ts
 * Typed API client for the Agent Chat endpoints.
 * Uses the shared apiClient (axios) so JWT is always attached automatically.
 */
import apiClient from './client';

export interface ReasoningStep {
  tool: string;
  arguments: Record<string, unknown>;
  result_summary: string;
}

export interface SessionResponse {
  session_id: string;
  messages: Array<{ role: string; content: string; created_at: string }>;
}

export interface AgentResponse {
  answer: string;
  reasoning_trace: ReasoningStep[];
  session_id: string | null;
}

/** Create (or reopen) a chat session for a given farm. */
export async function openSession(farmId?: string): Promise<SessionResponse> {
  const res = await apiClient.post<SessionResponse>('/agent/sessions', {
    farm_id: farmId ?? null,
  });
  return res.data;
}

/** Send a message to the agent and get a reply. */
export async function sendAgentMessage(
  message: string,
  sessionId: string,
  farmId?: string,
  timeoutMs = 120_000,   // 2 minutes — Groq + multi-tool calls can take ~30-60s
): Promise<AgentResponse> {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await apiClient.post<AgentResponse>(
      '/agent/crop-advisory',
      {
        message,
        session_id: sessionId,
        farm_id: farmId ?? null,
      },
      { signal: controller.signal as any },
    );
    return res.data;
  } catch (err: any) {
    if (err.name === 'AbortError' || err.code === 'ECONNABORTED' || controller.signal.aborted) {
      throw new Error('Request timed out. The agent is still processing — please tap Retry in a moment.');
    }
    throw err;
  } finally {
    clearTimeout(timerId);
  }
}
