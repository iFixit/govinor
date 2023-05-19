import { useState } from "react";
import type { RepositoryListItem } from "~/models/repository.server";
import { DesktopSidebar } from "./desktop-sidebar";
import { MobileSidebar } from "./mobile-sidebar";
import { SearchHeader } from "./search-header";

type DefaultLayoutProps = React.PropsWithChildren<{
  repositories: RepositoryListItem[];
}>;

export function DefaultLayout({ children, repositories }: DefaultLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div>
      <MobileSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        repositories={repositories}
      />

      <DesktopSidebar repositories={repositories} />

      <div className="xl:pl-72">
        <SearchHeader onOpenSidebar={() => setSidebarOpen(true)} />
        {children}
      </div>
    </div>
  );
}
