import { Trip, User, Expense, Activity, Document, Payment, JournalEntry, MapPin, NotificationSettings } from '../types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (res.status === 401) {
    window.location.href = '/api/login';
    throw new Error('No autorizado');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: 'Error del servidor' }));
    throw new Error(data.message || 'Error del servidor');
  }
  return res.json();
}

export const api = {
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const data = await request<any>('/api/auth/user');
      return {
        id: data.id,
        email: data.email || '',
        name: [data.firstName, data.lastName].filter(Boolean).join(' ') || data.email || 'Usuario',
        avatar_url: data.profileImageUrl,
        notifications_enabled: true,
      };
    } catch {
      return null;
    }
  },

  logout: () => {
    window.location.href = '/api/logout';
  },

  login: () => {
    window.location.href = '/api/login';
  },

  updateCurrentUser: async (updates: Partial<User>): Promise<User | null> => {
    const data = await request<any>('/api/user/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        first_name: updates.name?.split(' ')[0],
        last_name: updates.name?.split(' ').slice(1).join(' '),
        profile_image_url: updates.avatar_url,
      }),
    });
    return {
      id: data.id,
      email: data.email || '',
      name: [data.firstName, data.lastName].filter(Boolean).join(' ') || data.email || 'Usuario',
      avatar_url: data.profileImageUrl,
    };
  },

  getTrips: () => request<any[]>('/api/trips').then(trips =>
    trips.map(t => ({
      id: t.id,
      name: t.name,
      destination: t.destination,
      start_date: t.startDate,
      end_date: t.endDate,
      status: t.status,
      created_at: t.createdAt,
      image_url: t.imageUrl,
    }))
  ),

  getTripById: async (id: string): Promise<Trip | undefined> => {
    try {
      const t = await request<any>(`/api/trips/${id}`);
      return {
        id: t.id,
        name: t.name,
        destination: t.destination,
        start_date: t.startDate,
        end_date: t.endDate,
        status: t.status,
        created_at: t.createdAt,
        image_url: t.imageUrl,
      };
    } catch {
      return undefined;
    }
  },

  createTrip: (tripData: Partial<Trip>) =>
    request<any>('/api/trips', {
      method: 'POST',
      body: JSON.stringify(tripData),
    }).then(t => ({
      id: t.id,
      name: t.name,
      destination: t.destination,
      start_date: t.startDate,
      end_date: t.endDate,
      status: t.status,
      created_at: t.createdAt,
      image_url: t.imageUrl,
    })),

  updateTrip: (id: string, updates: Partial<Trip>) =>
    request<any>(`/api/trips/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  joinTripByCode: (code: string) =>
    request<any>('/api/trips/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }).then(t => t ? ({
      id: t.id,
      name: t.name,
      destination: t.destination,
      start_date: t.startDate,
      end_date: t.endDate,
      status: t.status,
      created_at: t.createdAt,
      image_url: t.imageUrl,
    }) : null),

  getInviteCode: (tripId: string) =>
    request<{ code: string }>(`/api/trips/${tripId}/invite-code`).then(r => r.code),

  getTripMembers: (tripId: string): Promise<User[]> =>
    request<any[]>(`/api/trips/${tripId}/members`),

  updateMemberRole: (tripId: string, userId: string, role: string) =>
    request<any>(`/api/trips/${tripId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  removeTripMember: (tripId: string, userId: string) =>
    request<any>(`/api/trips/${tripId}/members/${userId}`, { method: 'DELETE' }),

  getExpenses: (tripId: string): Promise<Expense[]> =>
    request<Expense[]>(`/api/trips/${tripId}/expenses`),

  addExpense: (expense: Omit<Expense, 'id'>) =>
    request<Expense>(`/api/trips/${expense.trip_id}/expenses`, {
      method: 'POST',
      body: JSON.stringify(expense),
    }),

  updateExpense: (id: string, updates: Partial<Expense>) =>
    request<any>(`/api/expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  deleteExpense: (id: string) =>
    request<any>(`/api/expenses/${id}`, { method: 'DELETE' }),

  getPayments: (tripId: string): Promise<Payment[]> =>
    request<Payment[]>(`/api/trips/${tripId}/payments`),

  addPayment: (payment: Omit<Payment, 'id'>) =>
    request<Payment>(`/api/trips/${payment.trip_id}/payments`, {
      method: 'POST',
      body: JSON.stringify(payment),
    }),

  getActivities: (tripId: string): Promise<Activity[]> =>
    request<Activity[]>(`/api/trips/${tripId}/activities`),

  addActivity: (activity: Omit<Activity, 'id'>) =>
    request<Activity>(`/api/trips/${activity.trip_id}/activities`, {
      method: 'POST',
      body: JSON.stringify(activity),
    }),

  updateActivity: (id: string, updates: Partial<Activity>) =>
    request<any>(`/api/activities/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  getDocuments: (tripId: string): Promise<Document[]> =>
    request<Document[]>(`/api/trips/${tripId}/documents`),

  addDocument: (doc: Omit<Document, 'id'>) =>
    request<Document>(`/api/trips/${doc.trip_id}/documents`, {
      method: 'POST',
      body: JSON.stringify(doc),
    }),

  updateDocument: (id: string, updates: Partial<Document>) =>
    request<Document>(`/api/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  deleteDocument: (id: string) =>
    request<any>(`/api/documents/${id}`, { method: 'DELETE' }),

  getNotificationSettings: (): Promise<NotificationSettings> =>
    request<NotificationSettings>('/api/user/notifications'),

  updateNotificationSettings: (settings: NotificationSettings): Promise<NotificationSettings> =>
    request<NotificationSettings>('/api/user/notifications', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    }),

  getPins: (tripId: string): Promise<MapPin[]> =>
    request<MapPin[]>(`/api/trips/${tripId}/pins`),

  addPin: (pin: Omit<MapPin, 'id'>) =>
    request<MapPin>(`/api/trips/${pin.trip_id}/pins`, {
      method: 'POST',
      body: JSON.stringify(pin),
    }),

  deletePin: (id: string) =>
    request<any>(`/api/pins/${id}`, { method: 'DELETE' }),

  getJournalEntries: (tripId: string): Promise<JournalEntry[]> =>
    request<JournalEntry[]>(`/api/trips/${tripId}/journal`),

  saveJournalEntry: (entry: Omit<JournalEntry, 'id' | 'created_at'>) =>
    request<JournalEntry>(`/api/trips/${entry.trip_id}/journal`, {
      method: 'POST',
      body: JSON.stringify(entry),
    }),
};
