import { type User, type InsertUser, users, securityEvents, notifications, type Notification } from "@shared/schema";
export type DbNotificationInsert = typeof notifications.$inferInsert
import { randomUUID } from "crypto";
import { hashPassword, verifyPassword, encrypt } from './crypto';
import { db, hasDb } from './db';
import { eq, desc, and } from 'drizzle-orm';

// Extended user interface with security features
export interface SecureUser extends User {
  withdrawalPassword?: string;
  withdrawalPasswordEncPayload?: { encrypted: string; iv: string; authTag: string };
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
  setWithdrawalPassword(userId: string, password: string): Promise<boolean>;
  verifyWithdrawalPassword(userId: string, password: string): Promise<boolean>;
  addSecurityEvent(userId: string, event: Omit<SecurityEvent, 'id'>): Promise<void>;
  getSecurityEvents(userId: string, limit?: number): Promise<SecurityEvent[]>;
  getUserByResetToken(token: string): Promise<SecureUser | undefined>;
  addNotification(notification: DbNotificationInsert): Promise<Notification>;
  getNotifications(userId: string, unreadOnly?: boolean): Promise<Notification[]>;
  markNotificationRead(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, SecureUser>;
  private securityEvents: Map<string, SecurityEvent[]>;
  private notifications: Map<string, Notification>;

  constructor() {
    this.users = new Map();
    this.securityEvents = new Map();
    this.notifications = new Map();
  }

  async getUser(id: string): Promise<SecureUser | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<SecureUser | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByResetToken(token: string): Promise<SecureUser | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.resetPasswordToken === token,
    );
  }

  async createUser(insertUser: InsertUser): Promise<SecureUser> {
    const id = randomUUID();
    const hashed = hashPassword(insertUser.password);
    const user: SecureUser = {
      username: insertUser.username,
      ...insertUser,
      password: hashed,
      id,
      role: 'Trader',
      kycStatus: 'Not Started',
      membershipTier: 'Silver',
      withdrawalPasswordHash: null,
      withdrawalPasswordEnc: null,
      withdrawalPasswordIv: null,
      withdrawalPasswordTag: null,
      twoFactorSecret: null,
      twoFactorEnabled: 0,
      resetPasswordToken: null,
      resetPasswordExpires: null,
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
    const enc = encrypt(hashedPassword);
    user.withdrawalPasswordEncPayload = enc;
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
    events.unshift(eventWithId);
    if (events.length > 100) {
      events.splice(100);
    }
    this.securityEvents.set(userId, events);
  }

  async getSecurityEvents(userId: string, limit: number = 20): Promise<SecurityEvent[]> {
    const events = this.securityEvents.get(userId) || [];
    return events.slice(0, limit);
  }

  async addNotification(notification: DbNotificationInsert): Promise<Notification> {
    const id = randomUUID();
    const newNotification: Notification = {
      id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title ?? null,
      message: notification.message,
      read: 0,
      createdAt: new Date(),
    };
    this.notifications.set(id, newNotification);
    return newNotification;
  }

  async getNotifications(userId: string, unreadOnly?: boolean): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId && (!unreadOnly || n.read === 0))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async markNotificationRead(id: string): Promise<void> {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.read = 1;
      this.notifications.set(id, notification);
    }
  }
}

export const storage = new MemStorage();

export class PgStorage implements IStorage {
  async getUser(id: string): Promise<SecureUser | undefined> {
    if (!db) return undefined
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1)
    const u = rows[0]
    if (!u) return undefined
    return { ...u }
  }
  async getUserByUsername(username: string): Promise<SecureUser | undefined> {
    if (!db) return undefined
    const rows = await db.select().from(users).where(eq(users.username, username)).limit(1)
    const u = rows[0]
    if (!u) return undefined
    return { ...u }
  }
  async getUserByResetToken(token: string): Promise<SecureUser | undefined> {
    if (!db) return undefined
    const rows = await db.select().from(users).where(eq(users.resetPasswordToken, token)).limit(1)
    const u = rows[0]
    if (!u) return undefined
    return { ...u }
  }
  async createUser(insertUser: InsertUser): Promise<SecureUser> {
    if (!db) throw new Error('No database')
    const hashed = hashPassword(insertUser.password)
    const [row] = await db.insert(users).values({ username: insertUser.username, password: hashed }).returning()
    return { ...row }
  }
  async updateUser(id: string, updates: Partial<SecureUser>): Promise<SecureUser | undefined> {
    if (!db) return undefined
    const [row] = await db.update(users).set({
      role: updates.role,
      kycStatus: updates.kycStatus,
      membershipTier: updates.membershipTier,
      withdrawalPasswordHash: updates.withdrawalPassword,
      withdrawalPasswordEnc: updates.withdrawalPasswordEncPayload?.encrypted,
      withdrawalPasswordIv: updates.withdrawalPasswordEncPayload?.iv,
      withdrawalPasswordTag: updates.withdrawalPasswordEncPayload?.authTag,
      twoFactorSecret: updates.twoFactorSecret,
      twoFactorEnabled: updates.twoFactorEnabled,
      resetPasswordToken: updates.resetPasswordToken,
      resetPasswordExpires: updates.resetPasswordExpires,
    }).where(eq(users.id, id)).returning()
    return row ? ({ ...row } as any) : undefined
  }
  async setWithdrawalPassword(userId: string, password: string): Promise<boolean> {
    if (!db) return false
    const hashed = hashPassword(password)
    const enc = encrypt(hashed)
    const [row] = await db.update(users).set({
      withdrawalPasswordHash: hashed,
      withdrawalPasswordEnc: enc.encrypted,
      withdrawalPasswordIv: enc.iv,
      withdrawalPasswordTag: enc.authTag,
    }).where(eq(users.id, userId)).returning()
    return !!row
  }
  async verifyWithdrawalPassword(userId: string, password: string): Promise<boolean> {
    if (!db) return false
    const rows = await db.select({ h: users.withdrawalPasswordHash }).from(users).where(eq(users.id, userId)).limit(1)
    const h = rows[0]?.h
    if (!h) return false
    return verifyPassword(password, h)
  }
  async addSecurityEvent(userId: string, event: Omit<SecurityEvent, 'id'>): Promise<void> {
    if (!db) return
    await db.insert(securityEvents).values({
      userId,
      type: event.type,
      status: event.status,
      ipAddress: event.ipAddress,
      details: event.details,
    })
  }
  async getSecurityEvents(userId: string, limit: number = 20): Promise<SecurityEvent[]> {
    if (!db) return []
    const rows = await db.select().from(securityEvents).where(eq(securityEvents.userId, userId)).orderBy(desc(securityEvents.occurredAt)).limit(limit)
    return rows.map((r) => ({ id: r.id, type: r.type as any, timestamp: r.occurredAt as any, ipAddress: r.ipAddress, status: r.status as any, details: r.details ?? undefined }))
  }

  async addNotification(notification: DbNotificationInsert): Promise<Notification> {
    if (!db) throw new Error('No database');
    const [row] = await db.insert(notifications).values(notification).returning();
    return row;
  }

  async getNotifications(userId: string, unreadOnly?: boolean): Promise<Notification[]> {
    if (!db) return [];
    let query = db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
    
    if (unreadOnly) {
      query = db.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.read, 0))).orderBy(desc(notifications.createdAt));
    }
    
    return await query;
  }

  async markNotificationRead(id: string): Promise<void> {
    if (!db) return;
    await db.update(notifications).set({ read: 1 }).where(eq(notifications.id, id));
  }
}

export const storageDb = hasDb ? new PgStorage() : new MemStorage()
