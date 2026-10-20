import type {
  ParentUser,
  LoginCredentials,
  RegisterData,
  AuthResponse,
} from '../types/auth';
import { StorageService, hashPassword, hashPin, type StoredParentUser } from './storageService';

export interface VerifyPinResult {
  success: boolean;
  error?: string;
  lockoutSeconds?: number;
  remainingAttempts?: number;
}

export interface IAuthService {
  login(credentials: LoginCredentials): Promise<AuthResponse>;
  register(data: RegisterData): Promise<AuthResponse>;
  logout(): Promise<void>;
  getCurrentUser(): ParentUser | null;
  resetPassword(email: string): Promise<{ success: boolean; message: string }>;
  hasParentPin(): boolean;
  setupParentPin(newPin: string): Promise<{ success: boolean; error?: string }>;
  verifyParentPin(enteredPin: string): Promise<VerifyPinResult>;
  changeParentPin(oldPin: string, newPin: string): Promise<{ success: boolean; error?: string }>;
  getPinLockoutRemainingSeconds(): number;
  onAuthStateChanged(listener: (user: ParentUser | null) => void): () => void;
}

export class AuthService implements IAuthService {
  private static instance: AuthService;
  private storage: StorageService;
  private currentUser: ParentUser | null = null;
  private authListeners: Array<(user: ParentUser | null) => void> = [];

  private readonly MAX_PIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 30000; // 30 seconds

  private constructor() {
    this.storage = StorageService.getInstance();
    this.restoreSession();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private restoreSession(): void {
    const session = this.storage.getSession();
    if (session.userId) {
      const users = this.storage.getRawUsers();
      const found = users.find(u => u.id === session.userId);
      if (found) {
        // Strip sensitive password and pin hashes
        const { passwordHash: _, pinHash: __, failedPinAttempts: ___, pinLockoutUntil: ____, ...safeUser } = found;
        this.currentUser = safeUser;
      }
    }
  }

  public onAuthStateChanged(listener: (user: ParentUser | null) => void): () => void {
    this.authListeners.push(listener);
    listener(this.currentUser);
    return () => {
      this.authListeners = this.authListeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.authListeners) {
      try {
        listener(this.currentUser);
      } catch (err) {
        console.error('Error in auth state listener:', err);
      }
    }
  }

  public getCurrentUser(): ParentUser | null {
    return this.currentUser;
  }

  public async login(credentials: LoginCredentials): Promise<AuthResponse> {
    await new Promise(res => setTimeout(res, 250));

    const email = credentials.email.trim().toLowerCase();
    const password = credentials.password;

    if (!email) {
      return { success: false, error: 'Please enter your email address.' };
    }
    if (!this.isValidEmail(email)) {
      return { success: false, error: 'Please enter a valid email address (e.g. parent@example.com).' };
    }
    if (!password) {
      return { success: false, error: 'Please enter your password.' };
    }

    const users = this.storage.getRawUsers();
    const candidate = users.find(u => u.email.toLowerCase() === email);

    if (!candidate) {
      return {
        success: false,
        error: 'No parent account found with this email. Please check your spelling or create a new account.',
      };
    }

    const inputHash = await hashPassword(password);
    if (candidate.passwordHash !== inputHash) {
      return {
        success: false,
        error: 'Incorrect password. Please verify and try again, or use the forgot password option.',
      };
    }

    const { passwordHash: _, pinHash: __, failedPinAttempts: ___, pinLockoutUntil: ____, ...safeUser } = candidate;
    this.currentUser = safeUser;

    const currentSession = this.storage.getSession();
    this.storage.saveSession(safeUser.id, currentSession.activeChildId);

    this.notifyListeners();
    return {
      success: true,
      user: safeUser,
      message: `Welcome back, ${safeUser.fullName}!`,
    };
  }

  public async register(data: RegisterData): Promise<AuthResponse> {
    await new Promise(res => setTimeout(res, 300));

    const fullName = data.fullName.trim();
    const email = data.email.trim().toLowerCase();
    const password = data.password;
    const confirmPassword = data.confirmPassword;

    if (!fullName || fullName.length < 2) {
      return { success: false, error: 'Please provide your full parent or guardian name.' };
    }
    if (!email || !this.isValidEmail(email)) {
      return { success: false, error: 'Please provide a valid email address.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }
    if (password !== confirmPassword) {
      return { success: false, error: 'Passwords do not match. Please verify both fields.' };
    }
    if (!data.acceptTerms) {
      return { success: false, error: 'You must accept the terms of service and child privacy notice to proceed.' };
    }

    const existingUsers = this.storage.getRawUsers();
    if (existingUsers.some(u => u.email.toLowerCase() === email)) {
      return { success: false, error: 'An account with this email already exists. Please log in instead.' };
    }

    const passwordHash = await hashPassword(password);
    const newParent: StoredParentUser = {
      id: 'parent-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      fullName,
      email,
      passwordHash,
      hasPin: false, // New parent accounts must create their PIN on setup!
      failedPinAttempts: 0,
      termsAccepted: true,
      createdAt: new Date().toISOString(),
    };

    existingUsers.push(newParent);
    this.storage.saveRawUsers(existingUsers);

    const { passwordHash: _, pinHash: __, failedPinAttempts: ___, pinLockoutUntil: ____, ...safeUser } = newParent;
    this.currentUser = safeUser;
    this.storage.saveSession(safeUser.id, null);

    this.notifyListeners();
    return {
      success: true,
      user: safeUser,
      message: 'Parent account created successfully!',
    };
  }

  public async logout(): Promise<void> {
    this.currentUser = null;
    this.storage.clearSession();
    this.notifyListeners();
  }

  public async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    await new Promise(res => setTimeout(res, 300));
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !this.isValidEmail(trimmed)) {
      return { success: false, message: 'Please enter a valid email address.' };
    }

    const users = this.storage.getRawUsers();
    const user = users.find(u => u.email.toLowerCase() === trimmed);
    if (!user) {
      return {
        success: true,
        message: 'If an account exists for this email, password reset instructions have been dispatched. (Demo Mode: Use the default demo account parent@dysleximate.demo / Password123!)',
      };
    }

    return {
      success: true,
      message: `Password reset instructions sent to ${trimmed}. In demo mode, you can log in using your registered credentials.`,
    };
  }

  // -------------------------------------------------------------
  // Parent PIN Security Management
  // -------------------------------------------------------------
  public hasParentPin(): boolean {
    if (!this.currentUser) return false;
    const users = this.storage.getRawUsers();
    const user = users.find(u => u.id === this.currentUser!.id);
    return Boolean(user?.pinHash);
  }

  public getPinLockoutRemainingSeconds(): number {
    if (!this.currentUser) return 0;
    const users = this.storage.getRawUsers();
    const user = users.find(u => u.id === this.currentUser!.id);
    if (!user?.pinLockoutUntil) return 0;
    const remainingMs = user.pinLockoutUntil - Date.now();
    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
  }

  public async setupParentPin(newPin: string): Promise<{ success: boolean; error?: string }> {
    if (!this.currentUser) {
      return { success: false, error: 'Parent must be authenticated.' };
    }
    const pin = newPin.trim();
    if (!/^\d{4}$/.test(pin)) {
      return { success: false, error: 'Parent PIN must be exactly 4 numeric digits.' };
    }

    const hashed = await hashPin(pin);
    const users = this.storage.getRawUsers();
    const idx = users.findIndex(u => u.id === this.currentUser!.id);
    if (idx === -1) {
      return { success: false, error: 'Parent user not found.' };
    }

    users[idx].pinHash = hashed;
    users[idx].hasPin = true;
    users[idx].failedPinAttempts = 0;
    delete users[idx].pinLockoutUntil;
    this.storage.saveRawUsers(users);

    this.currentUser.hasPin = true;
    this.notifyListeners();
    return { success: true };
  }

  public async verifyParentPin(enteredPin: string): Promise<VerifyPinResult> {
    if (!this.currentUser) {
      return { success: false, error: 'No parent session found.' };
    }

    const users = this.storage.getRawUsers();
    const idx = users.findIndex(u => u.id === this.currentUser!.id);
    if (idx === -1) {
      return { success: false, error: 'User record not found.' };
    }

    const user = users[idx];

    // Check active lockout
    if (user.pinLockoutUntil && user.pinLockoutUntil > Date.now()) {
      const remainingSec = Math.ceil((user.pinLockoutUntil - Date.now()) / 1000);
      return {
        success: false,
        lockoutSeconds: remainingSec,
        error: `Security lockout active. Please wait ${remainingSec}s before retrying.`,
      };
    }

    if (!user.pinHash) {
      return { success: false, error: 'No PIN is set for this account. Please create one.' };
    }

    const inputHash = await hashPin(enteredPin.trim());
    if (inputHash === user.pinHash) {
      // Success! Reset attempts
      user.failedPinAttempts = 0;
      delete user.pinLockoutUntil;
      this.storage.saveRawUsers(users);
      return { success: true };
    }

    // Failed attempt
    user.failedPinAttempts = (user.failedPinAttempts || 0) + 1;
    const remaining = this.MAX_PIN_ATTEMPTS - user.failedPinAttempts;

    if (user.failedPinAttempts >= this.MAX_PIN_ATTEMPTS) {
      user.pinLockoutUntil = Date.now() + this.LOCKOUT_DURATION_MS;
      this.storage.saveRawUsers(users);
      const remainingSec = Math.ceil(this.LOCKOUT_DURATION_MS / 1000);
      return {
        success: false,
        lockoutSeconds: remainingSec,
        error: `Too many incorrect attempts. Account locked for ${remainingSec} seconds.`,
      };
    }

    this.storage.saveRawUsers(users);
    return {
      success: false,
      remainingAttempts: remaining,
      error: `Incorrect PIN. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    };
  }

  public async changeParentPin(
    oldPin: string,
    newPin: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.currentUser) {
      return { success: false, error: 'Parent must be authenticated.' };
    }

    // First verify old PIN
    const verifyOld = await this.verifyParentPin(oldPin);
    if (!verifyOld.success) {
      return {
        success: false,
        error: verifyOld.error || 'Current PIN verification failed.',
      };
    }

    const pin = newPin.trim();
    if (!/^\d{4}$/.test(pin)) {
      return { success: false, error: 'New PIN must be exactly 4 numeric digits.' };
    }
    if (oldPin.trim() === pin) {
      return { success: false, error: 'New PIN must be different from current PIN.' };
    }

    const hashed = await hashPin(pin);
    const users = this.storage.getRawUsers();
    const idx = users.findIndex(u => u.id === this.currentUser!.id);
    if (idx === -1) {
      return { success: false, error: 'User record not found.' };
    }

    users[idx].pinHash = hashed;
    users[idx].hasPin = true;
    users[idx].failedPinAttempts = 0;
    delete users[idx].pinLockoutUntil;
    this.storage.saveRawUsers(users);

    return { success: true };
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
