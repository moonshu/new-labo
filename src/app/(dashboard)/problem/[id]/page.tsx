import DashboardWorkspace from "@/components/views/DashboardWorkspace";

export default function ProblemDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  return <DashboardWorkspace focusProblemId={id} />;
}
