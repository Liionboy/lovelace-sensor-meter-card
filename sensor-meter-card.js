const CARD_TYPE = "sensor-meter-card";
const PALETTES = new Set(["aurora", "ocean", "sunset", "lavender"]);
const LEGACY_PALETTES = { green: "aurora", blue: "ocean", red: "sunset", orange: "sunset", teal: "aurora", purple: "lavender" };
const FORM_LABELS = {
  entity: "Sensor entity",
  title: "Card title",
  icon: "Icon override",
  palette: "Color palette",
  min: "Minimum value",
  max: "Maximum value",
  decimals: "Decimal places",
  show_bar: "Show progress bar",
};

const STYLE = `
  :host{display:block;min-width:0;max-width:100%;color:var(--primary-text-color)}
  ha-card{box-sizing:border-box;width:100%;min-width:0;max-width:100%;container-type:inline-size;container-name:sensor-meter-card;overflow:hidden;border:1px solid color-mix(in srgb,var(--divider-color) 58%,transparent);border-radius:24px;background:var(--ha-card-background,var(--card-background-color,#fff));box-shadow:var(--ha-card-box-shadow,0 12px 34px rgba(20,35,55,.1));touch-action:pan-y}
  ha-card[data-palette="aurora"]{--accent:#078f72;--accent2:#27b7b0;--accent3:#54a9db}
  ha-card[data-palette="ocean"]{--accent:#1477c9;--accent2:#22a7c7;--accent3:#6b68d8}
  ha-card[data-palette="sunset"]{--accent:#df5d42;--accent2:#ee973f;--accent3:#cf5d9e}
  ha-card[data-palette="lavender"]{--accent:#8059c7;--accent2:#b56cc8;--accent3:#4c9bc7}
  .shell{position:relative;padding:clamp(15px,3cqi,21px);background:radial-gradient(ellipse at 0 0,color-mix(in srgb,var(--accent) 13%,transparent),transparent 54%),radial-gradient(ellipse at 100% 100%,color-mix(in srgb,var(--accent2) 9%,transparent),transparent 48%)}
  .shell:before{position:absolute;top:0;right:22px;left:22px;height:3px;border-radius:0 0 4px 4px;background:linear-gradient(90deg,var(--accent),var(--accent2),var(--accent3));content:""}
  .header{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0}.identity{display:flex;align-items:center;gap:11px;min-width:0}.icon-wrap{display:grid;place-items:center;flex:0 0 44px;width:44px;height:44px;border:1px solid color-mix(in srgb,var(--accent) 24%,transparent);border-radius:15px;background:linear-gradient(145deg,var(--accent),var(--accent2));box-shadow:0 7px 18px color-mix(in srgb,var(--accent) 22%,transparent);color:#fff}.icon-wrap ha-icon{--mdc-icon-size:23px}.identity-copy{min-width:0}.eyebrow{color:var(--accent);font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.title{overflow:hidden;margin:3px 0 0;font-size:clamp(15px,2.3cqi,19px);font-weight:780;letter-spacing:-.03em;text-overflow:ellipsis;white-space:nowrap}
  .reading{flex:0 1 auto;min-width:0;text-align:right}.reading-value{overflow:hidden;color:var(--accent);font-size:clamp(17px,2.6cqi,22px);font-weight:830;letter-spacing:-.04em;line-height:1.1;text-overflow:ellipsis;white-space:nowrap;font-variant-numeric:tabular-nums}.reading-label{margin-top:4px;color:var(--secondary-text-color);font-size:9px;font-weight:750;letter-spacing:.1em;text-transform:uppercase}
  .meter-panel{margin-top:15px;padding:12px 13px;border:1px solid color-mix(in srgb,var(--accent) 17%,var(--divider-color));border-radius:17px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 7%,var(--card-background-color,#fff)),color-mix(in srgb,var(--accent2) 4%,var(--card-background-color,#fff)) 68%,var(--card-background-color,#fff))}.section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}.section-title{font-size:11px;font-weight:760}.meter-pct{color:var(--accent);font-size:11px;font-weight:800;font-variant-numeric:tabular-nums}.track{height:8px;overflow:hidden;border-radius:999px;background:color-mix(in srgb,var(--accent) 12%,var(--secondary-background-color,var(--card-background-color,#fff)))}.fill{height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--accent),var(--accent2));box-shadow:0 1px 7px color-mix(in srgb,var(--accent) 28%,transparent);transition:width .35s ease}.range-limits{display:flex;justify-content:space-between;gap:8px;margin-top:7px;color:var(--secondary-text-color);font-size:9px;font-variant-numeric:tabular-nums}.hint{margin-top:12px;color:var(--secondary-text-color);font-size:10px;line-height:1.4}
  @container sensor-meter-card (max-width:480px){.shell{padding:14px}.header{gap:9px}.identity{gap:9px}.icon-wrap{flex-basis:40px;width:40px;height:40px;border-radius:14px}.icon-wrap ha-icon{--mdc-icon-size:21px}.reading-value{font-size:17px}.meter-panel{margin-top:12px;padding:11px;border-radius:15px}}
  @container sensor-meter-card (max-width:360px){.shell{padding:12px}.header{gap:7px}.identity{gap:7px}.icon-wrap{flex-basis:36px;width:36px;height:36px;border-radius:12px}.icon-wrap ha-icon{--mdc-icon-size:19px}.eyebrow{font-size:8px}.title{font-size:14px}.reading-value{font-size:15px}.reading-label{font-size:8px}.meter-panel{margin-top:10px;padding:10px}.section-title,.meter-pct{font-size:10px}}
  @media(prefers-reduced-motion:reduce){*,*::before,*::after{transition:none!important;scroll-behavior:auto!important}}
`;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

class SensorMeterCard extends HTMLElement {
  static getStubConfig() {
    return { entity: "sensor.example", icon: "mdi:chart-box-outline", palette: "ocean", min: 0, max: 100, show_bar: true };
  }

  static getConfigForm() {
    return { schema: [
      { name: "entity", required: true, selector: { entity: { domain: ["sensor"] } } },
      { name: "title", selector: { text: {} } },
      { name: "icon", selector: { icon: {} } },
      { name: "palette", selector: { select: { options: ["aurora", "ocean", "sunset", "lavender"], mode: "dropdown" } } },
      { name: "min", selector: { number: { mode: "box", step: 1 } } },
      { name: "max", selector: { number: { mode: "box", step: 1 } } },
      { name: "decimals", selector: { number: { min: 0, max: 6, step: 1, mode: "box" } } },
      { name: "show_bar", selector: { boolean: {} } },
    ], computeLabel: (field) => FORM_LABELS[field.name] || field.name };
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._holdTimer = undefined;
    this._holdStart = undefined;
    this._longPressTriggered = false;
    this.addEventListener("pointerdown", (event) => this._onPointerDown(event));
    this.addEventListener("pointermove", (event) => this._onPointerMove(event));
    this.addEventListener("pointerup", () => this._onPointerEnd());
    this.addEventListener("pointercancel", () => this._onPointerEnd());
    this.addEventListener("pointerleave", () => this._onPointerEnd());
    this.addEventListener("contextmenu", (event) => this._onContextMenu(event));
    this.shadowRoot.addEventListener("click", () => this._onCardClick());
  }

  setConfig(config) {
    if (!config || typeof config !== "object" || !config.entity) throw new Error("Choose a sensor entity for the Sensor Meter Card.");
    const min = finiteNumber(config.min);
    const max = finiteNumber(config.max);
    if (min !== null && max !== null && max <= min) throw new Error("The maximum value must be greater than the minimum value.");
    const palette = PALETTES.has(config.palette) ? config.palette : LEGACY_PALETTES[config.palette] || "ocean";
    this._config = { show_bar: true, ...config, palette };
    this._render();
  }

  set hass(value) {
    this._hass = value;
    const entity = this._entity();
    const signature = entity ? JSON.stringify(entity) : "missing";
    if (signature !== this._entitySignature) {
      this._entitySignature = signature;
      this._render();
    }
  }

  get hass() { return this._hass; }
  getCardSize() { return 2; }

  _entity() { return this._hass?.states?.[this._config.entity]; }

  _formatValue(value, attributes) {
    const configured = finiteNumber(this._config.decimals);
    const suggested = finiteNumber(attributes.suggested_display_precision);
    const decimals = configured === null ? Math.min(2, Math.max(0, suggested ?? 2)) : Math.min(6, Math.max(0, Math.trunc(configured)));
    const formatted = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: configured === null && suggested === null ? 0 : decimals,
      maximumFractionDigits: decimals,
    }).format(value);
    const unit = attributes.unit_of_measurement || "";
    return `${formatted}${unit === "%" ? "%" : unit ? ` ${unit}` : ""}`;
  }

  _onCardClick() {
    if (this._longPressTriggered) {
      this._longPressTriggered = false;
      return;
    }
    this._showMoreInfo();
  }

  _onPointerDown(event) {
    if (event.button !== 0) return;
    this._holdStart = { x: event.clientX, y: event.clientY };
    this._holdTimer = setTimeout(() => {
      this._longPressTriggered = true;
      this._showMoreInfo();
    }, 600);
  }

  _onPointerMove(event) {
    if (this._holdStart && Math.hypot(event.clientX - this._holdStart.x, event.clientY - this._holdStart.y) > 10) this._onPointerEnd();
  }

  _onPointerEnd() {
    if (this._holdTimer) clearTimeout(this._holdTimer);
    this._holdTimer = undefined;
    this._holdStart = undefined;
  }

  _onContextMenu(event) {
    if (!this._longPressTriggered) return;
    event.preventDefault();
    this._longPressTriggered = false;
  }

  _showMoreInfo() {
    if (!this._config.entity) return;
    this.dispatchEvent(new CustomEvent("hass-more-info", {
      bubbles: true,
      composed: true,
      detail: { entityId: this._config.entity },
    }));
  }

  _render() {
    if (!this._config.entity || !this._hass || !this.shadowRoot) return;
    const entity = this._entity();
    if (!entity) {
      this.shadowRoot.innerHTML = `<style>${STYLE}</style><ha-card><div class="content"><div class="copy"><div class="value">Sensor not found</div><div class="name">${escapeHtml(this._config.entity)}</div></div></div></ha-card>`;
      return;
    }

    const attributes = entity.attributes || {};
    const value = finiteNumber(entity.state);
    const unavailable = ["unknown", "unavailable"].includes(String(entity.state).toLowerCase()) || value === null;
    const title = this._config.title || attributes.friendly_name || this._config.entity;
    const icon = this._config.icon || attributes.icon || "mdi:chart-box-outline";
    const unit = attributes.unit_of_measurement || "";
    const formattedValue = value === null ? (String(entity.state).toLowerCase() === "unknown" ? "Unknown" : "Unavailable") : this._formatValue(value, attributes);
    const configuredMin = finiteNumber(this._config.min);
    const configuredMax = finiteNumber(this._config.max);
    const min = configuredMin ?? finiteNumber(attributes.min_value) ?? finiteNumber(attributes.min) ?? 0;
    const max = configuredMax ?? finiteNumber(attributes.max_value) ?? finiteNumber(attributes.max) ?? (unit === "%" ? 100 : null);
    const validRange = max !== null && max > min;
    const showBar = this._config.show_bar !== false && !unavailable && validRange;
    const progress = showBar ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;
    const meter = this._config.show_bar === false ? "" : showBar
      ? `<section class="meter-panel"><div class="section-head"><span class="section-title">Sensor range</span><span class="meter-pct">${Math.round(progress)}% of range</span></div><div class="track" role="meter" aria-label="${escapeHtml(title)}" aria-valuemin="${min}" aria-valuemax="${max}" aria-valuenow="${value}" aria-valuetext="${escapeHtml(formattedValue)}"><div class="fill" style="width:${progress}%"></div></div><div class="range-limits"><span>${escapeHtml(this._formatValue(min, attributes))}</span><span>${escapeHtml(this._formatValue(max, attributes))}</span></div></section>`
      : unavailable ? "" : `<div class="hint">Set a maximum value to show the progress bar.</div>`;

    this.shadowRoot.innerHTML = `
      <style>${STYLE}</style>
      <ha-card data-palette="${this._config.palette}">
        <div class="shell">
          <header class="header">
            <div class="identity"><div class="icon-wrap"><ha-icon icon="${escapeHtml(icon)}"></ha-icon></div><div class="identity-copy"><div class="eyebrow">Home Assistant · Sensor</div><h2 class="title">${escapeHtml(title)}</h2></div></div>
            <div class="reading"><div class="reading-value">${escapeHtml(formattedValue)}</div><div class="reading-label">Current reading</div></div>
          </header>
          ${meter}
        </div>
      </ha-card>`;
  }
}

if (!customElements.get(CARD_TYPE)) customElements.define(CARD_TYPE, SensorMeterCard);

window.customCards = window.customCards || [];
window.customCards.push({ type: CARD_TYPE, name: "Sensor Meter Card", description: "Compact, theme-aware numeric sensor card with a configurable progress meter and More Info." });
