
export enum TripStatus {
  ACTIVE = 'active',
  FINISHED = 'finished',
  ARCHIVED = 'archived'
}

export enum TripRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer'
}

export enum ActivityStatus {
  PENDING = 'pending',
  DONE = 'done',
  RESCHEDULED = 'rescheduled'
}

export interface NotificationSettings {
  enabled: boolean;
  invitations: boolean;
  expenses: boolean;
  activities: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role?: string;
  notification_settings?: NotificationSettings;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  status: TripStatus;
  created_at: string;
  image_url?: string;
}

export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string;
  role: TripRole;
}

export interface Expense {
  id: string;
  trip_id: string;
  payer_id: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  participants: string[]; 
}

export interface Payment {
  id: string;
  trip_id: string;
  from_id: string;
  to_id: string;
  amount: number;
  date: string;
}

export interface Activity {
  id: string;
  trip_id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  status: ActivityStatus;
  participants?: string[];
}

export interface Document {
  id: string;
  trip_id: string;
  uploaded_by?: string;
  name: string;
  type: 'ticket' | 'reservation' | 'insurance' | 'other';
  url: string;
  file_data?: string;
  mime_type?: string;
  visibility: 'all' | 'specific';
  allowed_users?: string[];
  date: string;
}

export interface JournalEntry {
  id: string;
  trip_id: string;
  user_id: string;
  date: string;
  content: string;
  is_shared: boolean;
  created_at: string;
}

export interface MapPin {
  id: string;
  trip_id: string;
  name: string;
  address: string;
  category: string;
}
