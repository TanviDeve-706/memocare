import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { ToastNotifications } from './ToastNotifications';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <ToastNotifications />
    </div>
  );
}
