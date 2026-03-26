
import { Trip, User, Expense, Activity, Document, Payment, TripStatus, TripRole, JournalEntry, MapPin } from '../types';

const STORAGE_KEYS = {
  USERS: 'wander_users_v3',
  TRIPS: 'wander_trips_v3',
  MEMBERS: 'wander_members_v3',
  EXPENSES: 'wander_expenses_v3',
  ACTIVITIES: 'wander_activities_v3',
  DOCUMENTS: 'wander_documents_v3',
  PAYMENTS: 'wander_payments_v3',
  JOURNAL: 'wander_journal_v3',
  PINS: 'wander_pins_v3',
  CURRENT_USER: 'wander_current_user_v3'
};

const get = <T,>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  try {
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const save = <T,>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const db = {
  login: (email: string, pass: string): User | null => {
    const users = get<any[]>(STORAGE_KEYS.USERS, []);
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);
    if (found) {
      const { password, ...user } = found;
      save(STORAGE_KEYS.CURRENT_USER, user);
      return user;
    }
    return null;
  },

  register: (userData: any): User => {
    const users = get<any[]>(STORAGE_KEYS.USERS, []);
    const newUser = {
      id: 'u-' + Math.random().toString(36).substr(2, 9),
      name: userData.name,
      email: userData.email,
      password: userData.password,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.email}`,
      notifications_enabled: true
    };
    save(STORAGE_KEYS.USERS, [...users, newUser]);
    const { password, ...userWithoutPass } = newUser;
    save(STORAGE_KEYS.CURRENT_USER, userWithoutPass);
    return userWithoutPass;
  },

  loginWithGoogle: async (): Promise<User> => {
    // Simulación de OAuth de Google persistente
    const users = get<any[]>(STORAGE_KEYS.USERS, []);
    const googleEmail = 'google.user@gmail.com';
    let user = users.find(u => u.email === googleEmail);
    
    if (!user) {
      user = {
        id: 'g-' + Math.random().toString(36).substr(2, 9),
        name: 'Usuario Google',
        email: googleEmail,
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/300/300221.png',
        notifications_enabled: true,
        password: 'google-auth-locked'
      };
      save(STORAGE_KEYS.USERS, [...users, user]);
    }
    
    const { password, ...userSafe } = user;
    save(STORAGE_KEYS.CURRENT_USER, userSafe);
    return userSafe as User;
  },

  logout: () => localStorage.removeItem(STORAGE_KEYS.CURRENT_USER),

  getCurrentUser: (): User | null => get(STORAGE_KEYS.CURRENT_USER, null),
  
  getTrips: (): Trip[] => {
    const user = db.getCurrentUser();
    if (!user) return [];
    const trips = get<Trip[]>(STORAGE_KEYS.TRIPS, []);
    const members = get<any[]>(STORAGE_KEYS.MEMBERS, []);
    const userTripIds = members
      .filter(m => String(m.user_id) === String(user.id))
      .map(m => String(m.trip_id));
    return trips.filter(t => userTripIds.includes(String(t.id)));
  },
  
  getTripById: (id: string): Trip | undefined => {
    const trips = get<Trip[]>(STORAGE_KEYS.TRIPS, []);
    return trips.find(t => t.id === id);
  },

  createTrip: (tripData: Partial<Trip>): Trip => {
    const trips = get<Trip[]>(STORAGE_KEYS.TRIPS, []);
    const user = db.getCurrentUser();
    const newTripId = Math.random().toString(36).substr(2, 6).toUpperCase();
    
    const newTrip: Trip = {
      id: newTripId,
      name: tripData.name || 'Nueva Aventura',
      destination: tripData.destination || 'Destino',
      start_date: tripData.start_date || new Date().toISOString().split('T')[0],
      end_date: tripData.end_date || new Date().toISOString().split('T')[0],
      status: TripStatus.ACTIVE,
      created_at: new Date().toISOString(),
      image_url: tripData.image_url || `https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=800`,
    };
    
    save(STORAGE_KEYS.TRIPS, [...trips, newTrip]);
    
    if (user) {
      const members = get<any[]>(STORAGE_KEYS.MEMBERS, []);
      save(STORAGE_KEYS.MEMBERS, [...members, { 
        id: 'm-' + Math.random().toString(36).substr(2, 5), 
        trip_id: newTrip.id, 
        user_id: user.id, 
        role: TripRole.ADMIN 
      }]);
    }
    return newTrip;
  },

  updateTrip: (id: string, updates: Partial<Trip>): void => {
    const trips = get<Trip[]>(STORAGE_KEYS.TRIPS, []);
    save(STORAGE_KEYS.TRIPS, trips.map(t => t.id === id ? { ...t, ...updates } : t));
  },

  joinTripByCode: (code: string): Trip | null => {
    const trips = get<Trip[]>(STORAGE_KEYS.TRIPS, []);
    const user = db.getCurrentUser();
    if (!user) return null;

    const trip = trips.find(t => t.id === code.toUpperCase());
    if (!trip) return null;

    const members = get<any[]>(STORAGE_KEYS.MEMBERS, []);
    if (!members.find(m => m.trip_id === trip.id && m.user_id === user.id)) {
      save(STORAGE_KEYS.MEMBERS, [...members, { 
        id: 'm-' + Math.random().toString(36).substr(2, 5), 
        trip_id: trip.id, 
        user_id: user.id, 
        role: TripRole.VIEWER 
      }]);
    }
    return trip;
  },

  getTripMembers: (tripId: string): User[] => {
    const members = get<any[]>(STORAGE_KEYS.MEMBERS, []);
    const users = get<User[]>(STORAGE_KEYS.USERS, []);
    const tripMemberIds = members
      .filter(m => m.trip_id === tripId)
      .map(m => m.user_id);
    return users.filter(u => tripMemberIds.includes(u.id));
  },

  addTripMember: (tripId: string, name: string, email: string): User => {
    const users = get<any[]>(STORAGE_KEYS.USERS, []);
    let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      user = {
        id: 'u-' + Math.random().toString(36).substr(2, 9),
        name: name,
        email: email,
        password: '123',
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
        notifications_enabled: true
      };
      save(STORAGE_KEYS.USERS, [...users, user]);
    }

    const members = get<any[]>(STORAGE_KEYS.MEMBERS, []);
    if (!members.find(m => m.trip_id === tripId && m.user_id === user!.id)) {
      save(STORAGE_KEYS.MEMBERS, [...members, { 
        id: 'm-' + Math.random().toString(36).substr(2, 5), 
        trip_id: tripId, 
        user_id: user!.id, 
        role: TripRole.EDITOR 
      }]);
    }
    
    return user;
  },

  removeTripMember: (tripId: string, userId: string): void => {
    const members = get<any[]>(STORAGE_KEYS.MEMBERS, []);
    save(STORAGE_KEYS.MEMBERS, members.filter(m => !(m.trip_id === tripId && m.user_id === userId)));
  },

  updateCurrentUser: (updates: Partial<User>): User | null => {
    const user = db.getCurrentUser();
    if (!user) return null;
    const updated = { ...user, ...updates };
    save(STORAGE_KEYS.CURRENT_USER, updated);
    const users = get<any[]>(STORAGE_KEYS.USERS, []);
    save(STORAGE_KEYS.USERS, users.map(u => u.id === user.id ? { ...u, ...updates } : u));
    return updated;
  },

  getExpenses: (tripId: string) => get<Expense[]>(STORAGE_KEYS.EXPENSES, []).filter(e => e.trip_id === tripId),
  addExpense: (expense: Omit<Expense, 'id'>) => {
    const items = get<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    const newItem = { ...expense, id: Math.random().toString(36).substr(2, 9) };
    save(STORAGE_KEYS.EXPENSES, [...items, newItem]);
    return newItem;
  },
  updateExpense: (id: string, updates: Partial<Expense>) => {
    const items = get<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    save(STORAGE_KEYS.EXPENSES, items.map(e => e.id === id ? { ...e, ...updates } : e));
  },
  deleteExpense: (id: string) => save(STORAGE_KEYS.EXPENSES, get<Expense[]>(STORAGE_KEYS.EXPENSES, []).filter(e => e.id !== id)),

  getPayments: (tripId: string) => get<Payment[]>(STORAGE_KEYS.PAYMENTS, []).filter(p => p.trip_id === tripId),
  addPayment: (payment: Omit<Payment, 'id'>) => {
    const items = get<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
    const newItem = { ...payment, id: Math.random().toString(36).substr(2, 9) };
    save(STORAGE_KEYS.PAYMENTS, [...items, newItem]);
    return newItem;
  },

  getActivities: (tripId: string) => get<Activity[]>(STORAGE_KEYS.ACTIVITIES, []).filter(a => a.trip_id === tripId),
  addActivity: (act: Omit<Activity, 'id'>) => {
    const items = get<Activity[]>(STORAGE_KEYS.ACTIVITIES, []);
    const newItem = { ...act, id: Math.random().toString(36).substr(2, 9) };
    save(STORAGE_KEYS.ACTIVITIES, [...items, newItem]);
    return newItem;
  },
  updateActivity: (id: string, updates: Partial<Activity>) => {
    const items = get<Activity[]>(STORAGE_KEYS.ACTIVITIES, []);
    save(STORAGE_KEYS.ACTIVITIES, items.map(a => a.id === id ? { ...a, ...updates } : a));
  },

  getDocuments: (tripId: string) => get<Document[]>(STORAGE_KEYS.DOCUMENTS, []).filter(d => d.trip_id === tripId),
  addDocument: (doc: Omit<Document, 'id'>) => {
    const items = get<Document[]>(STORAGE_KEYS.DOCUMENTS, []);
    const newItem = { ...doc, id: Math.random().toString(36).substr(2, 9) };
    save(STORAGE_KEYS.DOCUMENTS, [...items, newItem]);
    return newItem;
  },

  getPins: (tripId: string) => get<MapPin[]>(STORAGE_KEYS.PINS, []).filter(p => p.trip_id === tripId),
  addPin: (pin: Omit<MapPin, 'id'>) => {
    const items = get<MapPin[]>(STORAGE_KEYS.PINS, []);
    const newItem = { ...pin, id: Math.random().toString(36).substr(2, 9) };
    save(STORAGE_KEYS.PINS, [...items, newItem]);
    return newItem;
  },
  deletePin: (id: string) => save(STORAGE_KEYS.PINS, get<MapPin[]>(STORAGE_KEYS.PINS, []).filter(p => p.id !== id)),

  getJournalEntries: (tripId: string) => {
    const user = db.getCurrentUser();
    return get<JournalEntry[]>(STORAGE_KEYS.JOURNAL, []).filter(e => e.trip_id === tripId && (e.user_id === user?.id || e.is_shared));
  },
  saveJournalEntry: (entry: Omit<JournalEntry, 'id' | 'created_at'>) => {
    const items = get<JournalEntry[]>(STORAGE_KEYS.JOURNAL, []);
    const existing = items.find(e => e.trip_id === entry.trip_id && e.user_id === entry.user_id && e.date === entry.date);
    if (existing) {
      const updated = { ...existing, ...entry };
      save(STORAGE_KEYS.JOURNAL, items.map(e => e.id === existing.id ? updated : e));
      return updated;
    } else {
      const newItem = { ...entry, id: Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() };
      save(STORAGE_KEYS.JOURNAL, [...items, newItem]);
      return newItem;
    }
  }
};
