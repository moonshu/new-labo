import Editor from "@/components/canvas/Editor";
import Timeline from "@/components/views/Timeline";
import RightDrawer from "@/components/shared/RightDrawer";

export default function DashboardPage() {
    return (
        <div className="flex-1 w-full h-full flex flex-row">
            {/* 캔버스 및 뷰어 영역 */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 relative h-full">
                {/* 나중에 Zustand 상태에 따라 Editor 또는 Timeline을 렌더링하도록 변경 */}
                <div className="max-w-3xl w-full flex-1 flex flex-col justify-end pb-[20vh] relative z-10 transition-all duration-300">
                    <Timeline />
                    <Editor />
                </div>
            </div>

            {/* 우측 메타데이터 / 백링크 서랍 */}
            <RightDrawer />
        </div>
    );
}
