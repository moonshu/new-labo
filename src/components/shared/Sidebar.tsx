"use client";

import { useSystemStore } from "@/store/useSystemStore";
import { cn } from "@/lib/utils";
import { Menu, Book, ListTree, Activity, Moon } from "lucide-react";

export default function Sidebar() {
    const { isSidebarOpen, toggleSidebar } = useSystemStore();

    return (
        <aside
            className={cn(
                "h-screen bg-card border-r border-border flex flex-col transition-all duration-300 relative z-20",
                isSidebarOpen ? "w-64" : "w-16 items-center"
            )}
        >
            {/* 햄버거 토글 */}
            <div className="p-4 flex items-center justify-between">
                {isSidebarOpen && <span className="font-semibold text-lg tracking-tight">Thought Map</span>}
                <button
                    onClick={toggleSidebar}
                    className="p-2 -mr-2 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                >
                    <Menu className="w-5 h-5" />
                </button>
            </div>

            {/* 메뉴 리스트 - 나중에 데이터 붙이기 */}
            <nav className="flex-1 overflow-y-auto mt-4 px-2 flex flex-col gap-2">
                <SidebarItem icon={<Book className="w-4 h-4" />} label="전체 노트 (Canvas)" isOpen={isSidebarOpen} active />
                <SidebarItem icon={<ListTree className="w-4 h-4" />} label="나의 주제 (Themes)" isOpen={isSidebarOpen} />
                <SidebarItem icon={<Activity className="w-4 h-4" />} label="열린 문제 (Problems)" isOpen={isSidebarOpen} />
            </nav>

            {/* 다크모드 무드 & 스트릭 (가짜) */}
            <div className="p-4 mt-auto border-t border-border flex flex-col gap-4">
                {isSidebarOpen ? (
                    <div className="flex items-center gap-2 px-2 text-sm text-muted-foreground">
                        <Moon className="w-4 h-4" /> <span>깊은 밤, 오직 사유만</span>
                    </div>
                ) : (
                    <Moon className="w-4 h-4 text-muted-foreground mt-2" />
                )}
            </div>
        </aside>
    );
}

function SidebarItem({ icon, label, isOpen, active }: { icon: React.ReactNode; label: string; isOpen: boolean; active?: boolean }) {
    return (
        <div
            className={cn(
                "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors whitespace-nowrap overflow-hidden",
                active ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground",
                isOpen ? "justify-start px-3" : "justify-center"
            )}
        >
            {icon}
            {isOpen && <span className="text-sm">{label}</span>}
        </div>
    );
}
