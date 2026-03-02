import React, { ComponentType, lazy, Suspense, ReactNode } from 'react';
import Loading from '@/components/Loading';

/**
 * Options for lazy loading a component
 */
interface LazyLoadOptions {
  /**
   * Fallback component to show while loading
   */
  fallback?: ReactNode;
  /**
   * Minimum delay before showing the component (to prevent flash of loading state)
   */
  minimumDelay?: number;
  /**
   * Whether to preload the component on hover/focus
   */
  preload?: boolean;
}

/**
 * Creates a lazy-loaded component with a loading fallback
 *
 * @example
 * // Basic usage
 * const Dashboard = lazyLoad(() => import('@/pages/Dashboard'));
 *
 * @example
 * // With custom fallback
 * const Dashboard = lazyLoad(
 *   () => import('@/pages/Dashboard'),
 *   { fallback: <DashboardSkeleton /> }
 * );
 *
 * @example
 * // With preloading
 * const Dashboard = lazyLoad(
 *   () => import('@/pages/Dashboard'),
 *   { preload: true }
 * );
 * // Then call Dashboard.preload() to preload the component
 */
export function lazyLoad<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): React.LazyExoticComponent<T> & { preload: () => Promise<void> } {
  const { fallback = <Loading fullScreen message="Loading..." />, minimumDelay = 0 } = options;

  let importPromise: Promise<{ default: T }> | null = null;

  // Wrap the import function to add minimum delay
  const wrappedImport = async () => {
    if (minimumDelay > 0) {
      const [module] = await Promise.all([
        importFn(),
        new Promise((resolve) => setTimeout(resolve, minimumDelay)),
      ]);
      return module;
    }
    return importFn();
  };

  const LazyComponent = lazy(wrappedImport);

  // Preload function
  const preload = async () => {
    if (!importPromise) {
      importPromise = importFn();
    }
    await importPromise;
  };

  // Create the wrapped component
  const WrappedComponent = React.forwardRef<unknown, React.ComponentProps<T>>((props, ref) => (
    <Suspense fallback={fallback}>
      {}
      <LazyComponent {...(props as any)} ref={ref} />
    </Suspense>
  )) as unknown as React.LazyExoticComponent<T> & { preload: () => Promise<void> };

  WrappedComponent.preload = preload;

  return WrappedComponent;
}

/**
 * Preloads multiple components
 *
 * @example
 * // Preload common routes on app mount
 * useEffect(() => {
 *   preloadComponents([Dashboard, Controls, Risks]);
 * }, []);
 */
export async function preloadComponents(
  components: Array<{ preload: () => Promise<void> }>
): Promise<void> {
  await Promise.all(components.map((c) => c.preload()));
}

/**
 * Creates a component that preloads other components on hover
 *
 * @example
 * <PreloadOnHover preload={[Dashboard, Controls]}>
 *   <Link to="/dashboard">Dashboard</Link>
 * </PreloadOnHover>
 */
export function PreloadOnHover({
  children,
  preload,
}: {
  children: ReactNode;
  preload: Array<{ preload: () => Promise<void> }>;
}) {
  const handleHover = () => {
    preloadComponents(preload);
  };

  return (
    <div onMouseEnter={handleHover} onFocus={handleHover}>
      {children}
    </div>
  );
}

/**
 * HOC that adds preloading on component mount
 *
 * @example
 * const DashboardWithPreload = withPreload(Dashboard, [Controls, Risks]);
 */
export function withPreload<P extends object>(
  Component: ComponentType<P>,
  componentsToPreload: Array<{ preload: () => Promise<void> }>
): ComponentType<P> {
  return function PreloadWrapper(props: P) {
    React.useEffect(() => {
      preloadComponents(componentsToPreload);
    }, []);

    return <Component {...props} />;
  };
}

// Default export for convenience
export default lazyLoad;
