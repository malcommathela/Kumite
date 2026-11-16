# shadcn resolver fixtures

`dashboard-01-responses.json.gz` stores exact HTTP response bodies captured from
the official `shadcn-ui/ui` registry and source at commit
`1e9e337923aaede7db55b6091cb56a72a661b959` (the `shadcn@3.7.0` pin). It includes
the complete `dashboard-01` block, its transitive registry items and source files,
the `chart-bar-demo` example, and the referenced avatar asset. The fixture is
used by offline resolver tests; it is not generated or simplified JSX.

The upstream project is MIT licensed:
https://github.com/shadcn-ui/ui/blob/1e9e337923aaede7db55b6091cb56a72a661b959/LICENSE.md
