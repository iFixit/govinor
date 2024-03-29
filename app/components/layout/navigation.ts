import { ServerIcon, SignalIcon } from "@heroicons/react/24/outline";

export const navigation = [
  { name: "Previews", href: "/", icon: ServerIcon, current: true },
  { name: "Activities", href: "/deployments", icon: SignalIcon, current: true },
] as const;
