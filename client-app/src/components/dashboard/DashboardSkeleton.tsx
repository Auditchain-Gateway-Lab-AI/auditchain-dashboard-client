import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-3 px-3 py-3 lg:px-4" aria-label="Loading dashboard">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="bg-panel p-4"><Skeleton className="h-3 w-20" /><Skeleton className="mt-3 h-6 w-24" /></div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <Skeleton className="h-[360px] xl:col-span-5" />
        <Skeleton className="h-[360px] xl:col-span-4" />
        <Skeleton className="h-[360px] xl:col-span-3" />
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <Skeleton className="h-[340px] xl:col-span-3" />
        <Skeleton className="h-[340px] xl:col-span-6" />
        <Skeleton className="h-[340px] xl:col-span-3" />
      </div>
    </div>
  );
}
