import { ThemePreference } from '../types';

export function applyTheme(preference: ThemePreference) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');

  if (preference === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.add('light');
    }
  } else if (preference === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.add('light');
  }
}

/**
 * Applies theme with a smooth, GPU-accelerated circular reveal or crossfade animation
 */
export function applyThemeWithAnimation(
  preference: ThemePreference,
  event?: React.MouseEvent<HTMLElement> | MouseEvent
) {
  // Respect user's motion preferences
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Use native View Transitions API if supported and motion allowed
  if (
    typeof document !== 'undefined' &&
    'startViewTransition' in document &&
    !prefersReducedMotion &&
    typeof (document as any).startViewTransition === 'function'
  ) {
    const clientX = event?.clientX ?? window.innerWidth / 2;
    const clientY = event?.clientY ?? 60;

    // Calculate maximum radius to cover the entire viewport
    const maxRadius = Math.hypot(
      Math.max(clientX, window.innerWidth - clientX),
      Math.max(clientY, window.innerHeight - clientY)
    );

    const transition = (document as any).startViewTransition(() => {
      applyTheme(preference);
    });

    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${clientX}px ${clientY}px)`,
              `circle(${maxRadius}px at ${clientX}px ${clientY}px)`,
            ],
          },
          {
            duration: 380,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            pseudoElement: '::view-transition-new(root)',
          }
        );
      })
      .catch(() => {
        // Fallback gracefully if transition fails
        applyTheme(preference);
      });

    return;
  }

  // Graceful fallback: immediate clean apply
  applyTheme(preference);
}

export function listenSystemThemeChange(callback: (isDark: boolean) => void) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches);
  };
  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}
