import { cn } from '@/lib/utils';

export function LogoMarca({ className }) {
  return (
    <div className={cn('flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm', className)}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-[58%]">
        <path d="M5 8h14l-1.2 10.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" />
        <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
        <path d="m9.5 13 1.8 1.8 3.4-3.6" />
      </svg>
    </div>
  );
}
