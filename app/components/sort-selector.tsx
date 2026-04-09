import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { Form, useSubmit } from "@remix-run/react";
import type { BranchSortField } from "~/models/branch.server";

interface SortSelectorProps {
  defaultValue: BranchSortField;
}

export function SortSelector({ defaultValue }: SortSelectorProps) {
  const submit = useSubmit();

  return (
    <Form method="get" onChange={(e) => submit(e.currentTarget)}>
      <div className="grid grid-cols-1">
        <select
          name="sort"
          defaultValue={defaultValue}
          className="col-start-1 row-start-1 w-full appearance-none rounded-md border-none bg-white/5 py-1.5 pr-8 pl-3 text-sm/6 text-white outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500 *:bg-gray-800"
        >
          <option value="name">Sort by name</option>
          <option value="updatedAt">Sort by last updated</option>
        </select>
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-400"
        />
      </div>
    </Form>
  );
}
