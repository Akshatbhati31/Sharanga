import { AuthService } from '../services/authService';
import { ProfileService } from '../services/profileService';
import { ActivityTrackerService } from '../services/activityTrackerService';
import type { ChildProfile } from '../types/auth';
import { AuthView } from './authView';
import { ChildModalView } from './childModalView';
import { ParentDashboardView } from './parentDashboardView';
import { ProfileSelectView } from './profileSelectView';
import { DashboardController } from './dashboardController';
import { i18n } from '../i18n';

export enum AppScreen {
  AUTH = 'AUTH',
  PROFILE_SELECT = 'PROFILE_SELECT',
  DASHBOARD = 'DASHBOARD',
}

export class AppController {
  private rootElement: HTMLElement;
  private authService: AuthService;
  private profileService: ProfileService;

  private currentScreen: AppScreen = AppScreen.AUTH;

  private authView: AuthView;
  private childModalView: ChildModalView;
  private parentDashboardView: ParentDashboardView;
  private profileSelectView: ProfileSelectView;
  private dashboardController: DashboardController;

  constructor(rootElement: HTMLElement) {
    this.rootElement = rootElement;
    this.authService = AuthService.getInstance();
    this.profileService = ProfileService.getInstance();

    // 1. Child Modal View (Add, Edit, Delete modals)
    this.childModalView = new ChildModalView((newChild?: ChildProfile) => {
      // Callback when profiles are added/edited/deleted
      if (this.currentScreen === AppScreen.PROFILE_SELECT) {
        this.profileSelectView.render();
      } else if (this.currentScreen === AppScreen.DASHBOARD) {
        if (newChild) {
          this.profileService.setActiveChild(newChild);
        }
        // If active child was edited or created, re-render dashboard
        const active = this.profileService.getActiveChild();
        if (active) {
          this.dashboardController.render(active);
        } else {
          this.navigateTo(AppScreen.PROFILE_SELECT);
        }
      }
    });

    // 2. Parent Dashboard View
    this.parentDashboardView = new ParentDashboardView(
      this.childModalView,
      () => {
        // Return to profiles
        this.navigateTo(AppScreen.PROFILE_SELECT);
      },
      () => {
        // Log out
        this.handleLogout();
      },
      (inspectChild: ChildProfile) => {
        // Inspect child dashboard
        this.profileService.setActiveChild(inspectChild);
        this.navigateTo(AppScreen.DASHBOARD);
      }
    );

    // 3. Auth View
    this.authView = new AuthView(this.rootElement, () => {
      this.handleAuthSuccess();
    });

    // 4. Profile Select View
    this.profileSelectView = new ProfileSelectView(
      this.rootElement,
      this.childModalView,
      this.parentDashboardView,
      (selectedChild: ChildProfile) => {
        this.handleSelectChild(selectedChild);
      },
      () => {
        this.handleLogout();
      }
    );

    // 5. Dashboard Controller
    this.dashboardController = new DashboardController(
      this.rootElement,
      this.parentDashboardView,
      () => {
        // Switch profile requested
        this.navigateTo(AppScreen.PROFILE_SELECT);
      }
    );

    // Subscribe to auth state changes to react to sign-in / sign-out
    this.authService.onAuthStateChanged((user) => {
      if (!user && this.currentScreen !== AppScreen.AUTH) {
        this.profileService.setActiveChild(null);
        this.navigateTo(AppScreen.AUTH);
      }
    });

    // Subscribe to reactive language changes across screens
    i18n.onLanguageChanged(() => {
      if (this.currentScreen === AppScreen.AUTH) {
        this.authView.render();
      } else if (this.currentScreen === AppScreen.PROFILE_SELECT) {
        this.profileSelectView.render();
      } else if (this.currentScreen === AppScreen.DASHBOARD) {
        const active = this.profileService.getActiveChild();
        if (active) {
          this.dashboardController.render(active);
        }
      }
    });
  }

  private renderLoadingSplash(): void {
    this.rootElement.innerHTML = `
      <div style="min-height: 100vh; display: grid; place-items: center; background: #fafaf8; font-family: 'Comic Neue', Nunito, sans-serif;">
        <div style="text-align: center; padding: 24px;">
          <div style="width: 48px; height: 48px; border: 4px solid #e0f2ea; border-top-color: #1a7f64; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px;"></div>
          <h2 style="font: 900 22px Nunito, sans-serif; color: #1c2e36; margin: 0 0 6px;">DyslexiMate ✿</h2>
          <p style="font-size: 14px; color: #6a7c85; margin: 0;">Restoring your learning space…</p>
        </div>
      </div>
    `;
  }

  public async init(): Promise<void> {
    this.renderLoadingSplash();

    await this.authService.waitForAuthReady();

    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      await this.profileService.restoreActiveChild(currentUser.id);
      const activeChild = this.profileService.getActiveChild();

      i18n.resolveInitialLanguage({
        authenticatedUserLang: currentUser?.interfaceLanguage,
        childPreferredLang: activeChild?.preferredLanguage,
      });

      if (activeChild) {
        this.navigateTo(AppScreen.DASHBOARD);
      } else {
        this.navigateTo(AppScreen.PROFILE_SELECT);
      }
    } else {
      this.navigateTo(AppScreen.AUTH);
    }
  }

  public navigateTo(screen: AppScreen): void {
    this.currentScreen = screen;

    if (screen === AppScreen.AUTH) {
      this.authView.setMode('entry');
    } else if (screen === AppScreen.PROFILE_SELECT) {
      this.profileSelectView.render();
    } else if (screen === AppScreen.DASHBOARD) {
      const activeChild = this.profileService.getActiveChild();
      if (activeChild) {
        this.dashboardController.render(activeChild);
      } else {
        this.navigateTo(AppScreen.PROFILE_SELECT);
      }
    }
  }

  private handleAuthSuccess(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.interfaceLanguage) {
      i18n.setLanguage(currentUser.interfaceLanguage);
    }
    this.navigateTo(AppScreen.PROFILE_SELECT);
  }

  private handleSelectChild(child: ChildProfile): void {
    this.profileService.setActiveChild(child);
    this.navigateTo(AppScreen.DASHBOARD);
  }

  private async handleLogout(): Promise<void> {
    ActivityTrackerService.getInstance().stopActivity();
    await this.authService.logout();
    this.profileService.setActiveChild(null);
    this.navigateTo(AppScreen.AUTH);
  }
}
