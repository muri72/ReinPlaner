/**
 * Mobile-First Utilities
 * Helper functions and constants for mobile optimization
 */

/**
 * Touch Target Guidelines
 * - Apple: Minimum 44x44pt
 * - Google Material: Minimum 48x48dp
 * - Comfortable: 56x56px for thumb-friendly interactions
 */
export const MOBILE_TOUCH_TARGET = {
  minSize: 44,        // Apple Guidelines: 44x44pt
  recommended: 48,    // Google Material: 48x48dp
  comfortable: 56,    // Optimal for thumb reach
} as const;

/**
 * Tailwind classes for mobile-optimized touch targets
 */
export const mobileTouch = {
  button: "min-h-[44px] min-w-[44px] md:min-h-[36px] md:min-w-[36px]",
  icon: "h-12 w-12 md:h-10 md:w-10",
  listItem: "min-h-[56px] py-3 md:min-h-[44px] md:py-2",
  input: "h-12 md:h-10",
  card: "p-4 md:p-3",
} as const;

/**
 * Mobile breakpoints (matching Tailwind defaults)
 */
export const MOBILE_BREAKPOINTS = {
  sm: 640,   // Small devices
  md: 768,   // Medium devices (tablets)
  lg: 1024,  // Large devices
  xl: 1280,  // Extra large
  '2xl': 1536, // 2X Extra large
} as const;

/**
 * Check if device is mobile based on screen width
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < MOBILE_BREAKPOINTS.md;
}

/**
 * Check if device supports touch
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - legacy IE support
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * Get safe area insets for iOS devices with notch
 */
export function getSafeAreaInsets() {
  if (typeof window === 'undefined') return { top: 0, right: 0, bottom: 0, left: 0 };
  
  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
    right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0'),
    bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
    left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0'),
  };
}

/**
 * Prevent iOS zoom on input focus
 * Returns font-size that prevents auto-zoom (minimum 16px)
 */
export function preventIOSZoom(baseFontSize: number = 16): string {
  return `${Math.max(baseFontSize, 16)}px`;
}

/**
 * Add haptic feedback on supported devices
 */
export function triggerHapticFeedback(style: 'light' | 'medium' | 'heavy' = 'light') {
  if (typeof window === 'undefined') return;
  
  // Check if vibration API is supported
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
    };
    navigator.vibrate(patterns[style]);
  }
}

/**
 * Mobile-optimized scroll behavior
 */
export function enableSmoothScroll(element?: HTMLElement) {
  const target = element || document.documentElement;
  target.style.scrollBehavior = 'smooth';
  // @ts-ignore - webkit-specific property
  target.style.webkitOverflowScrolling = 'touch';
}

/**
 * Disable pull-to-refresh on mobile browsers
 */
export function disablePullToRefresh() {
  if (typeof document === 'undefined') return;
  
  document.body.style.overscrollBehavior = 'contain';
}

/**
 * Get device pixel ratio for image optimization
 */
export function getDevicePixelRatio(): number {
  if (typeof window === 'undefined') return 1;
  return window.devicePixelRatio || 1;
}