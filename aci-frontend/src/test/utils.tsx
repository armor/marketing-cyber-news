import type { ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';

interface WrapperProps {
  children: React.ReactNode;
}

/**
 * Custom render function that wraps components with necessary providers
 * This can be extended to include Router, Theme Provider, etc.
 */
const AllTheProviders = ({ children }: WrapperProps) => {
  return <>{children}</>;
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
