
import { db } from './database';

export const notificationService = {
  requestPermission: async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones.');
      return false;
    }

    const permission = await Notification.requestPermission();
    const enabled = permission === 'granted';
    
    // Guardar preferencia en el perfil
    db.updateCurrentUser({ notifications_enabled: enabled });
    
    return enabled;
  },

  send: (title: string, body: string, icon?: string) => {
    const user = db.getCurrentUser();
    if (!user?.notifications_enabled) return;

    if (Notification.permission === 'granted') {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, {
            body,
            icon: icon || 'https://cdn-icons-png.flaticon.com/512/826/826070.png',
            badge: 'https://cdn-icons-png.flaticon.com/512/826/826070.png',
            vibrate: [200, 100, 200],
            tag: 'wander-update',
            data: { url: window.location.href }
          } as any);
        });
      } else {
        new Notification(title, { 
          body, 
          icon: icon || 'https://cdn-icons-png.flaticon.com/512/826/826070.png'
        });
      }
    }
  },

  // Simulación para el demo: notifica menciones o acciones de "otros"
  simulateActivity: (type: 'mention' | 'expense' | 'invite' | 'trip_movement', context: string) => {
    const alerts = {
      mention: { title: '¡Fuiste mencionado!', body: `Un compañero te mencionó en: "${context}"` },
      expense: { title: 'Nuevo Gasto Grupal', body: `Se ha registrado un gasto de "${context}" en tu viaje.` },
      invite: { title: 'Nueva Invitación', body: `Te han invitado al viaje: "${context}". ¡Revisa tu email!` },
      trip_movement: { title: 'Movimiento en el viaje', body: `Se ha actualizado el itinerario: "${context}"` }
    };

    const alert = alerts[type];
    // Simular un pequeño delay de "red"
    setTimeout(() => {
      notificationService.send(alert.title, alert.body);
    }, 2500);
  }
};
