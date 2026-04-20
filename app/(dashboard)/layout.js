import Sidebar from '@/components/layout/Sidebar';
import { SidebarProvider } from '@/components/layout/SidebarContext';
import Providers from '@/components/Providers';

export default function DashboardLayout({ children }) {
  return (
    <Providers>
      <SidebarProvider>
        <div className="flex h-screen overflow-hidden bg-gray-50">
          <Sidebar />
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {children}
          </main>
        </div>
      </SidebarProvider>
    </Providers>
  );
}
