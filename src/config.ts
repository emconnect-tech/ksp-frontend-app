export const config = {
  // Set to true to mock all API requests and bypass the backend completely.
  // Useful for frontend-only development or UI testing.
  USE_MOCK_API: false,

  // WhatsApp provider: 'waweb' | 'msg91' | 'none'
  // 'waweb'  — QR-based via whatsapp-service sidecar (free)
  // 'msg91'  — paid API, no QR needed; admin panel shows config status only
  // 'none'   — disabled, no WhatsApp tab shown
  WHATSAPP_TYPE: (import.meta.env.VITE_WHATSAPP_TYPE || 'waweb') as 'waweb' | 'msg91' | 'none',

  // Only used when WHATSAPP_TYPE = 'waweb'
  WHATSAPP_WEB_URL: import.meta.env.VITE_WHATSAPP_URL || 'http://localhost:3001',
  WHATSAPP_ADMIN_TOKEN: import.meta.env.VITE_WHATSAPP_ADMIN_TOKEN || '',
};
