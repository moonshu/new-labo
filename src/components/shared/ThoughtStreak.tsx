"use client";

import { useMemo } from "react";
import { useSystemStore } from "@/store/useSystemStore";
import { cn } from "@/lib/utils";

const CELL_STYLE: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-muted/30",
  1: "bg-primary/20",
  2: "bg-primary/35",
  3: "bg-primary/55",
  4: "bg-primary/80",
};

export default function ThoughtStreak() {
  const getStreak = useSystemStore((state) => state.getStreak);
  const streak = getStreak(70);

  const { activeDays, columns } = useMemo(() => {
    const active = streak.filter((entry) => entry.count > 0).length;
    const result: Array<typeof streak> = [];

    for (let index = 0; index < streak.length; index += 7) {
      result.push(streak.slice(index, index + 7));
    }

    return {
      activeDays: active,
      columns: result,
    };
  }, [streak]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Thought Streak</span>
        <span>{activeDays}/70 days</span>
      </div>
      <div className="grid grid-flow-col auto-cols-max gap-1">
        {columns.map((column, columnIndex) => (
          <div key={`col-${columnIndex}`} className="grid grid-rows-7 gap-1">
            {column.map((entry) => (
              <div
                key={entry.date}
                title={`${entry.date}: ${entry.count} thoughts`}
                className={cn("w-2.5 h-2.5 rounded-[3px] border border-border/20", CELL_STYLE[entry.intensity])}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
