
import { AuthUser } from "../types";
import { jwtDecode } from "jwt-decode";

/**
 * Advanced Functional Auth Service
 * Implements Google Identity Services logic and a robust Local DB for Email/Pass.
 */
class AuthService {
  private USER_DB_KEY = 'ue5_architect_users_v3';
  private SESSION_KEY = 'ue5_architect_active_session';
  private PENDING_KEY = 'ue5_architect_pending_sync';

  private getUsers(): any[] {
    const db = localStorage.getItem(this.USER_DB_KEY);
    return db ? JSON.parse(db) : [];
  }

  private saveUser(user: any) {
    const users = this.getUsers();
    const existingIdx = users.findIndex(u => u.email === user.email);
    if (existingIdx >= 0) {
        users[existingIdx] = user;
    } else {
        users.push(user);
    }
    localStorage.setItem(this.USER_DB_KEY, JSON.stringify(users));
  }

  /**
   * Generates a verification code and holds user details in a 'pending' state.
   */
  public async requestVerification(details: any): Promise<string> {
    await new Promise(r => setTimeout(r, 1500)); // Simulate network latency
    
    const users = this.getUsers();
    if (users.find(u => u.email === details.email)) {
      throw new Error("Neural ID collision: This email is already linked to an active Architect unit.");
    }

    // Generate 6-digit cryptographic code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hold the registration in suspension
    localStorage.setItem(this.PENDING_KEY, JSON.stringify({ ...details, code, timestamp: Date.now() }));
    
    return code; 
  }

  /**
   * Finalizes the account creation after code verification.
   */
  public async verifyAndSignUp(email: string, code: string): Promise<AuthUser> {
    await new Promise(r => setTimeout(r, 1000));
    
    const pendingData = localStorage.getItem(this.PENDING_KEY);
    if (!pendingData) throw new Error("Synchronization timeout: Please restart the induction process.");
    
    const pending = JSON.parse(pendingData);
    
    // Check if code matches and session hasn't expired (15 mins)
    const isExpired = Date.now() - pending.timestamp > 15 * 60 * 1000;
    if (isExpired) throw new Error("Security code expired. Re-initiate induction.");
    
    if (pending.email !== email || pending.code !== code) {
      throw new Error("Cryptographic mismatch: Verification code rejected.");
    }

    const newUser: AuthUser = {
      id: crypto.randomUUID(),
      email: pending.email,
      name: pending.name,
      studioName: pending.studioName,
      primaryRole: pending.primaryRole,
      specialty: pending.specialty,
      provider: 'email',
      isVerified: true
    };

    // Store in our local "Server"
    this.saveUser({ 
        ...newUser, 
        password: pending.password,
        scriptingPref: pending.preferredScripting,
        platformPref: pending.targetPlatform
    });
    
    this.setSession(newUser);
    localStorage.removeItem(this.PENDING_KEY);
    
    return newUser;
  }

  /**
   * Standard Email/Password sign in.
   */
  public async signIn(email: string, password: string): Promise<AuthUser> {
    await new Promise(r => setTimeout(r, 1200));
    const users = this.getUsers();
    const user = users.find(u => u.email === email);

    if (!user || user.password !== password) {
      throw new Error("Uplink credentials rejected. Access denied.");
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      studioName: user.studioName,
      primaryRole: user.primaryRole,
      specialty: user.specialty,
      photoURL: user.photoURL,
      provider: user.provider,
      isVerified: true
    };

    this.setSession(authUser);
    return authUser;
  }

  /**
   * Handles the response from real Google Identity Services.
   */
  public async handleGoogleCredential(credential: string): Promise<AuthUser> {
    await new Promise(r => setTimeout(r, 500));
    try {
        const decoded: any = jwtDecode(credential);
        
        const googleUser: AuthUser = {
            id: `google_${decoded.sub}`,
            email: decoded.email,
            name: decoded.name,
            photoURL: decoded.picture,
            provider: 'google',
            isVerified: true,
            studioName: 'Google Cloud Architect'
        };

        // Ensure user is in our DB
        this.saveUser({ ...googleUser, password: null });
        this.setSession(googleUser);
        return googleUser;
    } catch (e) {
        throw new Error("Failed to parse Google Identity token.");
    }
  }

  private setSession(user: AuthUser) {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
  }

  public getActiveSession(): AuthUser | null {
    const session = localStorage.getItem(this.SESSION_KEY);
    return session ? JSON.parse(session) : null;
  }

  public signOut() {
    localStorage.removeItem(this.SESSION_KEY);
  }
}

export const authService = new AuthService();
