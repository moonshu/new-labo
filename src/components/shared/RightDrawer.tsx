"use client";

import { useSystemStore } from "@/store/useSystemStore";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export default function RightDrawer() {
    const { isRightDrawerOpen, toggleRightDrawer } = useSystemStore();

    return (
        <aside
            className={cn(
                "fixed right-0 top-0 h-screen bg-card border-l border-border transform transition-transform duration-300 z-30 flex flex-col w-80",
                isRightDrawerOpen ? "translate-x-0" : "translate-x-full"
            )}
        >
            <div className="p-4 border-b border-border flex justify-between items-center">
                <h3 className="font-semibold text-sm text-foreground">관계성 (The Graph)</h3>
                <button
                    onClick={toggleRightDrawer}
                    className="p-1 rounded-md hover:bg-muted text-muted-foreground"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* 임시 콘텐츠 */}
                <p className="text-sm text-muted-foreground text-center mt-10">
                    선택된 사고 노드가 없거나<br />아직 분석된 관계가 없습니다.
                </p>
            </div>
        </aside>
    );
}
