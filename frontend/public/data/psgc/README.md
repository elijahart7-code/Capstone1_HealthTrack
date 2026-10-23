# PSGC Reference Dataset

- Source: Philippine Statistics Authority, Philippine Standard Geographic Code — https://psa.gov.ph/classification/psgc
- Release snapshot: 2026-Q2, PSGC data as of 30 June 2026 (latest published release available in the upstream dataset at implementation time).
- Upstream packaging: https://github.com/Tenasia/ph-psgc/releases/tag/2026-Q2
- Contents: all 18 regions, 82 provinces, 149 cities, 1,493 municipalities, and 42,010 barangays. Codes are retained as strings.
- PSA attribution is required when displaying this data. PSGC codes and names remain PSA data; the upstream JSON packaging is MIT licensed.

The source PSA site does not expose an automated download reliably. Refresh this pinned snapshot when a newer PSA PSGC publication datafile is released; verify totals and region assignments, then rebuild the index and area JSON files using the upstream repository's scripts before deployment.
