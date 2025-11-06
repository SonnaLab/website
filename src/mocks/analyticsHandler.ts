// Pour tests avec MSW (Mock Service Worker)
import { http, HttpResponse } from 'msw';

export const analyticsHandlers = [
  http.post('https://api.sonnalab.com/analytics/events', async ({ request }: { request: Request }) => {
    const body = await request.json();
    console.log('📊 Analytics received:', body);
    
    // Sauvegarder dans localStorage pour debug
    const existing = localStorage.getItem('analytics_debug');
    const data = existing ? JSON.parse(existing) : [];
    data.push({ timestamp: Date.now(), ...body });
    localStorage.setItem('analytics_debug', JSON.stringify(data));

    return HttpResponse.json({ success: true });
  })
];