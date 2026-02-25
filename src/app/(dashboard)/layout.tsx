import Sidebar from "@/components/shared/Sidebar";
import ReflectionLockOverlay from "@/components/shared/ReflectionLockOverlay";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen w-full bg-background overflow-hidden relative">
            {/* Sidebar (인덱스) */}
            <Sidebar />

            {/* Main Content (캔버스와 사이드뷰) */}
            <main className="flex-1 flex flex-col h-full relative z-0">
                {children}
            </main>

            {/* 강제 회고 잠금 오버레이 */}
            <ReflectionLockOverlay />
        </div>
    );
}
