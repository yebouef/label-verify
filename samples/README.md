# Sample test labels

Generated label artwork for testing the verifier. Pair them with the application data below.

| File | Suggested application data | Expected result |
|---|---|---|
| `01_compliant_old_tom.png` | Brand `OLD TOM DISTILLERY`, Class `Kentucky Straight Bourbon Whiskey`, ABV `45% Alc./Vol. (90 Proof)`, Net `750 mL` | **Approve** — everything matches |
| `02_warning_titlecase.png` | Brand `RIVERBEND RESERVE`, Class `Tennessee Whiskey`, ABV `40% Alc./Vol.`, Net `750 mL` | **Reject** — `Government Warning:` is in title case, not all caps |
| `03_abv_mismatch.png` | Brand `Stone's Throw`, Class `Straight Rye Whiskey`, ABV `45% Alc./Vol.`, Net `750 mL` | **Reject** — label says 50% but application says 45% (note the brand still matches despite different casing) |
| `04_missing_warning.png` | Brand `HARBOR LIGHT GIN`, Class `London Dry Gin`, ABV `47% Alc./Vol.`, Net `750 mL` | **Reject** — no Government Warning statement |

For batch mode, just drop all four in at once; the screen will flag #2 and #4 and pass #1 and #3 on the self-contained checks (batch mode doesn't have the application ABV, so #3's mismatch only shows in single-label mode).
