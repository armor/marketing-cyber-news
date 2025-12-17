/**
 * Motion Design Tokens
 *
 * All motion/animation values must use these tokens.
 * NO HARDCODED ms/easing VALUES in components.
 *
 * Reference: CSS custom properties defined in global styles.
 */

export interface MotionDuration {
  readonly instant: string;
  readonly fast: string;
  readonly normal: string;
  readonly slow: string;
}

export interface MotionEasing {
  readonly default: string;
  readonly easeIn: string;
  readonly easeOut: string;
  readonly easeInOut: string;
  readonly spring: string;
}

export interface MotionTokens {
  readonly duration: MotionDuration;
  readonly easing: MotionEasing;
}

export const motion: MotionTokens = {
  duration: {
    instant: 'var(--motion-duration-instant)',
    fast: 'var(--motion-duration-fast)',
    normal: 'var(--motion-duration-normal)',
    slow: 'var(--motion-duration-slow)',
  },
  easing: {
    default: 'var(--motion-easing-default)',
    easeIn: 'var(--motion-easing-in)',
    easeOut: 'var(--motion-easing-out)',
    easeInOut: 'var(--motion-easing-in-out)',
    spring: 'var(--motion-easing-spring)',
  },
} as const;

export type MotionDurationKey = keyof MotionDuration;
export type MotionEasingKey = keyof MotionEasing;
