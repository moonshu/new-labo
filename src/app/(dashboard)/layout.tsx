import Sidebar from "@/components/shared/Sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen w-full bg-background overflow-hidden relative">
            <Sidebar />
            <main className="flex-1 flex flex-col h-full relative z-0">
                {children}
            </main>
        </div>
    );
}
