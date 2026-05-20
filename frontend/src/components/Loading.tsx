interface LoadingProps {
  fullScreen?: boolean;
  message?: string;
}

export default function Loading({ fullScreen = true, message = 'Loading...' }: LoadingProps) {
  return (
    <div
      className={`${fullScreen ? 'min-h-screen' : 'min-h-[200px]'} flex items-center justify-center bg-surface-950`}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-surface-700 rounded-full animate-spin border-t-brand-500"></div>
        </div>
        <p className="text-surface-600 text-sm">{message}</p>
      </div>
    </div>
  );
}
