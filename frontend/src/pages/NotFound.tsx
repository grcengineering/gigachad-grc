import { Link, useLocation } from 'react-router-dom';
import { Button, Card, CardBody, EmptyState } from '@/components/ui';
import { SearchX } from 'lucide-react';

export default function NotFound() {
  const location = useLocation();
  return (
    <Card>
      <CardBody>
        <EmptyState
          icon={<SearchX className="h-8 w-8" />}
          title="Page not found"
          description={`No platform route exists for ${location.pathname}.`}
          action={
            <Link to="/dashboard">
              <Button>Return to Dashboard</Button>
            </Link>
          }
        />
      </CardBody>
    </Card>
  );
}
