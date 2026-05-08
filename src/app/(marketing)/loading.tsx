import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeader } from "@/components/marketing-header";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[var(--bg-deep)]">
      <MarketingHeader />

      {/* Hero Skeleton */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-24 bg-[var(--bg-elevated)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left space-y-6">
              <div className="h-4 w-48 bg-[var(--bg-muted)] rounded animate-pulse mx-auto lg:mx-0" />
              <div className="h-12 w-full bg-[var(--bg-muted)] rounded animate-pulse" />
              <div className="h-12 w-3/4 bg-[var(--bg-muted)] rounded animate-pulse" />
              <div className="h-6 w-full bg-[var(--bg-muted)] rounded animate-pulse" />
              <div className="h-6 w-2/3 bg-[var(--bg-muted)] rounded animate-pulse" />
              <div className="flex gap-4 justify-center lg:justify-start">
                <div className="h-12 w-48 bg-[var(--bg-muted)] rounded animate-pulse" />
                <div className="h-12 w-40 bg-[var(--bg-muted)] rounded animate-pulse" />
              </div>
            </div>
            <div className="h-80 bg-[var(--bg-muted)] rounded-xl animate-pulse" />
          </div>
        </div>
      </section>

      {/* Stats Skeleton */}
      <section className="py-12 bg-[var(--bg-surface)] border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center space-y-2">
                <div className="h-10 w-20 bg-[var(--bg-muted)] rounded animate-pulse mx-auto" />
                <div className="h-4 w-24 bg-[var(--bg-muted)] rounded animate-pulse mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Skeleton */}
      <section className="py-20 md:py-28 bg-[var(--bg-elevated)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="h-10 w-64 bg-[var(--bg-muted)] rounded animate-pulse mx-auto" />
            <div className="h-6 w-96 bg-[var(--bg-muted)] rounded animate-pulse mx-auto" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-6 bg-[var(--bg-card)] border border-border rounded-xl space-y-4">
                <div className="h-12 w-12 bg-[var(--bg-muted)] rounded-xl animate-pulse" />
                <div className="h-6 w-32 bg-[var(--bg-muted)] rounded animate-pulse" />
                <div className="h-4 w-full bg-[var(--bg-muted)] rounded animate-pulse" />
                <div className="h-4 w-2/3 bg-[var(--bg-muted)] rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
