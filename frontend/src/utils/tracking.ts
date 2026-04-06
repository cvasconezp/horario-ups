import client from '../api/client';

// Generate a simple session ID that persists for the browser tab lifetime
let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
  return sessionId;
}

interface TrackParams {
  pagina: string;
  periodoId?: number | string;
  nivelId?: number | string;
  centroId?: number | string;
}

export function trackPageView(params: TrackParams): void {
  try {
    client.post('/track', {
      ...params,
      sessionId: getSessionId(),
    }).catch(() => {}); // fire and forget
  } catch {
    // never fail
  }
}
