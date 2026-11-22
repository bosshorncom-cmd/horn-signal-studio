# Horn Signal Studio

A small self-hosted web tool for people who work with horn and whistle
signals: railway volunteers, model-railroad sound builders, boat-club safety
officers and anyone writing a quiet-zone or noise memo.

- **Signal catalog and timeline.** US railway signals from GCOR 5.8.2 (the grade
  crossing `- - o -`, proceed, acknowledge, back up, request, emergency) and the
  COLREGS Rule 34/35 manoeuvring and fog signals, drawn to scale with adjustable
  short, long and gap durations.
- **Quiet preview.** Plays the pattern as a soft three-note chord through the
  browser so the cadence can be rehearsed without sounding a real horn.
- **Crossing onset.** Distance window in which a locomotive horn must start
  before a public crossing under 49 CFR 222.21 (15-20 s, quarter-mile cap above
  60 mph).
- **Level at distance.** Free-field inverse-square estimate from a level at
  100 ft, flagged against the 96-110 dB(A) locomotive band of 49 CFR 229.129.
- **Saved patterns.** Club start signals, yard tests or custom cadences are
  stored on the server in `/data/patterns.json`.

No accounts, no telemetry, no external requests. Python standard library only.

## Run

```sh
docker run -d -p 7322:8080 -v "$PWD/data:/data" ghcr.io/bosshorncom-cmd/horn-signal-studio:1.0.0
# or
docker compose up -d
```

Open http://localhost:7322. Without Docker: `DATA_DIR=./data PORT=7322 python3 app/server.py`.

### API

| Method | Path | Body |
|---|---|---|
| GET | `/api/patterns` | |
| POST | `/api/patterns` | `{"name": "...", "pattern": "- - o -", "note": "...", "timing": {"short": 1000, "long": 3000, "gap": 1000}}` |
| DELETE | `/api/patterns/<id>` | |
| GET | `/healthz` | |

## Why

Sound-level figures for a train horn are quoted without distance or weighting
so often that it is hard to compare a locomotive with an aftermarket air horn.
The level calculator makes the 100 ft reference explicit. For published ratings
of portable devices, see the Horn Guns overview of the handheld
[train horn](https://hornguns.com/).

The tool is a study aid; the rulebook that applies to your railway or
waterway wins.

## License

MIT. Copyright (c) 2026 Train Horns Lab.
