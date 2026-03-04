"use client";

import { useSystemStore } from "@/store/useSystemStore";
import { daysSince, isProblemStale } from "@/lib/domain/thought-system";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function ReflectionLockOverlay() {
    const router = useRouter();
    const { problems, setSelectedProblem } = useSystemStore();

    const staleProblem = [...problems].sort(
        (left, right) => new Date(left.lastThoughtAt).getTime() - new Date(right.lastThoughtAt).getTime()
    ).find((problem) => isProblemStale(problem));

    if (!staleProblem) return null;

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 w-[min(760px,calc(100%-2rem))]">
            <div className="rounded-xl border border-destructive/35 bg-card/95 backdrop-blur px-4 py-3 shadow-lg">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-2.5 min-w-0">
                        <AlertCircle className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
                        <div className="min-w-0">
                            <p className="text-sm text-foreground truncate">
                                {daysSince(staleProblem.lastThoughtAt)}일 멈춘 질문: {staleProblem.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                잠그지 않고 신호만 보여줍니다. 원할 때 이어서 생각해보세요.
                            </p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => {
                            setSelectedProblem(staleProblem.id);
                            router.push(`/problem/${staleProblem.id}`);
                        }}
                        className="shrink-0"
                    >
                        이어서 보기
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
