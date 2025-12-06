export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-surface-700 rounded-full animate-spin border-t-brand-500"></div>
        </div>
        <p className="text-surface-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}



