# Sensor Meter Card

A compact, theme-aware Lovelace card for numeric Home Assistant sensors. It shows a live value, the entity's friendly name and icon, and an optional colored progress meter. Tap the card to open Home Assistant More Info.

## Features

- Works with configurable numeric `sensor` entities; no entity IDs are built in
- Shows the live value and unit (including `%`) using the sensor's reported precision (up to two decimals by default)
- Optional progress bar with configurable minimum and maximum scale
- Uses the same four signature palettes as the other cards in the collection: `aurora`, `ocean`, `sunset`, and `lavender`
- Uses entity friendly name and icon by default, with optional overrides
- Responsive, theme-aware design; no external runtime dependencies

## Install with HACS

1. In HACS, open the three-dot menu and choose **Custom repositories**.
2. Add `Liionboy/lovelace-sensor-meter-card` with type **Dashboard** (formerly Lovelace).
3. Install **Sensor Meter Card**.
4. Add a card to a dashboard:

```yaml
type: custom:sensor-meter-card
entity: sensor.example
palette: ocean
min: 0
max: 100
```

For percentage sensors, the scale defaults to `0–100`. For other units, set `min` and `max` to match the sensor's meaningful range. For example, set `max: 120` for a 120 GB disk, or `max: 16` for a 16 GB memory sensor. The card clamps the fill to the configured scale while keeping the actual value visible.

## Configuration

| Option | Required | Description |
| --- | --- | --- |
| `entity` | Yes | A numeric Home Assistant `sensor` entity |
| `title` | No | Display name; defaults to the entity's friendly name |
| `icon` | No | Material Design Icon override; defaults to the entity icon or `mdi:chart-box-outline` |
| `palette` | No | `aurora`, `ocean`, `sunset`, or `lavender` (default: `ocean`) |
| `min` | No | Lower progress-bar bound (default: sensor minimum or `0`) |
| `max` | No | Upper progress-bar bound (default: sensor maximum, or `100` for `%` sensors) |
| `decimals` | No | Fixed decimal places from `0` to `6`; by default the card uses the sensor's suggested precision or up to two decimals |
| `show_bar` | No | Set to `false` to show only the value and name |

## License

MIT
