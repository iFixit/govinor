import { useState } from "react";
import { DesktopSidebar } from "./desktop-sidebar";
import { MobileSidebar } from "./mobile-sidebar";
import { SearchHeader } from "./search-header";

type DefaultLayoutProps = React.PropsWithChildren<{}>;

export function DefaultLayout({ children }: DefaultLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div>
      <MobileSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <DesktopSidebar />

      <div className="xl:pl-72">
        <SearchHeader onOpenSidebar={() => setSidebarOpen(true)} />
        {children}
      </div>
    </div>
  );
}
