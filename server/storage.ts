import { type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";
import { hashPassword, verifyPassword, encrypt } from './crypto';

// Extended user interface with security features
export interface SecureUser extends User {
  withdrawalPassword?: string;
  withdrawalPasswordEnc?: { encrypted: string; iv: string; authTag: string };
  securitySettings?: {
    twoFactorEnabled: boolean;
    emailVerified: boolean;
    phoneVerified: boolean;
    lastPasswordChange: Date;
  };
  auditLog?: SecurityEvent[];
}

export interface SecurityEvent {
  id: string;
  type: 'password_change' | 'withdrawal' | 'login' | 'verification';
  timestamp: Date;
  ipAddress: string;
  userAgent?: string;
  status: 'success' | 'failed' | 'pending';
  details?: string;
}

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<SecureUser | undefined>;
  getUserByUsername(username: string): Promise<SecureUser | undefined>;
  createUser(user: InsertUser): Promise<SecureUser>;
  updateUser(id: string, updates: Partial<SecureUser>): Promise<SecureUser | undefined>;
  
  // Security methods
  setWithdrawalPassword(userId: string, password: string): Promise<boolean>;
  verifyWithdrawalPassword(userId: string, password: string): Promise<boolean>;
  addSecurityEvent(userId: string, event: Omit<SecurityEvent, 'id'>): Promise<void>;
  getSecurityEvents(userId: string, limit?: number): Promise<SecurityEvent[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, SecureUser>;
  private securityEvents: Map<string, SecurityEvent[]>;

  constructor() {
    this.users = new Map();
    this.securityEvents = new Map();
  }

  async getUser(id: string): Promise<SecureUser | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<SecureUser | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<SecureUser> {
    const id = randomUUID();
    const user: SecureUser = { 
      ...insertUser, 
      id, 
      role: 'Trader', 
      kycStatus: 'Not Started', 
      membershipTier: 'Silver',
      securitySettings: {
        twoFactorEnabled: false,
        emailVerified: false,
        phoneVerified: false,
        lastPasswordChange: new Date()
      }
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<SecureUser>): Promise<SecureUser | undefined> {
    const current = this.users.get(id);
    if (!current) return undefined;
    const next: SecureUser = { ...current, ...updates } as SecureUser;
    this.users.set(id, next);
    return next;
  }

  async setWithdrawalPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    
    const hashedPassword = hashPassword(password);
    user.withdrawalPassword = hashedPassword;
    user.withdrawalPasswordEnc = encrypt(password);
    return true;
  }

  async verifyWithdrawalPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user || !user.withdrawalPassword) return false;
    
    return verifyPassword(password, user.withdrawalPassword);
  }

  async addSecurityEvent(userId: string, event: Omit<SecurityEvent, 'id'>): Promise<void> {
    const eventWithId: SecurityEvent = {
      ...event,
      id: randomUUID()
    };
    
    if (!this.securityEvents.has(userId)) {
      this.securityEvents.set(userId, []);
    }
    
    const events = this.securityEvents.get(userId) || [];
    events.unshift(eventWithId); // Add to beginning for chronological order
    
    // Keep only last 100 events
    if (events.length > 100) {
      events.splice(100);
    }
    
    this.securityEvents.set(userId, events);
  }

  async getSecurityEvents(userId: string, limit: number = 20): Promise<SecurityEvent[]> {
    const events = this.securityEvents.get(userId) || [];
    return events.slice(0, limit);
  }
}

export const storage = new MemStorage();
