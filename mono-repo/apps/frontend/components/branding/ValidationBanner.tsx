"use client";
export function ValidationBanner({
  status = "clean",
  onPublish,
}: {
  status?: "clean" | "dirty" | "error";
  onPublish?: () => void;
}) {
  const copy =
    status === "clean"
      ? { badge: "Synced", cls: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" }
      : status === "dirty"
      ? { badge: "Unpublished changes", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" }
      : { badge: "Error", cls: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400" };

  return (
    <div className="glass-card p-4 flex items-center justify-between">
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${copy.cls}`}>{copy.badge}</span>
      <button
        onClick={onPublish}
        className="h-9 px-3 rounded-md border border-border hover:bg-muted/50 text-sm"
      >
        Publish
      </button>
    </div>
  );
}
