import { LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

interface LoaderData {
  cwd: string;
}

export let loader: LoaderFunction = async ({ params }): Promise<LoaderData> => {
  return {
    cwd: process.cwd(),
  };
};

export default function DemoPage() {
  const { cwd } = useLoaderData<LoaderData>();
  return (
    <div className="max-w-4xl mx-auto px-8">
      <header className="py-8">
        <h2 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
          Demo
        </h2>
      </header>

      <main className="text-white">
        <p>CWD: "{cwd}"</p>
      </main>
    </div>
  );
}
