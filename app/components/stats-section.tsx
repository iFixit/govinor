import { classNames } from "~/helpers/ui-helpers";

export interface Stat {
  name: string;
  value: string;
  unit?: string;
}

interface StatsSectionProps {
  stats: Stat[];
}

export function StatsSection({ stats }: StatsSectionProps) {
  return (
    <div className="bg-gray-900">
      <div className="grid grid-cols-1 bg-gray-700/10 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, statIdx) => (
          <div
            key={stat.name}
            className={classNames(
              statIdx % 2 === 1
                ? "sm:border-l"
                : statIdx === 2
                ? "lg:border-l"
                : "",
              "border-b border-white/5 py-6 px-4 sm:px-6 lg:px-8"
            )}
          >
            <p className="text-sm font-medium leading-6 text-gray-400">
              {stat.name}
            </p>
            <p className="mt-2 flex items-baseline gap-x-2">
              <span className="text-4xl font-semibold tracking-tight text-white">
                {stat.value}
              </span>
              {stat.unit ? (
                <span className="text-sm text-gray-400">{stat.unit}</span>
              ) : null}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
