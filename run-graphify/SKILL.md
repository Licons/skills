---
name: run-graphify
description: "Use for any question about a codebase, its architecture, file relationships, or project content — especially when graphify-out/ exists, where the question should be treated as a graphify query first. Turns any input (code, docs, papers, images, videos) into a persistent knowledge graph with god nodes, community detection, and query/path/explain tools."
---

> Tạo Todo/Monitor để thực hiện tất cả công việc trong Workflow sau.

# WORKFLOW

1. **Danh sách project BE (.csproj) & FE Angular** — 22 path, xem cuối file.

2. **Bắt đầu** chạy `graphify extract <path> --code-only` (mới) hoặc
   `graphify update <path> --no-cluster` (đã có graph).

3. **Merge** toàn bộ graph → `graphify-out/monorepo-graph.json`
   (`graphify merge-graphs <22 file> --out graphify-out/monorepo-graph.json`).

4. **Cluster**:
   `graphify cluster-only . --no-viz --no-label --graph graphify-out/monorepo-graph.json`

## Script (đã kiểm chứng, dùng thay vì gõ tay)

```bash
setsid nohup .claude/skills/run-graphify/scripts/extract-all.sh <path>... &   # CONCURRENCY, WORKERS
.claude/skills/run-graphify/scripts/monitor.sh                                # đọc state file
setsid nohup .claude/skills/run-graphify/scripts/merge-cluster.sh <22 path> & # gate + merge + cluster
```

## Gotchas

- **Phải `setsid`, không phải `nohup`** — job nền bị SIGKILL theo process group
  khi tool call kết thúc (đã mất 1 lần chạy: `apps/angular` tới 100%, `services/saas` tới 79%).
- **`graphify` bỏ qua flag lạ mà không báo lỗi** (exit 0, output y hệt). `--no-viz`/`--no-label`
  **không tồn tại** cho `extract`; `cluster-only` **không có** `--code-only`. Đừng truyền, và đừng tin exit 0.
- **`cluster-only --graph X` ghi ra `graphify-out/graph.json`**, không ghi đè `X` (đúng ý — `query` đọc `graph.json`).
- **`--max-workers` mặc định = `cpu_count`** → phải cap khi chạy nhiều path song song.
- **`extract` ghi `graphify-out/` bên trong từng path** → 23 dir untracked, `.gitignore` không có entry (chủ ý giữ để `update` sau nhanh).
- **Xem bảng collision ID** in ra trước khi merge; framework/NuGet trùng tên là đúng, node nghiệp vụ trùng tên mới là conflation.

Sau khi xong: trả lời câu hỏi codebase bằng `graphify query "<câu hỏi>"`.

## 22 path

```bash
services/Uengage            services/administration   services/audit-logging
services/background-jobs    services/chat            services/dynamic-report
services/file-management    services/gdpr            services/healthcare
services/identity           services/integration-hub services/language
services/marketing          services/notification     services/realestate
services/shared             services/saas (GIANT)    gateways/gw-3cx
gateways/mobile             gateways/web             apps/auth-server
apps/angular (GIANT)
```
