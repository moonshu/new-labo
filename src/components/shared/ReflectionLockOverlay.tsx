"use client";

import { useSystemStore } from "@/store/useSystemStore";
import { LockKeyhole, ArrowRight, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReflectionLockOverlay() {
    const { isLocked, targetProblem, setLock } = useSystemStore();

    if (!isLocked) return null;

    return (
        <div className="absolute inset-0 z-[100] bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="max-w-xl w-full bg-card border border-destructive/20 rounded-2xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-500">

                <div className="flex flex-col items-center flex-1 gap-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
                        <LockKeyhole className="w-8 h-8 text-destructive" />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight">강제 회고 잠금 상태입니다</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            3일 이상 방치된 질문이 있습니다. 사고를 이어가거나 명시적으로 보류/종결해야 새로운 지적 활동을 시작할 수 있습니다.
                        </p>
                    </div>

                    <div className="w-full bg-muted/50 border border-border rounded-lg p-6 my-4 text-left">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                            현재 방치된 질문
                        </h3>
                        <p className="text-lg font-serif">
                            "{targetProblem?.title || "개발 생산성의 본질은 무엇인가?"}"
                        </p>
                        <div className="mt-4 pt-4 border-t border-border/50 text-sm text-muted-foreground flex justify-between">
                            <span>최초 발생일: 2024.02.01</span>
                            <span>마지막 생각: 2024.02.15</span>
                        </div>
                    </div>

                    <div className="flex w-full gap-4 mt-2">
                        <Button
                            variant="outline"
                            className="flex-1 border-muted-foreground/30 hover:bg-muted"
                            onClick={() => setLock(false)}
                        >
                            <PauseCircle className="w-4 h-4 mr-2" />
                            보류하기 (Pending)
                        </Button>
                        <Button
                            className="flex-1 font-semibold"
                            onClick={() => setLock(false)} // 지금은 그냥 언락, 실제로는 에디터로 포커스
                        >
                            생각 이어가기
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
