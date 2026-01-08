/**
 * Tabs Component
 *
 * Simple tab navigation component following shadcn/ui patterns.
 */

import { type ReactElement, type ReactNode, useState, createContext, useContext, type HTMLAttributes } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly content: ReactNode;
}

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  readonly tabs?: readonly TabItem[];
  readonly defaultTab?: string;
  readonly defaultValue?: string;
  readonly onChange?: (tabId: string) => void;
  readonly children?: ReactNode;
}

interface TabsContextValue {
  readonly activeTab: string;
  readonly setActiveTab: (value: string) => void;
}

// ============================================================================
// Context
// ============================================================================

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

function useTabsContext(): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs compound components must be used within Tabs');
  }
  return context;
}

// ============================================================================
// Component (Legacy)
// ============================================================================

export function Tabs({ tabs, defaultTab, defaultValue, onChange, children, className, ...props }: TabsProps): ReactElement {
  const [activeTab, setActiveTab] = useState<string>(defaultValue ?? defaultTab ?? tabs?.[0]?.id ?? '');

  const handleTabChange = (tabId: string): void => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  // If using compound component pattern (children provided without tabs prop)
  if (children && !tabs) {
    return (
      <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange }}>
        <div className={className} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  }

  // Legacy pattern with tabs array
  if (!tabs) {
    return <div className={className} {...props}>{children}</div>;
  }

  const activeContent = tabs.find((tab) => tab.id === activeTab)?.content;

  return (
    <div className={className} {...props}>
      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--spacing-1)',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: 'var(--spacing-6)',
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              style={{
                padding: 'var(--spacing-3) var(--spacing-4)',
                fontSize: 'var(--typography-font-size-sm)',
                fontWeight: 'var(--typography-font-weight-medium)',
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${isActive ? 'var(--color-primary)' : 'transparent'}`,
                cursor: 'pointer',
                transition: 'all var(--motion-duration-fast) var(--motion-ease-default)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--color-text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                }
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>{activeContent}</div>
    </div>
  );
}

// ============================================================================
// Compound Components
// ============================================================================

interface TabsListProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
}

export function TabsList({ children, className, ...props }: TabsListProps): ReactElement {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        gap: 'var(--spacing-1)',
        borderBottom: '1px solid var(--color-border)',
        marginBottom: 'var(--spacing-6)',
      }}
      {...props}
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  readonly value: string;
  readonly children: ReactNode;
}

export function TabsTrigger({ value, children, className, ...props }: TabsTriggerProps): ReactElement {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;

  return (
    <button
      type="button"
      onClick={() => setActiveTab(value)}
      className={className}
      style={{
        padding: 'var(--spacing-3) var(--spacing-4)',
        fontSize: 'var(--typography-font-size-sm)',
        fontWeight: 'var(--typography-font-weight-medium)',
        color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottom: `2px solid ${isActive ? 'var(--color-primary)' : 'transparent'}`,
        cursor: 'pointer',
        transition: 'all var(--motion-duration-fast) var(--motion-ease-default)',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)';
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
}

interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  readonly value: string;
  readonly children: ReactNode;
}

export function TabsContent({ value, children, className, ...props }: TabsContentProps): ReactElement | null {
  const { activeTab } = useTabsContext();

  if (activeTab !== value) {
    return null;
  }

  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}
