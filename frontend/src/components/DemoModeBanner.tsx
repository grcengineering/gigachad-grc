import { useQuery } from '@tanstack/react-query';
import { seedApi } from '@/lib/api';
import { BeakerIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

export default function DemoModeBanner() {
  const { data: status, isLoading } = useQuery({
    queryKey: ['seed-status'],
    queryFn: () => seedApi.getStatus().then((res) => res.data),
    staleTime: 60000, // 1 minute
  });

  // Don't show if loading or demo data is not loaded
  if (isLoading || !status?.demoDataLoaded) {
    return null;
  }

  return (
    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <BeakerIcon className="h-5 w-5 text-purple-600" />
        <div>
          <span className="text-sm font-medium text-purple-600">Demo Mode Active</span>
          <span className="text-sm text-purple-600/70 ml-2">
            This organization contains demonstration data
          </span>
        </div>
      </div>
      <Link
        to="/settings/organization"
        className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium"
      >
        Clear Demo Data
        <ArrowRightIcon className="h-4 w-4" />
      </Link>
    </div>
  );
}
