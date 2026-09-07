# Fonts

Everything in here is under the **SIL Open Font License 1.1**, which allows
redistribution — which is why these are the faces the committed build uses.

| File | Used for | Licence |
|---|---|---|
| `BarlowCondensed-Bold.ttf` | display: headings, the clock, the countdown | `OFL — Barlow Condensed.txt` |
| `Inter-Regular.otf` | body text | `OFL — Inter.txt` |
| `Inter-SemiBold.otf` | labels | `OFL — Inter.txt` |

Inter is the real BIES body typeface, so the two builds are identical there.

The display face is **not**. BIES's is **PP Formula Narrow Bold**, a commercial
typeface from Pangram Pangram that is not ours to publish, so it stays in the
brandkit and never enters this repository. Barlow Condensed Bold stands in for
it: also a bold condensed grotesque, close in weight, width and colour, chosen
by rendering the countdown side by side against the real thing.

Anyone at BIES with the brandkit gets the real typeface by building with
`--brand`; see the main README.
