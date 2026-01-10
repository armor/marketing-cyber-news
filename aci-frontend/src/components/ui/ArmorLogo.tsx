/**
 * ArmorLogo Component
 *
 * Theme-aware logo that automatically switches between dark/light variants
 * based on the current theme.
 */

import { useTheme } from '@/stores/ThemeContext';

export interface ArmorLogoProps {
  readonly className?: string;
  readonly width?: number;
  readonly height?: number;
  readonly variant?: 'default' | 'with-tagline';
}

export function ArmorLogo({
  className = '',
  width = 80,
  height = 34,
  variant = 'default',
}: ArmorLogoProps): React.ReactElement {
  const { resolvedTheme } = useTheme();

  const logoPath = variant === 'with-tagline'
    ? resolvedTheme === 'dark'
      ? '/branding/logos/armor-with-tagline-white.svg'
      : '/branding/logos/armor-with-tagline-black.svg'
    : resolvedTheme === 'dark'
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
