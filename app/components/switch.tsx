import type { SwitchProps, SwitchGroupProps } from "@headlessui/react";
import { Switch as HeadlessSwitch } from "@headlessui/react";
import { useState } from "react";
import { classNames } from "~/helpers/ui-helpers";

export function Switch({ className, ...otherProps }: SwitchProps<"input">) {
  const [enabled, setEnabled] = useState(otherProps.defaultChecked ?? false);

  return (
    <HeadlessSwitch
      checked={enabled}
      onChange={setEnabled}
      className={classNames(
        className,
        enabled ? "bg-indigo-500" : "bg-white/10",
        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ring-offset-gray-800 focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
      )}
      {...otherProps}
    >
      <span
        aria-hidden="true"
        className={classNames(
          enabled ? "translate-x-5" : "translate-x-0",
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
        )}
      />
    </HeadlessSwitch>
  );
}

export function SwitchGroup({
  className,
  ...otherProps
}: SwitchGroupProps<"div">) {
  return (
    <HeadlessSwitch.Group
      as="div"
      className={classNames(className, "flex items-center justify-between")}
      {...otherProps}
    />
  );
}

export function SwitchLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <HeadlessSwitch.Label
      as="span"
      className={classNames(className, "text-sm font-medium text-white")}
      passive
    >
      {children}
    </HeadlessSwitch.Label>
  );
}

export function SwitchDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <HeadlessSwitch.Description
      as="span"
      className={classNames(className, "text-sm text-gray-500 mt-2")}
    >
      {children}
    </HeadlessSwitch.Description>
  );
}
