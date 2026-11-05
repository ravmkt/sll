import { Badge, Card, EmptyState, SectionTitle } from '@/components/radar/RadarUI';

export default function OpportunitiesPage() {
  return (
    <>
      <SectionTitle right={<Badge tone="blue">Em breve</Badge>}>Oportunidades</SectionTitle>
      <Card>
        <EmptyState title="Em breve" hint="Termos em alta, sazonalidade e lacunas de conteúdo na sua região." />
      </Card>
    </>
  );
}