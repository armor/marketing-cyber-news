/**
 * ArmorLogo Component
 *
 * Theme-aware logo that automatically switches between dark/light variants
 * based on the current theme or explicit background context.
 *
 * @param backgroundContext - Override theme detection:
 *   - 'auto' (default): Uses theme context to determine logo variant
 *   - 'dark': Always use white logo (for dark containers like Header)
 *   - 'light': Always use black logo (for light containers)
 */

import { useTheme } from '@/stores/ThemeContext';

export interface ArmorLogoProps {
  readonly className?: string;
  readonly width?: number;
  readonly height?: number;
  readonly variant?: 'default' | 'with-tagline';
  /** Override theme-based logo selection for containers with fixed backgrounds */
  readonly backgroundContext?: 'auto' | 'dark' | 'light';
}

export function ArmorLogo({
  className = '',
  width = 80,
  height = 34,
  variant = 'default',
  backgroundContext = 'auto',
}: ArmorLogoProps): React.ReactElement {
  const { resolvedTheme } = useTheme();

  // Determine if we need the white or black logo
  // Dark background = white logo, Light background = black logo
  const needsWhiteLogo = backgroundContext === 'dark'
    || (backgroundContext === 'auto' && resolvedTheme === 'dark');

  const logoPath = variant === 'with-tagline'
    ? needsWhiteLogo
      ? '/branding/logos/armor-with-tagline-white.svg'
      : '/branding/logos/armor-with-tagline-black.svg'
    : needsWhiteLogo
      ? '/branding/logos/armor-dash-white-logo.svg'
      : '/branding/logos/armor-dash-black-logo.svg';

  // If className includes responsive size classes, don't use inline styles
  const hasResponsiveClasses = className.includes('md:w-') || className.includes('md:h-');

  return (
    <img
      src={logoPath}
      alt="Armor"
      width={width}
      height={height}
      className={`object-contain ${className}`}
      style={hasResponsiveClasses ? undefined : {
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  );
}

ArmorLogo.displayName = 'ArmorLogo';
