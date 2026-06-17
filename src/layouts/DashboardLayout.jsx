import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { SidebarProvider } from "../context/SidebarContext";

function DashboardLayout({ children }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-slate-950">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar />

          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default DashboardLayout;
