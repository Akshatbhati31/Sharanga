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
    this.childModalView = new ChildModalView(() => {
      // Callback when profiles are added/edited/deleted
      if (this.currentScreen === AppScreen.PROFILE_SELECT) {
        this.profileSelectView.render();
      } else if (this.currentScreen === AppScreen.DASHBOARD) {
        // If active child was edited, re-render dashboard
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

  public init(): void {
    const currentUser = this.authService.getCurrentUser();
    const activeChild = this.profileService.getActiveChild();

    i18n.resolveInitialLanguage({
      authenticatedUserLang: currentUser?.interfaceLanguage,
      childPreferredLang: activeChild?.preferredLanguage,
    });

    if (currentUser && activeChild) {
      this.navigateTo(AppScreen.DASHBOARD);
    } else if (currentUser) {
      this.navigateTo(AppScreen.PROFILE_SELECT);
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
