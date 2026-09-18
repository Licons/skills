---
name: run-graphify
description: "Use for any question about a codebase, its architecture, file relationships, or project content — especially when graphify-out/ exists, where the question should be treated as a graphify query first. Turns any input (code, docs, papers, images, videos) into a persistent knowledge graph with god nodes, community detection, and query/path/explain tools."
---

> Tạo Todo để thực hiện tất cả công việc trong Workflow sau.

# WORKFLOW

1. project BE (.csproj) & FE Angular để chạy graphify

- services/Uengage
- services/administration
- services/audit-logging
- services/background-jobs
- services/chat
- services/dynamic-report
- services/file-management
- services/gdpr
- services/healthcare
- services/identity
- services/integration-hub
- services/language
- services/marketing
- services/notification
- services/realestate
- services/shared
- services/saas (large ~96M, timeout lớn)
- gateways/gw-3cx
- gateways/mobile
- gateways/web
- apps/auth-server
- apps/angular (large ~124M, timeout lớn)

2. Chạy `graphify extract <path> --code-only --no-viz --no-label` (new) hoặc `graphify update <path> --no-cluster --no-viz --no-label` (update)
3. Merge toàn bộ graph -> graphify-out/monorepo-graph.json (merge-graphs ... --out)
4. Chạy `graphify cluster-only . --code-only --no-viz --no-label --graph graphify-out/monorepo-graph.json`
