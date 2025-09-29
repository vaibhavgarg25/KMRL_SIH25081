"use client";
export function AuditTrail({ events = [] as { ts: string; user: string; action: string }[] }) {
  return (
    <div className="glass-card p-6">
      <div className="text-sm font-semibold mb-3">Audit Trail</div>
      {!events.length ? (
        <div className="text-sm text-muted-foreground">No changes yet.</div>
      ) : (
        <ul className="space-y-2 text-sm">
          {events.map((e, i) => (
            <li key={i} className="flex items-center justify-between">
              <span className="text-muted-foreground">{new Date(e.ts).toLocaleString()}</span>
              <span className="text-foreground">{e.action}</span>
              <span className="text-muted-foreground">{e.user}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
