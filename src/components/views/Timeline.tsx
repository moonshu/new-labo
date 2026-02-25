"use client";

import { useSystemStore } from "@/store/useSystemStore";
import { cn } from "@/lib/utils";

export default function Timeline() {
    const { targetProblem, setLock } = useSystemStore();

    // 임시 데이터 (Phase 2에서 Supabase 연결)
    const mockNodes = [
        {
            id: "1",
            content: "기존의 노트 앱들은 너무 폴더 정리에 집착하게 만든다. 그냥 날것의 생각을 묶어두기만 하면 안되나?",
            createdAt: "2024-02-01",
            status: "OPEN",
        },
        {
            id: "2",
            content: "태그도 마찬가지다. 지식 관리라기보다 결국 '나 이렇게 정리 잘해요'라는 퍼포먼스 아닌가?",
            createdAt: "2024-02-05",
            status: "HESITATED",
        },
        {
            id: "3",
            content: "정리: 결론보다 변화의 궤적이 중요하다. 완결을 요구하지 않는 사유의 장소가 필요하다.",
            createdAt: "2024-02-15",
            status: "CONCLUDED",
        },
    ];

    if (!mockNodes || mockNodes.length === 0) {
        return null;
    }

    return (
        <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col justify-end gap-12 pb-16">
            <div className="flex justify-center mb-8">
                <h2 className="text-xl font-medium tracking-tight bg-muted/50 px-4 py-2 rounded-lg text-muted-foreground w-fit text-center">
                    어떻게 하면 완결을 강요하지 않는 사유의 장소를 만들 수 있는가?
                </h2>
            </div>

            <div className="relative border-l-2 border-border/50 pl-6 flex flex-col gap-10">
                {mockNodes.map((node, i) => (
                    <div key={node.id} className="relative group">
                        {/* Timeline dot */}
                        <div className={cn(
                            "absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-[3px] border-background",
                            node.status === "CONCLUDED" ? "bg-primary" : "bg-muted-foreground"
                        )} />

                        <div className="flex justify-between items-baseline mb-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {node.status}
                            </span>
                            <span className="text-xs text-muted-foreground opacity-60">
                                {node.createdAt}
                            </span>
                        </div>
                        <p className="text-base text-foreground/90 leading-relaxed font-serif whitespace-pre-wrap">
                            {node.content}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
