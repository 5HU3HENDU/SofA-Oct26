# Add a train trip to Boarding Passes

Use these instructions when someone asks you to add a trip from this page. You may have no prior context about this site. Treat the PNR and trip as belonging only to the person who asked you. Do not access, add, or disclose another traveller's data.

## Site and scope

- Site: https://schoolofadults.com/travel/train/
- This page stores the trip on the visitor's device. A trip is added when the visitor opens the snapshot link you return.
- Use public sources only. Check official railway information first, then reputable live PNR and train sources. IRCTC PNR lookup may require a CAPTCHA; do not bypass or automate it. If the official PNR page is CAPTCHA-gated, use a live PNR page such as RailYatri and cross-check other fields with current reputable sources. Do not log in to unrelated accounts or use non-public data.
- Never include passenger names or details of other passengers in a reply, link, or card.
- Tell the requester the sources used and the time checked. Show an "As of" timestamp in India Standard Time (IST).

## What to verify

For the submitted PNR, look up and report, where available:

1. Train number and name.
2. Journey date.
3. Boarding and destination stations.
4. Departure and arrival times.
5. Travel class.
6. Current coach and berth number(s), and booking status if the source provides it.
7. Boarding and arrival platform numbers.
8. Coach order from engine to rear, and the position of the traveller's coach in that order.
9. Journey duration and distance.

Always use the most recent, best-sourced information available. When sources disagree, assess source quality and recency, prefer current live results, and use the newest reliable information supported by agreement across multiple current sources. Do not ask the user to choose between sources. Never silently treat an older result as current. If no reliable resolution is possible, mark the affected value **UNVERIFIED** and explain why. Distinguish a typical coach order from the actual rake/order for this journey; newer agreement about a typical composition does not prove the actual rake for this journey. Never present a typical order as confirmed actual placement. Do not include cancelled co-passengers; include only passengers who are still travelling, and do not disclose other passengers’ personal details.

## Snapshot link format for any train

Use the all-data link (`#b=`) for new trip cards. It carries the complete card data, so the page does not need a hardcoded route for the train. Keep the older `#a=` link for the existing 19489 trip working; do not use `#a=` for new trips.

Format:

`https://schoolofadults.com/travel/train/#b=b1.WzEsIjg3NTI2NDAxOTMiLCIxOTQ4OSIsIkFobWVkYWJhZCAtIEdvcmFraHB1ciBFeHByZXNzIiwiMjAyNi0xMC0yNFQwMzo0MDowMC4wMDBaIiwiMjAyNi0xMC0yNVQwNjo1MDowMC4wMDBaIiwiQURJIiwiQWhtZWRhYmFkIEpuIiwiQlNCIiwiVmFyYW5hc2kgSm4iLCIzQSDCtyBBQyBUaGlyZCBBQyIsIkIzIixbIjIzIiwiMjQiXSwiQ05GIixbIkNORiIsIkNORiJdLCI4IiwiMyIsInByb2plY3RlZCIsWyJMUFIiLCJHRU4iLCJHRU4iLCJIMSIsIkExIiwiQTIiLCJCMSIsIkIyIiwiQjMiLCJCNCIsIk0xIiwiTTIiLCJTMSIsIlMyIiwiUzMiLCJTNCIsIlM1IiwiUzYiLCJTNyIsIkdFTiIsIkdFTiIsIlNMUkQiXSw5LCJ0eXBpY2FsIiwiVU5WRVJJRklFRCIsMTYzMCwiMjAyNi0xMC0yMlQyMDoyODo1MC4wMDBaIl0`

`b1.` identifies compact schema version 1. `BASE64URL` is UTF-8 JSON encoded with Base64 URL-safe characters: encode the exact JSON bytes as Base64, replace `+` with `-` and `/` with `_`, then remove trailing `=` padding. Do not percent-encode or add whitespace. The decoded JSON is a positional array, not an object, with exactly 24 entries in this order (indices 0 through 23):

| Index | Value | Format |
|---|---|---|
| 0 | Schema version | Integer `1` |
| 1 | PNR | String of exactly 10 digits |
| 2 | Train number | String of exactly 5 digits |
| 3 | Train name | String, up to 80 characters |
| 4 | Departure instant | ISO 8601 timestamp with explicit UTC `Z`, e.g. `2026-10-24T03:40:00.000Z` |
| 5 | Arrival instant | ISO 8601 UTC timestamp with `Z`; must be after departure |
| 6 | Boarding station code | Non-empty string |
| 7 | Boarding station name | Non-empty string |
| 8 | Destination station code | Non-empty string |
| 9 | Destination station name | Non-empty string |
| 10 | Class | Non-empty string |
| 11 | Traveller's coach label | Non-empty string, up to 16 characters |
| 12 | Berths | Array of 1-12 strings, each up to 40 characters |
| 13 | Booking status | Non-empty status string, up to 40 characters; use `UNVERIFIED` if the source does not establish it. This value is carried for instructions and follow-up |
| 14 | Per-berth statuses | Array of strings with the same count/order as berths; e.g. `CNF`, `WL`, or `UNVERIFIED`. `CNF` and other status values are retained in the link data; the existing card does not add new labels |
| 15 | Boarding platform | Non-empty string; `UNVERIFIED` if unknown |
| 16 | Arrival platform | Non-empty string; `UNVERIFIED` if unknown |
| 17 | Platform status | Non-empty short label such as `verified`, `projected`, or `UNVERIFIED`; retained for instructions and follow-up |
| 18 | Coach order | Array of 1-40 coach labels, ordered engine-to-rear; each label up to 16 characters |
| 19 | Traveller's coach position | 1-based integer index into coach order; the label at this index must equal field 11 |
| 20 | Coach-order quality | Exactly `actual`, `typical`, or `unverified`; retained for instructions and follow-up |
| 21 | Distance | String, up to 60 characters; use `UNVERIFIED` if unavailable |
| 22 | Duration | Integer whole minutes, from departure to arrival |
| 23 | Checked-at instant | ISO 8601 UTC timestamp with `Z`; this drives the card's “As of” time |

Validation limits are part of the format: PNR exactly 10 digits; train number exactly 5; non-empty route names, station codes/names, class, coach, booking status, platform values/status, and coach-order quality; berths and per-berth statuses must have matching lengths; coach position must be in range and identify the traveller's coach; timestamps must parse and be canonical UTC ISO strings; arrival must be later than departure; duration must be an integer from 0 to 200000 minutes and equal the departure-arrival difference rounded to whole minutes. The complete new link must be at most 2000 characters so it remains well below ordinary browser and messaging URL limits. If it does not, do not truncate it or silently drop fields.

The existing card design is unchanged. It displays the station and train data, class, platform values, coach and berth numbers, coach order, distance/duration, and checked-at time. Status and provenance are carried in the link for instructions and follow-up. Treat all values as a source-backed snapshot, not a live update. Recheck and send a fresh link when relevant facts change.

### Worked example: PNR 8752640193

This example carries the currently agreed 22-coach composition for train 19489, with B3 at position 9. It is a typical composition, not confirmation of the actual rake for this journey. The order agrees across five current references checked in the cold test: Trainman, IndiaRailInfo, RailJournal, RailRadar, and eRail. Platform values are projected and distance remains UNVERIFIED; the checked-at instant is 23 October 2026 01:58 IST. Refresh trip-specific values before reuse.

Payload array:

```json
[1,"8752640193","19489","Ahmedabad - Gorakhpur Express","2026-10-24T03:40:00.000Z","2026-10-25T06:50:00.000Z","ADI","Ahmedabad Jn","BSB","Varanasi Jn","3A · AC Third AC","B3",["23","24"],"CNF",["CNF","CNF"],"8","3","projected",["LPR","GEN","GEN","H1","A1","A2","B1","B2","B3","B4","M1","M2","S1","S2","S3","S4","S5","S6","S7","GEN","GEN","SLRD"],9,"typical","UNVERIFIED",1630,"2026-10-22T20:28:50.000Z"]
```

Use this complete link for the exact JSON array above:

`https://schoolofadults.com/travel/train/#b=b1.WzEsIjg3NTI2NDAxOTMiLCIxOTQ4OSIsIkFobWVkYWJhZCAtIEdvcmFraHB1ciBFeHByZXNzIiwiMjAyNi0xMC0yNFQwMzo0MDowMC4wMDBaIiwiMjAyNi0xMC0yNVQwNjo1MDowMC4wMDBaIiwiQURJIiwiQWhtZWRhYmFkIEpuIiwiQlNCIiwiVmFyYW5hc2kgSm4iLCIzQSDCtyBBQyBUaGlyZCBBQyIsIkIzIixbIjIzIiwiMjQiXSwiQ05GIixbIkNORiIsIkNORiJdLCI4IiwiMyIsInByb2plY3RlZCIsWyJMUFIiLCJHRU4iLCJHRU4iLCJIMSIsIkExIiwiQTIiLCJCMSIsIkIyIiwiQjMiLCJCNCIsIk0xIiwiTTIiLCJTMSIsIlMyIiwiUzMiLCJTNCIsIlM1IiwiUzYiLCJTNyIsIkdFTiIsIkdFTiIsIlNMUkQiXSw5LCJ0eXBpY2FsIiwiVU5WRVJJRklFRCIsMTYzMCwiMjAyNi0xMC0yMlQyMDoyODo1MC4wMDBaIl0`

This all-data example does not replace or invalidate the prior compact URL. The legacy link below remains supported for the 19489 snapshot, but contains only PNR/train number, departure/arrival/check timestamps, and platforms; other card values come from the built-in 19489 route data, now updated to B3 at position 9:

`https://schoolofadults.com/travel/train/#a=1.8752640193.19489.hsfq4.hsgze.hse7w.8-3`

## Handling the legacy `#a=` link

The older format is `https://schoolofadults.com/travel/train/#a=1.PNR.TRAIN.DEPARTURE.ARRIVAL.CHECKED.PLATFORM`. Times are UTC Unix epoch minutes rounded down and encoded lowercase base 36. PLATFORM is boarding-arrival platforms joined with a hyphen. Existing `#a=` imports for PNR 8752640193 / train 19489 require its fixed legacy values `hsfq4.hsgze.hse7w.8-3`; other details remain the built-in route data, now using the updated 22-coach composition with B3 at position 9. Use `#b=` for any new or changed trip because it carries every field.

## Return and follow-up

- Send the requester the checked findings, source references, the lookup time in IST, and the valid snapshot link when the current site can represent the verified trip accurately.
- Recheck at the start of the travel day, the day before departure, and on the journey day. Also recheck after chart preparation or when a reported change could affect the coach, berth, platform, delay, cancellation, or timing.
- Alert the requester promptly when a checked field changes. State what changed, cite the source, and give a refreshed link only if the current route data supports it. Keep the link's `CHECKED` value and displayed "As of" time current.
- The site removes an ended trip from that device 48 hours after its scheduled arrival.
