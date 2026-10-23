# Add a flight trip to Flight tickets

Use these instructions when someone asks you to add a flight from this page. You may have no prior context about this site. Treat the booking and trip as belonging only to the person who asked you. Do not access, add, or disclose another traveller's data.

## Site and scope

- Site: https://schoolofadults.com/travel/flight/
- This page stores the flight on the visitor's device only. A flight is added when the visitor opens the snapshot link you return.
- The page offers two ways to add a flight, and each has "Submit" and "Send to Instinct":
  - **Booking PNR**: a 6-character code (letters and digits). Submit saves a placeholder card with the PNR and a link to ixigo flight status. It has no booking details until you look the booking up.
  - **Flight number + date**: for example `6E 2343` on `2026-10-24`. Submit saves a card and opens that flight on ixigo to track it. Send to Instinct asks you to fill in the full ticket.
- Never write a passenger name, or any other traveller's details, in a reply, a link, or a card.
- Tell the requester the sources used and the time checked. Show the "As of" time in India Standard Time (IST).

## If you receive a booking PNR

A booking PNR (record locator) is not publicly searchable the way a rail PNR is. The airline's own "manage booking" page or app needs the PNR plus the passenger's last name (some airlines accept an email instead). So:

1. Ask the requester in chat for the airline, and the passenger's last name (or the email on the booking), if they are not already given. Ask once. Use them only for this lookup.
2. Use the airline's own public manage-booking or check-trip page, read-only. Never change, cancel, pay for, check in, or buy anything. Do not log in to an account. Do not bypass or automate a CAPTCHA. If the airline page cannot be used, ask the requester for the flight number and date (or a copy of the confirmation) and use the flight-number steps below.
3. Never put the last name, email, or any passenger name in the snapshot link, the card, or your reply. The page does not store them.
4. Use the airline's page for the booking details, and a public flight-status source for gate and terminal.

## If you receive a flight number and date

Use public flight-status sources only (for example ixigo flight status, the airline's flight-status page, and the airport's own page). Use the date as the departure date in the departure airport's local time. A flight number can run on many days, so never mix up two dates.

## What to verify

Report, where available:

1. Airline and flight number, and the departure date at the departure airport.
2. Departure and arrival airports (3-letter IATA codes and names), and each airport's IANA timezone.
3. Scheduled or estimated departure and arrival times, with current status (scheduled, delayed, departed, cancelled, landed).
4. Departure terminal and gate, arrival terminal and baggage belt. These are often not posted until a few hours before departure. If not posted, leave them blank. Do not guess.
5. Cabin, seat(s), and booking status, only when the airline's page shows them. Otherwise leave them blank or use `UNVERIFIED` for the status.
6. Aircraft type, and the flight duration.

Use the most recent, best-sourced information. When sources disagree, prefer current live results and agreement across current reputable sources. Do not ask the user to choose between sources. Never treat an older result as current. If a value cannot be resolved, leave it blank (or `UNVERIFIED` where a value is required) and say why. One link is one flight leg. For a connecting journey, send one link per leg.

## Snapshot link format for any flight leg

Use the all-data link `#f=`. It carries the full card, so the page needs no built-in data for the flight.

`https://schoolofadults.com/travel/flight/#f=f1.BASE64URL`

`f1.` is schema version 1. `BASE64URL` is UTF-8 JSON encoded with Base64 URL-safe characters: encode the exact JSON bytes as Base64, replace `+` with `-` and `/` with `_`, then remove trailing `=` padding. Do not percent-encode or add whitespace. The decoded JSON is a positional array with exactly 24 entries (index 0 to 23):

| Index | Value | Format |
|---|---|---|
| 0 | Schema version | Integer `1` |
| 1 | Booking PNR | 6 uppercase letters or digits, or `""` when added by flight number |
| 2 | Airline code | 2 uppercase letters or digits, e.g. `6E` |
| 3 | Flight number | 1 to 4 digits, no leading zeros, e.g. `2343` |
| 4 | Airline name | Non-empty string, up to 40 characters |
| 5 | Departure instant | ISO 8601 UTC with `Z`, e.g. `2026-10-24T03:30:00.000Z` |
| 6 | Arrival instant | ISO 8601 UTC with `Z`, after departure |
| 7 | Departure airport code | 3 uppercase letters |
| 8 | Departure airport name | Short city or airport name, up to 60 characters, e.g. `Delhi` |
| 9 | Departure airport timezone | IANA name, e.g. `Asia/Kolkata` |
| 10 | Arrival airport code | 3 uppercase letters |
| 11 | Arrival airport name | Short city or airport name, up to 60 characters, e.g. `Mumbai` |
| 12 | Arrival airport timezone | IANA name |
| 13 | Departure terminal | String up to 12 characters, `""` if not posted |
| 14 | Departure gate | String up to 12 characters, `""` if not posted |
| 15 | Arrival terminal | String up to 12 characters, `""` if not known |
| 16 | Baggage belt | String up to 12 characters, `""` if not known |
| 17 | Cabin | String up to 30 characters, `""` if not known |
| 18 | Seats | Array of 0 to 9 strings, each non-empty and up to 8 characters |
| 19 | Booking status | String up to 30 characters, `""` or `UNVERIFIED` if unknown |
| 20 | Flight status | Non-empty string up to 30 characters, e.g. `Scheduled` |
| 21 | Aircraft | String up to 30 characters, `""` if not known |
| 22 | Duration | Integer minutes from departure to arrival, equal to the difference of fields 5 and 6 rounded to whole minutes, from 1 to 2880 |
| 23 | Checked-at instant | ISO 8601 UTC with `Z`; drives the card's "As of" time |

Times show in each airport's local time on the card (zones from fields 9 and 12), and "As of" shows in IST. The whole link must be at most 2000 characters. If it is longer, do not truncate it or drop fields silently. Shorten names instead.

Terminal values like `1` or `T1` both display as T1. The card shows terminal and gate together as `T1 / 34`.

A card is identified by airline + flight number + departure instant. Opening a newer link for the same leg replaces the older card. A card for a different date, or for a different leg on the same PNR, is a separate card. A ticket also replaces a saved placeholder with the same PNR, or the same flight number and date. Gate, terminal and seat show as a dash when blank.

### Worked example (not a real booking)

Payload array:

```json
[1,"ABC123","6E","2343","IndiGo","2026-10-24T03:30:00.000Z","2026-10-24T05:45:00.000Z","DEL","Delhi","Asia/Kolkata","BOM","Mumbai","Asia/Kolkata","T1","","T2","","Economy",["12A"],"CONFIRMED","Scheduled","Airbus A320",135,"2026-10-23T10:40:00.000Z"]
```

Link for exactly that array:

`https://schoolofadults.com/travel/flight/#f=f1.WzEsIkFCQzEyMyIsIjZFIiwiMjM0MyIsIkluZGlHbyIsIjIwMjYtMTAtMjRUMDM6MzA6MDAuMDAwWiIsIjIwMjYtMTAtMjRUMDU6NDU6MDAuMDAwWiIsIkRFTCIsIkRlbGhpIiwiQXNpYS9Lb2xrYXRhIiwiQk9NIiwiTXVtYmFpIiwiQXNpYS9Lb2xrYXRhIiwiVDEiLCIiLCJUMiIsIiIsIkVjb25vbXkiLFsiMTJBIl0sIkNPTkZJUk1FRCIsIlNjaGVkdWxlZCIsIkFpcmJ1cyBBMzIwIiwxMzUsIjIwMjYtMTAtMjNUMTA6NDA6MDAuMDAwWiJd`

## Return and follow-up

- Send the requester the checked findings, the source references, the lookup time in IST, and the snapshot link.
- Recheck the day before departure and on the travel day. Also recheck when a delay, gate, terminal or cancellation change could affect the traveller. Alert the requester promptly when something changes, say what changed and give a fresh link with an updated checked-at time.
- Opening the link on a device adds the flight on that device only. The site removes an ended flight from the device 48 hours after its scheduled arrival.
