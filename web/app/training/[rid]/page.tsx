import TrainingLanding from "./client";

export default async function TrainingPage({ params }: { params: Promise<{ rid: string }> }) {
  const { rid } = await params;
  return <TrainingLanding rid={rid} />;
}