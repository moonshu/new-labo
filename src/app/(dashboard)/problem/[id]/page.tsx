import DashboardWorkspace from "@/components/views/DashboardWorkspace";

export default async function ProblemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DashboardWorkspace focusProblemId={id} />;
}
