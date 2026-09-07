---
name: run-graphify
description: "Use for any question about a codebase, its architecture, file relationships, or project content — especially when graphify-out/ exists, where the question should be treated as a graphify query first. Turns any input (code, docs, papers, images, videos) into a persistent knowledge graph with god nodes, community detection, and query/path/explain tools."
---

> Tạo Todo để thực hiện tất cả công việc trong Workflow sau.

# WORKFLOW

1. Liệt kê danh sách các project BackEnd .NET (csproj) và FrontEnd Angular (để chạy toàn bộ).
2. Chạy skill `graphify extract <path> --code-only` (new) hoặc `graphify cluster-only <path> --no-viz --no-label --code-only --update` (update) cho từng project - **lưu ý:** timeout cho các project lớn (tự tính).
3. Merge tất cả các graph lại (dùng `--out`).
4. Chạy `graphify cluster-only . --no-viz --no-label --graph graphify-out/monorepo-graph.json` nếu chưa có `GRAPH_REPORT.md`
