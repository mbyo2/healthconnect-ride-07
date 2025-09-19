import { logger } from './logger';
import { errorHandler } from './error-handler';

export interface AccessibilityPreferences {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  voiceControl: boolean;
  colorBlindness: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  focusIndicator: 'default' | 'enhanced' | 'high-contrast';
}

export interface VoiceCommand {
  phrase: string;
  action: string;
  element?: string;
  confidence: number;
}

class AdvancedAccessibilityService {
  private preferences: AccessibilityPreferences = {
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    screenReader: false,
    keyboardNavigation: true,
    voiceControl: false,
    colorBlindness: 'none',
    fontSize: 'medium',
    focusIndicator: 'default'
  };

  private speechRecognition: SpeechRecognition | null = null;
  private speechSynthesis: SpeechSynthesis | null = null;
  private focusTracker: Element | null = null;

  constructor() {
    this.initializeAccessibility();
  }

  private initializeAccessibility(): void {
    try {
      this.detectSystemPreferences();
      this.setupKeyboardNavigation();
      this.setupVoiceControl();
      this.setupScreenReaderSupport();
      this.applyAccessibilityStyles();

      logger.info('Advanced accessibility initialized', 'ACCESSIBILITY');
    } catch (error) {
      errorHandler.handleError(error, 'initializeAccessibility');
    }
  }

  private detectSystemPreferences(): void {
    // Detect system preferences
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.preferences.reducedMotion = true;
    }

    if (window.matchMedia('(prefers-contrast: high)').matches) {
      this.preferences.highContrast = true;
    }

    // Check for screen reader
    if (navigator.userAgent.includes('NVDA') || 
        navigator.userAgent.includes('JAWS') || 
        navigator.userAgent.includes('VoiceOver')) {
      this.preferences.screenReader = true;
    }
  }

  private setupKeyboardNavigation(): void {
    document.addEventListener('keydown', (event) => {
      this.handleKeyboardNavigation(event);
    });

    // Focus management
    document.addEventListener('focusin', (event) => {
      this.focusTracker = event.target as Element;
      this.announceToScreenReader(`Focused on ${this.getElementDescription(event.target as Element)}`);
    });
  }

  private handleKeyboardNavigation(event: KeyboardEvent): void {
    const { key, ctrlKey, altKey, shiftKey } = event;

    // Custom keyboard shortcuts
    if (ctrlKey && altKey) {
      switch (key) {
        case 'h':
          this.navigateToHeading();
          event.preventDefault();
          break;
        case 'l':
          this.navigateToLandmark();
          event.preventDefault();
          break;
        case 'b':
          this.navigateToButton();
          event.preventDefault();
          break;
        case 'f':
          this.navigateToForm();
          event.preventDefault();
          break;
      }
    }

    // Skip links
    if (key === 'Tab' && !shiftKey) {
      this.handleTabNavigation();
    }
  }

  private navigateToHeading(): void {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const currentIndex = Array.from(headings).indexOf(this.focusTracker as Element);
    const nextHeading = headings[currentIndex + 1] || headings[0];
    
    if (nextHeading) {
      (nextHeading as HTMLElement).focus();
      this.announceToScreenReader(`Heading: ${nextHeading.textContent}`);
    }
  }

  private navigateToLandmark(): void {
    const landmarks = document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"]');
    const currentIndex = Array.from(landmarks).indexOf(this.focusTracker as Element);
    const nextLandmark = landmarks[currentIndex + 1] || landmarks[0];
    
    if (nextLandmark) {
      (nextLandmark as HTMLElement).focus();
      this.announceToScreenReader(`Landmark: ${nextLandmark.getAttribute('role')}`);
    }
  }

  private navigateToButton(): void {
    const buttons = document.querySelectorAll('button, [role="button"]');
    const currentIndex = Array.from(buttons).indexOf(this.focusTracker as Element);
    const nextButton = buttons[currentIndex + 1] || buttons[0];
    
    if (nextButton) {
      (nextButton as HTMLElement).focus();
    }
  }

  private navigateToForm(): void {
    const formElements = document.querySelectorAll('input, select, textarea, [role="textbox"]');
    const currentIndex = Array.from(formElements).indexOf(this.focusTracker as Element);
    const nextElement = formElements[currentIndex + 1] || formElements[0];
    
    if (nextElement) {
      (nextElement as HTMLElement).focus();
    }
  }

  private handleTabNavigation(): void {
    // Ensure focus is visible
    if (this.focusTracker) {
      this.focusTracker.classList.add('focus-visible');
    }
  }

  private setupVoiceControl(): void {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.speechRecognition = new SpeechRecognition();
      
      this.speechRecognition.continuous = true;
      this.speechRecognition.interimResults = false;
      this.speechRecognition.lang = 'en-US';

      this.speechRecognition.onresult = (event) => {
        const command = event.results[event.results.length - 1][0].transcript.toLowerCase();
        this.processVoiceCommand(command);
      };
    }

    if ('speechSynthesis' in window) {
      this.speechSynthesis = window.speechSynthesis;
    }
  }

  private processVoiceCommand(command: string): void {
    const commands = [
      { phrase: 'click', action: 'click', confidence: 0.9 },
      { phrase: 'navigate to', action: 'navigate', confidence: 0.8 },
      { phrase: 'scroll down', action: 'scroll', confidence: 0.9 },
      { phrase: 'scroll up', action: 'scroll', confidence: 0.9 },
      { phrase: 'go back', action: 'back', confidence: 0.9 },
      { phrase: 'search for', action: 'search', confidence: 0.8 }
    ];

    const matchedCommand = commands.find(cmd => command.includes(cmd.phrase));
    
    if (matchedCommand) {
      this.executeVoiceCommand(matchedCommand, command);
    }
  }

  private executeVoiceCommand(voiceCommand: VoiceCommand, fullCommand: string): void {
    switch (voiceCommand.action) {
      case 'click':
        if (this.focusTracker) {
          (this.focusTracker as HTMLElement).click();
        }
        break;
      case 'scroll':
        const direction = fullCommand.includes('up') ? -1 : 1;
        window.scrollBy(0, direction * 200);
        break;
      case 'back':
        window.history.back();
        break;
      case 'search':
        const searchTerm = fullCommand.replace('search for', '').trim();
        this.performVoiceSearch(searchTerm);
        break;
    }
  }

  private performVoiceSearch(term: string): void {
    const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]') as HTMLInputElement;
    if (searchInput) {
      searchInput.value = term;
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.form?.dispatchEvent(new Event('submit'));
    }
  }

  private setupScreenReaderSupport(): void {
    // Live regions for dynamic content
    this.createLiveRegions();
    
    // ARIA labels and descriptions
    this.enhanceARIASupport();
    
    // Skip links
    this.addSkipLinks();
  }

  private createLiveRegions(): void {
    // Status announcements
    const statusRegion = document.createElement('div');
    statusRegion.id = 'status-announcements';
    statusRegion.setAttribute('aria-live', 'polite');
    statusRegion.setAttribute('aria-atomic', 'true');
    statusRegion.style.position = 'absolute';
    statusRegion.style.left = '-10000px';
    statusRegion.style.width = '1px';
    statusRegion.style.height = '1px';
    statusRegion.style.overflow = 'hidden';
    document.body.appendChild(statusRegion);

    // Alert announcements
    const alertRegion = document.createElement('div');
    alertRegion.id = 'alert-announcements';
    alertRegion.setAttribute('aria-live', 'assertive');
    alertRegion.setAttribute('aria-atomic', 'true');
    alertRegion.style.position = 'absolute';
    alertRegion.style.left = '-10000px';
    alertRegion.style.width = '1px';
    alertRegion.style.height = '1px';
    alertRegion.style.overflow = 'hidden';
    document.body.appendChild(alertRegion);
  }

  private enhanceARIASupport(): void {
    // Add missing ARIA labels
    const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
    buttons.forEach(button => {
      if (!button.textContent?.trim()) {
        const icon = button.querySelector('svg, i, [class*="icon"]');
        if (icon) {
          button.setAttribute('aria-label', this.getIconDescription(icon));
        }
      }
    });

    // Enhance form labels
    const inputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
    inputs.forEach(input => {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (!label && input.getAttribute('placeholder')) {
        input.setAttribute('aria-label', input.getAttribute('placeholder') || '');
      }
    });
  }

  private addSkipLinks(): void {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: #000;
      color: #fff;
      padding: 8px;
      text-decoration: none;
      z-index: 1000;
      border-radius: 4px;
    `;
    
    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '6px';
    });
    
    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });

    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  private getElementDescription(element: Element): string {
    const tagName = element.tagName.toLowerCase();
    const ariaLabel = element.getAttribute('aria-label');
    const textContent = element.textContent?.trim();
    
    if (ariaLabel) return ariaLabel;
    if (textContent) return `${tagName} ${textContent}`;
    
    return tagName;
  }

  private getIconDescription(icon: Element): string {
    const className = icon.className;
    
    // Common icon mappings
    const iconMap: Record<string, string> = {
      'search': 'Search',
      'menu': 'Menu',
      'close': 'Close',
      'user': 'User profile',
      'heart': 'Favorite',
      'star': 'Rating',
      'phone': 'Phone',
      'email': 'Email',
      'calendar': 'Calendar',
      'location': 'Location'
    };

    for (const [key, description] of Object.entries(iconMap)) {
      if (className.includes(key)) {
        return description;
      }
    }

    return 'Icon';
  }

  announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const regionId = priority === 'assertive' ? 'alert-announcements' : 'status-announcements';
    const region = document.getElementById(regionId);
    
    if (region) {
      region.textContent = message;
      setTimeout(() => {
        region.textContent = '';
      }, 1000);
    }

    // Also use speech synthesis if available
    if (this.speechSynthesis && this.preferences.screenReader) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      this.speechSynthesis.speak(utterance);
    }
  }

  private applyAccessibilityStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      /* High contrast mode */
      .high-contrast {
        filter: contrast(150%) brightness(120%);
      }
      
      /* Large text */
      .large-text {
        font-size: 1.25em !important;
        line-height: 1.6 !important;
      }
      
      /* Reduced motion */
      .reduced-motion * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
      
      /* Enhanced focus indicators */
      .enhanced-focus *:focus {
        outline: 3px solid #005fcc !important;
        outline-offset: 2px !important;
      }
      
      /* Color blindness filters */
      .protanopia { filter: url(#protanopia-filter); }
      .deuteranopia { filter: url(#deuteranopia-filter); }
      .tritanopia { filter: url(#tritanopia-filter); }
      
      /* Skip link styles */
      .skip-link:focus {
        top: 6px !important;
      }
    `;
    
    document.head.appendChild(style);
    this.updateAccessibilityClasses();
  }

  private updateAccessibilityClasses(): void {
    const body = document.body;
    
    body.classList.toggle('high-contrast', this.preferences.highContrast);
    body.classList.toggle('large-text', this.preferences.largeText);
    body.classList.toggle('reduced-motion', this.preferences.reducedMotion);
    body.classList.toggle('enhanced-focus', this.preferences.focusIndicator === 'enhanced');
    
    if (this.preferences.colorBlindness !== 'none') {
      body.classList.add(this.preferences.colorBlindness);
    }
  }

  updatePreferences(newPreferences: Partial<AccessibilityPreferences>): void {
    this.preferences = { ...this.preferences, ...newPreferences };
    this.updateAccessibilityClasses();
    
    // Store preferences
    localStorage.setItem('accessibility-preferences', JSON.stringify(this.preferences));
    
    this.announceToScreenReader('Accessibility preferences updated');
    logger.info('Accessibility preferences updated', 'ACCESSIBILITY', this.preferences);
  }

  getPreferences(): AccessibilityPreferences {
    return { ...this.preferences };
  }

  startVoiceControl(): void {
    if (this.speechRecognition) {
      this.speechRecognition.start();
      this.preferences.voiceControl = true;
      this.announceToScreenReader('Voice control activated');
    }
  }

  stopVoiceControl(): void {
    if (this.speechRecognition) {
      this.speechRecognition.stop();
      this.preferences.voiceControl = false;
      this.announceToScreenReader('Voice control deactivated');
    }
  }

  generateAccessibilityReport(): any {
    const issues = [];
    
    // Check for missing alt text
    const images = document.querySelectorAll('img:not([alt])');
    if (images.length > 0) {
      issues.push({
        type: 'missing-alt-text',
        count: images.length,
        severity: 'high',
        description: 'Images without alt text'
      });
    }

    // Check for missing form labels
    const unlabeledInputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
    if (unlabeledInputs.length > 0) {
      issues.push({
        type: 'missing-form-labels',
        count: unlabeledInputs.length,
        severity: 'high',
        description: 'Form inputs without labels'
      });
    }

    // Check color contrast (simplified)
    const lowContrastElements = this.checkColorContrast();
    if (lowContrastElements.length > 0) {
      issues.push({
        type: 'low-contrast',
        count: lowContrastElements.length,
        severity: 'medium',
        description: 'Elements with low color contrast'
      });
    }

    return {
      score: Math.max(0, 100 - (issues.length * 10)),
      issues,
      recommendations: this.generateRecommendations(issues)
    };
  }

  private checkColorContrast(): Element[] {
    // Simplified contrast checking
    const elements = document.querySelectorAll('*');
    const lowContrastElements: Element[] = [];
    
    elements.forEach(element => {
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;
      
      // This is a simplified check - real implementation would calculate actual contrast ratios
      if (color === backgroundColor) {
        lowContrastElements.push(element);
      }
    });
    
    return lowContrastElements;
  }

  private generateRecommendations(issues: any[]): string[] {
    const recommendations = [];
    
    if (issues.some(issue => issue.type === 'missing-alt-text')) {
      recommendations.push('Add descriptive alt text to all images');
    }
    
    if (issues.some(issue => issue.type === 'missing-form-labels')) {
      recommendations.push('Ensure all form inputs have proper labels');
    }
    
    if (issues.some(issue => issue.type === 'low-contrast')) {
      recommendations.push('Improve color contrast ratios to meet WCAG guidelines');
    }
    
    return recommendations;
  }
}

export const advancedAccessibilityService = new AdvancedAccessibilityService();
