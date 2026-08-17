"use client";

export default function ComingSoonPage({
  title = "Coming soon",
  description = "This feature will be enabled once game modules are live.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
