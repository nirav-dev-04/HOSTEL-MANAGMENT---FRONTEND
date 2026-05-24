// Real-time WebSocket Service matching Spring Boot's NotificationWebSocketHandler
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9001';
const WS_URL = API_BASE_URL.replace(/^http/, 'ws') + '/ws-notifications';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = 3000; // start with 3 seconds
    this.shouldReconnect = true;
  }

  connect(userId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.shouldReconnect = true;
    const token = localStorage.getItem('token');
    
    // Construct authenticated socket URL with query params
    const socketUrl = `${WS_URL}?userId=${userId}${token ? `&token=${token}` : ''}`;

    try {
      this.ws = new WebSocket(socketUrl);

      this.ws.onopen = () => {
        console.log('[WebSocket] Live real-time notification connection established.');
        this.reconnectAttempts = 0;
        this.reconnectTimeout = 3000;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyListeners(data);
        } catch (e) {
          // Standard text message parse
          this.notifyListeners({ message: event.data });
        }
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Connection closed.');
        if (this.shouldReconnect) {
          this.attemptReconnect(userId);
        }
      };

      this.ws.onerror = (error) => {
        // Quiet warning for local environments where WebSockets might be temporarily inactive
        console.warn('[WebSocket] Connection warning. Notifications will fall back to periodic refresh.');
      };
    } catch (e) {
      console.warn('[WebSocket] Failed to initialize socket interface:', e);
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(data) {
    this.listeners.forEach((callback) => {
      try {
        callback(data);
      } catch (err) {
        console.error('[WebSocket] Error in notification listener callback:', err);
      }
    });
  }

  attemptReconnect(userId) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WebSocket] Max reconnection attempts reached. Falling back to HTTP polling.');
      return;
    }

    this.reconnectAttempts += 1;
    console.log(`[WebSocket] Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    setTimeout(() => {
      this.connect(userId);
      this.reconnectTimeout = Math.min(this.reconnectTimeout * 1.5, 30000); // exponential backoff capped at 30 seconds
    }, this.reconnectTimeout);
  }
}

const webSocketService = new WebSocketService();
export default webSocketService;
