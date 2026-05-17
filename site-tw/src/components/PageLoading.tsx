interface PageLoadingProps {
  label?: string;
}

export default function PageLoading({ label = 'Loading...' }: PageLoadingProps) {
  return (
    <main className="site-shell py-12">
      <div className="text-center text-slate-400 min-h-[50vh] flex items-center justify-center">
        <div className="animate-pulse text-xl">{label}</div>
      </div>
    </main>
  );
}
