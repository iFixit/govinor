import { useState } from "react";
import type { RepositoryListItem } from "~/models/repository.server";
import { DesktopSidebar } from "./desktop-sidebar";
import { MobileSidebar } from "./mobile-sidebar";
import { TopBar } from "./top-bar";

type DefaultLayoutProps = React.PropsWithChildren<{
  repositories: RepositoryListItem[];
  nodeVersion: string;
}>;

export function DefaultLayout({
  children,
  repositories,
  nodeVersion,
}: DefaultLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div>
      <MobileSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        repositories={repositories}
      />

      <DesktopSidebar repositories={repositories} nodeVersion={nodeVersion} />

      <div className="xl:pl-72">
        <TopBar onOpenSidebar={() => setSidebarOpen(true)} />
        {children}
      </div>
    </div>
  );
}
