# Module 19 — Backups

**Priority:** 🟢 Low | **Est:** 1 day | **Depends on:** nothing

## Flask Endpoints

All under admin blueprint (no separate prefix):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/api/backup/postgres/pitr/status` | PITR backup status |
| POST | `/admin/api/backup/postgres/pitr/backup` | Trigger backup |
| GET | `/admin/api/backup/postgres/pitr/backups` | List backups |
| POST | `/admin/api/backup/postgres/pitr/verify` | Verify WAL integrity |
| GET | `/admin/api/backup/postgres/pitr/logs` | Backup job logs |
| GET | `/admin/api/backup/postgres/pitr/jobs` | Job history |
| POST | `/admin/api/media-backup/create` | Create media backup |
| GET | `/admin/api/media-backup/list` | List media backups |
| DELETE | `/admin/api/media-backup/<id>` | Delete media backup |
| GET | `/admin/api/media-backup/<id>/download` | Download backup |

## Proxy Mapping

Uses existing `"admin": "/admin/api"` prefix.

## TypeScript Types (`lib/api/types.ts`)

```ts
export interface BackupJob {
  id: string;
  type: "pitr" | "media";
  status: "running" | "success" | "failed";
  started_at: string;
  completed_at?: string;
  size_bytes?: number;
  error?: string;
}

export interface PITRStatus {
  last_backup_at?: string;
  wal_archiving_active: boolean;
  oldest_backup_at?: string;
  total_backups: number;
  storage_used_bytes: number;
}
```

## Query Keys (`lib/api/query-keys.ts`)

```ts
backups: {
  pitrStatus: ["backups", "pitr-status"] as const,
  jobs: ["backups", "jobs"] as const,
  mediaList: ["backups", "media"] as const,
}
```

## Pages / Routes

| File | Route | Description |
|------|-------|-------------|
| `app/(dashboard)/backups/page.tsx` | `/backups` | Backup status + job history |

## Components

- `PITRStatusCard` — last backup time, WAL archiving status, storage used
- `BackupJobTable` — DataTable with type, status badge, duration, size
- `TriggerBackupButton` — confirmation dialog before triggering
- `MediaBackupList` — list with download + delete actions

## Definition of Done

- [ ] PITR status card
- [ ] Backup job history table
- [ ] Trigger backup with confirmation
- [ ] Media backup list + download
- [ ] Auto-refresh during running job
- [ ] Skeleton + EmptyState
