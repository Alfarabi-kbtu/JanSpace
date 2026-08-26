import { AccountNav } from "@/components/account-nav";

export function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6 lg:flex-row lg:gap-10">
      <AccountNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
