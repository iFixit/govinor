import { ServerIcon, SignalIcon } from "@heroicons/react/24/outline";

export const navigation = [
  { name: "Previews", href: "/", icon: ServerIcon, current: true },
  { name: "Activity", href: "/deployments", icon: SignalIcon, current: true },
  // { name: "Settings", href: "#", icon: Cog6ToothIcon },
] as const;
