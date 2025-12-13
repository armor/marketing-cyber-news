import { useEffect, useState } from 'react';
import { websocketService, type WebSocketEvent, type ArticleCreatedPayload } from '../services/websocketService';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

export function NotificationToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = websocketService.subscribe((event: WebSocketEvent) => {
      let message = '';
      let type: Toast['type'] = 'info';

      switch (event.type) {
        case 'article.created': {
          const payload = event.payload as ArticleCreatedPayload;
          message = `New article: ${payload.title}`;
          type = payload.severity === 'critical' ? 'warning' : 'info';
          break;
        }
        case 'alert.match':
          message = 'An alert has been triggered!';
          type = 'warning';
          break;
        case 'system.notification':
          message = String(event.payload);
          type = 'info';
          break;
        default:
          return;
      }

      const id = Date.now().toString();
      setToasts((prev) => [...prev, { id, message, type }]);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    });

    return unsubscribe;
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const typeStyles = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-orange-500',
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${typeStyles[toast.type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-sm animate-slide-in`}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-white/80 hover:text-white"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
