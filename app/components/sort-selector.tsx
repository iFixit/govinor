import { Menu, Transition } from "@headlessui/react";
import { ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { Fragment } from "react";
import { classNames } from "~/helpers/ui-helpers";
import type { BranchSortField } from "~/models/branch.server";

const SORT_OPTIONS: { value: BranchSortField; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "lastRebuiltAt", label: "Last rebuilt" },
];

interface SortSelectorProps {
  value: BranchSortField;
  onChange: (value: string) => void;
}

export function SortSelector({ value, onChange }: SortSelectorProps) {
  const activeOption =
    SORT_OPTIONS.find((o) => o.value === value) ?? SORT_OPTIONS[0];
  return (
    <Menu as="div" className="relative">
      <Menu.Button className="flex items-center gap-x-1 text-sm font-medium leading-6 text-gray-400 hover:text-white">
        Sort: {activeOption.label}
        <ChevronUpDownIcon className="h-5 w-5" aria-hidden="true" />
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
          {SORT_OPTIONS.map((option) => (
            <Menu.Item key={option.value}>
              {({ active }) => (
                <button
                  onClick={() => onChange(option.value)}
                  className={classNames(
                    active ? "bg-gray-100" : "",
                    option.value === value ? "font-semibold" : "",
                    "block w-full px-4 py-2 text-left text-sm text-gray-900"
                  )}
                >
                  {option.label}
                </button>
              )}
            </Menu.Item>
          ))}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
