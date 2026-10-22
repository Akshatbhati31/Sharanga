import type {
  ParentUser,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  AppLanguageCode,
} from '../types/auth';
import { StorageService, hashPassword, hashPin, type StoredParentUser } from './storageService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { i18n } from '../i18n';

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
  isLiveDatabaseConnected(): boolean;
  updateInterfaceLanguage(lang: AppLanguageCode): Promise<boolean>;
}

export class AuthService implements IAuthService {
  private static instance: AuthService;
  private storage: StorageService;
  private currentUser: ParentUser | null = null;
  private authListeners: Array<(user: ParentUser | null) => void> = [];

  // In-memory lockout & attempt tracker (also syncs with storage/session)
  private failedPinAttempts = 0;
  private pinLockoutUntil: number | null = null;
  private readonly MAX_PIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 30000; // 30 seconds

  private constructor() {
    this.storage = StorageService.getInstance();
    this.restoreSession();
    this.initSupabaseAuthListener();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Reports whether a live Supabase backend is configured and active.
   */
  public isLiveDatabaseConnected(): boolean {
    return isSupabaseConfigured();
  }

  private async restoreSession(): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Supabase getSession error:', error.message);
        } else if (session?.user) {
          await this.syncSupabaseUser(session.user);
          return;
        }
      } catch (err) {
        console.error('Error restoring Supabase session:', err);
      }
    }

    // Fallback: local session
    const session = this.storage.getSession();
    if (session.userId) {
      const users = this.storage.getRawUsers();
      const found = users.find(u => u.id === session.userId);
      if (found) {
        const { passwordHash: _, pinHash: __, failedPinAttempts: ___, pinLockoutUntil: ____, ...safeUser } = found;
        this.currentUser = safeUser;
      }
    }
  }

  private initSupabaseAuthListener(): void {
    if (!isSupabaseConfigured() || !supabase) return;

    try {
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Sync profile only if not already loaded as current user
          if (!this.currentUser || this.currentUser.id !== session.user.id) {
            await this.syncSupabaseUser(session.user);
          }
        } else if (event === 'SIGNED_OUT') {
          this.currentUser = null;
          this.storage.clearSession();
          this.notifyListeners();
        }
      });
    } catch (err) {
      console.warn('Failed to attach Supabase auth state listener:', err);
    }
  }

  private async syncSupabaseUser(user: { id: string; email?: string; user_metadata?: Record<string, any>; created_at?: string }): Promise<void> {
    if (!supabase) return;

    try {
      const { data: profile } = await supabase
        .from('parent_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const { data: pref } = await supabase
        .from('account_preferences')
        .select('interface_language')
        .eq('parent_id', user.id)
        .maybeSingle();

      const savedLang = (pref?.interface_language || profile?.interface_language) as AppLanguageCode | undefined;
      if (savedLang) {
        await i18n.setLanguage(savedLang);
      }

      const fullName = profile?.full_name || user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'Parent');
      const hasPin = Boolean(profile?.parent_pin_hash);

      this.currentUser = {
        id: user.id,
        email: user.email || '',
        fullName,
        hasPin,
        termsAccepted: true,
        interfaceLanguage: savedLang || i18n.getCurrentLanguage(),
        createdAt: profile?.created_at || user.created_at || new Date().toISOString(),
      };

      const currentSession = this.storage.getSession();
      this.storage.saveSession(this.currentUser.id, currentSession.activeChildId);
      this.notifyListeners();
    } catch (err) {
      console.error('Error syncing Supabase user profile:', err);
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

    // Preserve seeded demo parent login under all conditions
    const isDemoAccount = email === 'parent@dysleximate.demo';
    if (isDemoAccount || !isSupabaseConfigured() || !supabase) {
      await new Promise(res => setTimeout(res, 200));
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
      if (candidate.interfaceLanguage) {
        await i18n.setLanguage(candidate.interfaceLanguage);
      } else {
        candidate.interfaceLanguage = i18n.getCurrentLanguage();
        this.storage.saveRawUsers(users);
      }
      safeUser.interfaceLanguage = candidate.interfaceLanguage;
      this.currentUser = safeUser;
      const currentSession = this.storage.getSession();
      this.storage.saveSession(safeUser.id, currentSession.activeChildId);

      this.notifyListeners();
      return {
        success: true,
        user: safeUser,
        message: `Welcome back, ${safeUser.fullName}! (Demo Mode)`,
      };
    }

    // Authenticate with Supabase Auth
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          return {
            success: false,
            error: 'Your email address has not been confirmed yet. Please verify your email inbox.',
          };
        }
        if (error.message.toLowerCase().includes('invalid login credentials')) {
          return {
            success: false,
            error: 'Incorrect email or password. Please verify your credentials and try again.',
          };
        }
        return {
          success: false,
          error: error.message || 'Authentication failed. Please verify your credentials.',
        };
      }

      if (!data.user) {
        return { success: false, error: 'Unable to retrieve user credentials from server.' };
      }

      // Fetch or ensure parent profile row
      const { data: profile } = await supabase
        .from('parent_profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      const { data: pref } = await supabase
        .from('account_preferences')
        .select('interface_language')
        .eq('parent_id', data.user.id)
        .maybeSingle();

      const savedLang = (pref?.interface_language || profile?.interface_language) as AppLanguageCode | undefined;
      if (savedLang) {
        await i18n.setLanguage(savedLang);
      } else {
        const currentLang = i18n.getCurrentLanguage();
        await this.updateInterfaceLanguage(currentLang);
      }

      const fullName = profile?.full_name || data.user.user_metadata?.full_name || email.split('@')[0];
      const hasPin = Boolean(profile?.parent_pin_hash);

      const safeUser: ParentUser = {
        id: data.user.id,
        email: data.user.email || email,
        fullName,
        hasPin,
        termsAccepted: true,
        interfaceLanguage: savedLang || i18n.getCurrentLanguage(),
        createdAt: profile?.created_at || data.user.created_at,
      };

      this.currentUser = safeUser;
      const currentSession = this.storage.getSession();
      this.storage.saveSession(safeUser.id, currentSession.activeChildId);

      this.notifyListeners();
      return {
        success: true,
        user: safeUser,
        message: `Welcome back, ${safeUser.fullName}!`,
      };
    } catch (err: any) {
      console.error('Supabase login exception:', err);
      return {
        success: false,
        error: err.message || 'Network error while contacting authentication service.',
      };
    }
  }

  public async register(data: RegisterData): Promise<AuthResponse> {
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

    if (!isSupabaseConfigured() || !supabase) {
      await new Promise(res => setTimeout(res, 250));
      const existingUsers = this.storage.getRawUsers();
      if (existingUsers.some(u => u.email.toLowerCase() === email)) {
        return { success: false, error: 'An account with this email already exists. Please log in instead.' };
      }

      const selectedInterfaceLang = data.interfaceLanguage || i18n.getCurrentLanguage();
      await i18n.setLanguage(selectedInterfaceLang);

      const passwordHash = await hashPassword(password);
      const newParent: StoredParentUser = {
        id: 'parent-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        fullName,
        email,
        passwordHash,
        hasPin: false,
        failedPinAttempts: 0,
        termsAccepted: true,
        interfaceLanguage: selectedInterfaceLang,
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
        message: 'Parent account created successfully! (Demo Mode)',
      };
    }

    // Register with Supabase Auth
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes('already registered')) {
          return { success: false, error: 'An account with this email already exists. Please log in instead.' };
        }
        return { success: false, error: error.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Registration failed. No user was returned by the auth server.' };
      }

      const selectedInterfaceLang = data.interfaceLanguage || i18n.getCurrentLanguage();
      await i18n.setLanguage(selectedInterfaceLang);

      // Upsert parent profile to prevent race conditions or missing profiles
      try {
        await supabase.from('parent_profiles').upsert({
          id: authData.user.id,
          full_name: fullName,
          interface_language: selectedInterfaceLang,
        });
        await supabase.from('account_preferences').upsert({
          parent_id: authData.user.id,
          interface_language: selectedInterfaceLang,
        }, { onConflict: 'parent_id' });
      } catch (upsertErr) {
        console.warn('Upsert to parent_profiles encountered error:', upsertErr);
      }

      // Handle email confirmation requirement
      if (!authData.session) {
        return {
          success: true,
          message: 'Account created! Please check your email to confirm your address before logging in.',
        };
      }

      const safeUser: ParentUser = {
        id: authData.user.id,
        email: authData.user.email || email,
        fullName,
        hasPin: false,
        termsAccepted: true,
        interfaceLanguage: selectedInterfaceLang,
        createdAt: authData.user.created_at,
      };

      this.currentUser = safeUser;
      this.storage.saveSession(safeUser.id, null);
      this.notifyListeners();

      return {
        success: true,
        user: safeUser,
        message: 'Parent account created successfully!',
      };
    } catch (err: any) {
      console.error('Supabase registration error:', err);
      return {
        success: false,
        error: err.message || 'Network error occurred during registration. Please try again.',
      };
    }
  }

  public async logout(): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Error signing out of Supabase:', err);
      }
    }

    this.currentUser = null;
    this.storage.clearSession();
    this.notifyListeners();
  }

  public async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !this.isValidEmail(trimmed)) {
      return { success: false, message: 'Please enter a valid email address.' };
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        });
        if (error) {
          return { success: false, message: error.message };
        }
        return {
          success: true,
          message: `Password reset instructions dispatched to ${trimmed}. Check your inbox.`,
        };
      } catch (err: any) {
        return { success: false, message: err.message || 'Failed to dispatch password reset email.' };
      }
    }

    const users = this.storage.getRawUsers();
    const user = users.find(u => u.email.toLowerCase() === trimmed);
    if (!user) {
      return {
        success: true,
        message: 'If an account exists for this email, password reset instructions have been dispatched. (Demo Mode: parent@dysleximate.demo / Password123!)',
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
    return Boolean(this.currentUser.hasPin);
  }

  public getPinLockoutRemainingSeconds(): number {
    if (!this.currentUser) return 0;

    const users = this.storage.getRawUsers();
    const user = users.find(u => u.id === this.currentUser!.id);
    const lockoutUntil = user ? user.pinLockoutUntil : this.pinLockoutUntil;

    if (!lockoutUntil) return 0;
    const remainingMs = lockoutUntil - Date.now();
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

    if (isSupabaseConfigured() && supabase && !this.currentUser.id.startsWith('parent-demo-')) {
      try {
        const { error } = await supabase
          .from('parent_profiles')
          .update({ parent_pin_hash: hashed })
          .eq('id', this.currentUser.id);

        if (error) {
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to persist parent PIN.' };
      }
    }

    // Always update local cache/storage
    const users = this.storage.getRawUsers();
    const idx = users.findIndex(u => u.id === this.currentUser!.id);
    if (idx !== -1) {
      users[idx].pinHash = hashed;
      users[idx].hasPin = true;
      users[idx].failedPinAttempts = 0;
      delete users[idx].pinLockoutUntil;
      this.storage.saveRawUsers(users);
    }

    this.failedPinAttempts = 0;
    this.pinLockoutUntil = null;
    this.currentUser.hasPin = true;
    this.notifyListeners();
    return { success: true };
  }

  public async verifyParentPin(enteredPin: string): Promise<VerifyPinResult> {
    if (!this.currentUser) {
      return { success: false, error: 'No parent session found.' };
    }

    // Check lockout state
    const remainingLockout = this.getPinLockoutRemainingSeconds();
    if (remainingLockout > 0) {
      return {
        success: false,
        lockoutSeconds: remainingLockout,
        error: `Security lockout active. Please wait ${remainingLockout}s before retrying.`,
      };
    }

    let targetHash: string | undefined;

    if (isSupabaseConfigured() && supabase && !this.currentUser.id.startsWith('parent-demo-')) {
      try {
        const { data, error } = await supabase
          .from('parent_profiles')
          .select('parent_pin_hash')
          .eq('id', this.currentUser.id)
          .single();

        if (error) {
          return { success: false, error: error.message };
        }
        targetHash = data?.parent_pin_hash || undefined;
      } catch (err: any) {
        console.warn('Error querying parent PIN from Supabase:', err);
      }
    }

    if (!targetHash) {
      const users = this.storage.getRawUsers();
      const user = users.find(u => u.id === this.currentUser!.id);
      targetHash = user?.pinHash;
    }

    if (!targetHash) {
      return { success: false, error: 'No PIN is set for this account. Please create one.' };
    }

    const inputHash = await hashPin(enteredPin.trim());
    if (inputHash === targetHash) {
      this.failedPinAttempts = 0;
      this.pinLockoutUntil = null;

      const users = this.storage.getRawUsers();
      const idx = users.findIndex(u => u.id === this.currentUser!.id);
      if (idx !== -1) {
        users[idx].failedPinAttempts = 0;
        delete users[idx].pinLockoutUntil;
        this.storage.saveRawUsers(users);
      }
      return { success: true };
    }

    // Failed attempt handling
    const users = this.storage.getRawUsers();
    const idx = users.findIndex(u => u.id === this.currentUser!.id);
    const prevAttempts = (idx !== -1 && typeof users[idx].failedPinAttempts === 'number')
      ? users[idx].failedPinAttempts!
      : this.failedPinAttempts;

    const newAttempts = prevAttempts + 1;
    this.failedPinAttempts = newAttempts;
    const remaining = this.MAX_PIN_ATTEMPTS - newAttempts;

    if (newAttempts >= this.MAX_PIN_ATTEMPTS) {
      const lockoutTimestamp = Date.now() + this.LOCKOUT_DURATION_MS;
      this.pinLockoutUntil = lockoutTimestamp;

      if (idx !== -1) {
        users[idx].failedPinAttempts = newAttempts;
        users[idx].pinLockoutUntil = lockoutTimestamp;
        this.storage.saveRawUsers(users);
      }

      const remainingSec = Math.ceil(this.LOCKOUT_DURATION_MS / 1000);
      return {
        success: false,
        lockoutSeconds: remainingSec,
        error: `Too many incorrect attempts. Account locked for ${remainingSec} seconds.`,
      };
    }

    if (idx !== -1) {
      users[idx].failedPinAttempts = newAttempts;
      this.storage.saveRawUsers(users);
    }

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

    return this.setupParentPin(pin);
  }

  public async updateInterfaceLanguage(lang: AppLanguageCode): Promise<boolean> {
    if (this.currentUser) {
      this.currentUser.interfaceLanguage = lang;
    }

    // Update in local demo storage
    const users = this.storage.getRawUsers();
    if (this.currentUser) {
      const idx = users.findIndex(u => u.id === this.currentUser!.id);
      if (idx !== -1) {
        users[idx].interfaceLanguage = lang;
        this.storage.saveRawUsers(users);
      }
    }

    // Update in Supabase live tables if configured and not demo parent
    if (isSupabaseConfigured() && supabase && this.currentUser && this.currentUser.id !== 'parent-demo-1') {
      try {
        await supabase
          .from('parent_profiles')
          .update({ interface_language: lang })
          .eq('id', this.currentUser.id);

        await supabase
          .from('account_preferences')
          .upsert(
            { parent_id: this.currentUser.id, interface_language: lang },
            { onConflict: 'parent_id' }
          );
      } catch (err) {
        console.warn('Failed to update Supabase language preference:', err);
      }
    }
    return true;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
