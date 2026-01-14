// Firestore document types

export interface PasswordDoc {
  id: string;
  encryptedPassword: string;
  iv: string;
  recipientEmail: string;
  recipientName?: string;
  notes?: string;
  createdBy: string;
  createdByEmail: string;
  createdAt: Date;
  status: 'pending' | 'sent' | 'viewed' | 'expired' | 'revoked';
  viewedAt?: Date;
  viewedFromIP?: string;
  emailSent: boolean;
  emailSentAt?: Date;
  source: 'dashboard' | 'api' | 'batch';
  apiKeyId?: string;
  regeneratedFrom?: string;
  regeneratedTo?: string;
}

export interface ApiKeyDoc {
  id: string;
  name: string;
  keyHash: string;
  keyPrefix: string; // First 8 chars for display
  createdBy: string;
  createdByEmail: string;
  createdAt: Date;
  lastUsed?: Date;
  active: boolean;
}

export interface IpWhitelistDoc {
  id: string;
  ip: string;
  description: string;
  createdBy: string;
  createdByEmail: string;
  createdAt: Date;
}

export interface WordListDoc {
  id: string;
  name: string;
  words: string[];
  createdBy: string;
  updatedAt: Date;
}

export interface UserDoc {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'admin' | 'technician';
  createdAt: Date;
  lastLogin: Date;
}

export interface AuditLogDoc {
  id: string;
  action: 'create' | 'view' | 'send_email' | 'revoke' | 'regenerate' | 'api_call' | 'settings_change';
  actorId?: string;
  actorEmail?: string;
  targetId?: string;
  details: Record<string, unknown>;
  ip: string;
  timestamp: Date;
}

export interface EmailTemplateDoc {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  updatedBy: string;
  updatedAt: Date;
}

// UI State types

export interface CreatePasswordForm {
  recipientEmail: string;
  recipientName: string;
  password: string;
  notes: string;
  sendNotification: boolean;
  selectedWordList?: string;
}

export interface PasswordCreationResult {
  id: string;
  password: string;
  link: string;
  recipientEmail: string;
  recipientName?: string;
}

export interface DashboardStats {
  todayCount: number;
  pendingCount: number;
  viewedToday: number;
  weekCount: number;
}

// Auth context type
export interface AuthContextType {
  user: UserDoc | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}
