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
# REPO được SUY RA từ vị trí script ⇒ chạy đúng clone nào chứa script đó.
# Chạy tay (đọc .csproj, đếm path, xem log) thì đặt REPO=/TUONG-DUONG:
REPO="$PWD"
CONCURRENCY=2 WORKERS=3 RUN_DIR=/tmp/opencode/graphify-run-dev \
  setsid nohup .claude/skills/run-graphify/scripts/extract-all.sh <path>... &
RUN_DIR=/tmp/opencode/graphify-run-dev \
  .claude/skills/run-graphify/scripts/monitor.sh              # đọc state file
RUN_DIR=/tmp/opencode/graphify-run-dev \
  setsid nohup .claude/skills/run-graphify/scripts/merge-cluster.sh <22 path> &
```

`CONCURRENCY` × `WORKERS` = tổng process, nên đặt bằng `nproc`. Xếp các path
"giant" (`services/saas`, `apps/angular`) **không cạnh nhau** trong danh sách để
chúng không cùng chạy — đó là đỉnh RAM duy nhất của pipeline.

## Gotchas

- **Đừng tin `REPO` mặc định cũ** — trước đây script hardcode
  `/…/Utop.VietBank.CRM`, tức **clone khác** đang ở `feature/c360-account-field-mode`.
  Máy này có ≥2 clone (`Utop.VietBank.CRM`, `Utop.VietBank.CRM.1` trên `develop`)
  ⇒ graph sai nhánh mà không có báo lỗi nào. Giờ script tự suy ra từ vị trí
  nó và `exit 2` nếu thư mục đó không có `.git`.
- **`RUN_DIR` phải sạch.** `monitor.sh` đọc **nội dung** `*.done` + marker, nên
  state của run trước còn lại ⇒ nó báo `done=22 ok=22 PIPELINE_DONE` ngay lập
  tức dù chưa chạy gì. `extract-all.sh` giờ tự archive state cũ sang
  `state-archive-<HHMMSS>/`; nếu tự gọi pipeline hai lần, hãy đặt `RUN_DIR`
  khác cho mỗi lần.
- **Phải `setsid`, không phải `nohup`** — job nền bị SIGKILL theo process group
  khi tool call kết thúc (đã mất 1 lần chạy: `apps/angular` tới 100%, `services/saas` tới 79%).
- **`graphify` bỏ qua flag lạ mà không báo lỗi** (exit 0, output y hệt). `--no-viz`/`--no-label`
  **không tồn tại** cho `extract`; `cluster-only` **không có** `--code-only`. Đừng truyền, và đừng tin exit 0.
- **`cluster-only --graph X` ghi ra `graphify-out/graph.json`**, không ghi đè `X` (đúng ý — `query` đọc `graph.json`).
- **`--max-workers` mặc định = `cpu_count`** → phải cap khi chạy nhiều path song song.
- **Đừng tin exit 0, và đừng chỉ scrape một định dạng log.** `extract` in
  `wrote ... graph.json: N nodes, M edges`; `update` in
  `Rebuilt (no clustering): N nodes, M edges`, hoặc
  `No code-graph changes detected` (cây không đổi) — **không có số nào**. Script
  chỉ khớp định dạng đầu thì mọi path ở nhánh `update` bị gán nhầm
  `FAIL|empty-graph` dù graph vẫn tốt. `extract-all.sh` giờ khớp cả hai và
  fallback đọc `graph.json` khi log im lặng.
- **Đọc graph bằng `links`, không phải `edges`.** Cả `monorepo-graph.json` lẫn
  `graph.json` đều ở **node-link format**: `{'nodes', 'links', 'hyperedges'}`. Đếm
  `d['edges']` ra `0` trong khi `GRAPH_REPORT.md` ghi 333,431 — dễ tưởng merge hỏng.
- **`extract` ghi `graphify-out/` bên trong từng path** → 23 dir. Chúng **không**
  nằm trong `.gitignore` mà bị loại bởi `.git/info/exclude` (`**/graphify-out`),
  nên `git status` vẫn sạch. File đó là local của từng clone — clone mới sẽ
  phải thêm lại nếu muốn giữ.
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
