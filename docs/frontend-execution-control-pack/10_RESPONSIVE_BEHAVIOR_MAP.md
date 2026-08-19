# Responsive Behavior Map

Canonical evidence: Gate 11, Gate 12, `docs/ui-final/21..23`, and the mobile visual assets. Verification viewports are 390x844, 768x1024, 1280x900 and 1920x1080.

| Pattern        | 1280/1920                                 | 768                                                    | 390                                                      | Overflow/action rule                               |
| -------------- | ----------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------- | -------------------------------------------------- |
| navigation     | persistent sidebar + top bar              | sidebar removed; drawer trigger                        | full-height left drawer                                  | no bottom tabs; role/flag filtered                 |
| page header    | breadcrumb/title/actions inline           | actions may wrap                                       | primary action full-width or first; secondary below/menu | preserve one primary action                        |
| KPI grid       | 4/5-column as frozen                      | 2-column                                               | single-column/scroll-free                                | skeleton matches grid                              |
| table          | semantic table, sticky header where drawn | horizontal only when frozen columns cannot card safely | labelled cards; repeat field names                       | never hide critical value/action; no tiny table    |
| filter bar     | inline search/selects/chips               | wrapped or collapsed                                   | collapsed panel/drawer; active chips visible             | clear-all accessible; no off-screen controls       |
| tabs           | horizontal                                | horizontal/scrollable if needed                        | scrollable with active tab visible                       | arrow keys; no unlabeled icon tabs                 |
| modal/dialog   | centered bounded width                    | centered                                               | full-height sheet where specified                        | focus trap/return; viewport-safe content scroll    |
| forms/wizards  | multi-column groups when drawn            | reduced columns                                        | one column; step labels remain                           | sticky submit only when frozen visual supports it  |
| receiving      | line table + summary                      | condensed split                                        | mobile receiving card flow                               | current/change/result and outstanding stay visible |
| charts/reports | chart + accessible summary/table          | stacked                                                | read-only stacked; export hidden                         | never clip labels; text alternative                |

## Global rules

- `<1024` triggers drawer navigation and responsive table/form transformations.
- Customer text is at least 12 px; tap targets at least 44x44 on mobile.
- No critical horizontal page overflow at any canonical viewport. Local table overflow is allowed only when the frozen behavior calls for it and cards would lose meaning.
- Action order follows risk and workflow, not DOM convenience. Destructive actions never become the easiest mobile target.
- Approved rules above are mandatory. Agent discretion is limited to implementation details that preserve the same information, order, priority and accessibility.
