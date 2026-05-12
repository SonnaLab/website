import { createContext, useContext, type ReactNode } from 'react';

interface TabsContextValue {
  active: string;
  setActive: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs subcomponent used outside <Tabs>');
  return ctx;
}

/* ── Root ── */
interface TabsProps {
  value: string;
  onValueChange: (v: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ active: value, setActive: onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

/* ── List (tab bar) ── */
interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div className={['adm-tabs__list', className].filter(Boolean).join(' ')} role="tablist">
      {children}
    </div>
  );
}

/* ── Trigger ── */
interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  icon?: ReactNode;
  count?: number;
  className?: string;
}

export function TabsTrigger({ value, children, icon, count, className }: TabsTriggerProps) {
  const { active, setActive } = useTabs();
  const isActive = active === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => setActive(value)}
      className={[
        'adm-tabs__trigger',
        isActive ? 'adm-tabs__trigger--active' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {icon && <span className="adm-tabs__trigger-icon">{icon}</span>}
      {children}
      {count !== undefined && (
        <span className="adm-tabs__count">{count}</span>
      )}
    </button>
  );
}

/* ── Panel ── */
interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const { active } = useTabs();
  if (active !== value) return null;
  return (
    <div
      role="tabpanel"
      className={['adm-tabs__panel', className].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}
