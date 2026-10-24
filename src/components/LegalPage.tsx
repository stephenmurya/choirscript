import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type LegalPageProps = {
  title: string;
  description: string;
  effectiveDate: string;
  children: ReactNode;
};

export function LegalPage({ title, description, effectiveDate, children }: LegalPageProps) {
  return (
    <main className="min-h-svh bg-background px-4 py-6 text-foreground sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-6">
          <Link href="/login" className="flex items-center gap-3" aria-label="ChoirScript sign in">
            <span className="grid size-9 place-items-center rounded-xl bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
              CS
            </span>
            <span className="font-semibold">ChoirScript</span>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/login" />}
          >
            <ArrowLeft data-icon="inline-start" />
            Back to sign in
          </Button>
        </header>

        <article className="rounded-2xl border border-border/70 bg-card px-5 py-7 shadow-sm sm:px-10 sm:py-10">
          <header className="border-b border-border/70 pb-8">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Legal
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              {description}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">Effective {effectiveDate}</p>
          </header>

          <div className="legal-document mt-8 space-y-9 text-[0.9375rem] leading-7 text-muted-foreground">
            {children}
          </div>
        </article>

        <footer className="py-8 text-center text-sm text-muted-foreground">
          <Link href="/privacy" className="underline-offset-4 hover:text-foreground hover:underline">
            Privacy Policy
          </Link>
          <span className="mx-3" aria-hidden="true">
            ·
          </span>
          <Link href="/terms" className="underline-offset-4 hover:text-foreground hover:underline">
            Terms of Service
          </Link>
        </footer>
      </div>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
