import { AlertTriangle, Plus } from 'lucide-react';
import { Button, Card, EmptyState, PageHeader } from '@/components/ui';

export default function AuditFindings() {
  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Audit Findings"
        description="Track and remediate audit findings and observations."
        actions={
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
            New Finding
          </Button>
        }
      />

      <Card>
        <EmptyState
          icon={<AlertTriangle className="h-8 w-8" />}
          title="No findings yet"
          description="Audit findings will appear here as audits are conducted."
        />
      </Card>
    </div>
  );
}
