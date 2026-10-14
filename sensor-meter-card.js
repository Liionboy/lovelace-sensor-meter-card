const CARD_TYPE = "sensor-meter-card";
const PALETTES = new Set(["green", "blue", "red", "orange", "teal", "purple"]);
const FORM_LABELS = {
  entity: "Sensor entity",
  title: "Card title",
  icon: "Icon override",
  palette: "Bar color",
  min: "Minimum value",
  max: "Maximum value",
  decimals: "Decimal places",
  show_bar: "Show progress bar",
};

const STYLE = `
  :host{display:block;min-width:0;max-width:100%;color:var(--primary-text-color)}
  ha-card{box-sizing:border-box;width:100%;min-width:0;max-width:100%;container-type:inline-size;container-name:card;overflow:hidden;border:1px solid color-mix(in srgb,var(--divider-color) 52%,transparent);border-radius:22px;background:var(--ha-card-background,var(--card-background-color,#fff));box-shadow:var(--ha-card-box-shadow,0 8px 24px rgba(25,35,55,.1));cursor:pointer;touch-action:pan-y}
  ha-card[data-palette="green"]{--meter:#55c461}
  ha-card[data-palette="blue"]{--meter:#4c5cf5}
  ha-card[data-palette="red"]{--meter:#e95142}
  ha-card[data-palette="orange"]{--meter:#f39a38}
  ha-card[data-palette="teal"]{--meter:#20a9a5}
  ha-card[data-palette="purple"]{--meter:#8a63d2}
  .content{display:flex;align-items:center;gap:13px;min-width:0;padding:14px 15px 12px}
  .icon-wrap{display:grid;place-items:center;flex:0 0 42px;width:42px;height:42px;border-radius:50%;background:color-mix(in srgb,var(--secondary-text-color) 9%,var(--card-background-color,#fff));color:var(--secondary-text-color)}
  .icon-wrap ha-icon{--mdc-icon-size:20px}
  .copy{min-width:0;flex:1}
  .value{overflow:hidden;font-size:16px;font-weight:800;letter-spacing:-.025em;line-height:1.2;text-overflow:ellipsis;white-space:nowrap;font-variant-numeric:tabular-nums}
  .name{overflow:hidden;margin-top:3px;color:var(--secondary-text-color);font-size:11px;font-weight:650;line-height:1.25;text-overflow:ellipsis;white-space:nowrap}
  .meter{position:relative;height:34px;overflow:hidden;background:color-mix(in srgb,var(--meter) 13%,var(--secondary-background-color,var(--card-background-color,#fff)))}
  .fill{height:100%;background:var(--meter);transition:width .35s ease}
  .meter-value{position:absolute;inset:0 9px 0 auto;display:flex;align-items:center;max-width:75%;overflow:hidden;color:var(--primary-text-color);font-size:11px;font-weight:750;text-overflow:ellipsis;white-space:nowrap;font-variant-numeric:tabular-nums}
  .hint{padding:0 15px 11px;color:var(--secondary-text-color);font-size:10px;line-height:1.35}
  @container card (max-width:360px){.content{gap:9px;padding:12px 12px 10px}.icon-wrap{flex-basis:36px;width:36px;height:36px}.icon-wrap ha-icon{--mdc-icon-size:18px}.value{font-size:15px}.name{font-size:10px}.meter{height:30px}.meter-value{font-size:10px}}
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
    return { entity: "sensor.example", icon: "mdi:chart-box-outline", palette: "blue", min: 0, max: 100, show_bar: true };
  }

  static getConfigForm() {
    return { schema: [
      { name: "entity", required: true, selector: { entity: { domain: ["sensor"] } } },
      { name: "title", selector: { text: {} } },
      { name: "icon", selector: { icon: {} } },
      { name: "palette", selector: { select: { options: [...PALETTES], mode: "dropdown" } } },
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
    this._config = { show_bar: true, ...config, palette: PALETTES.has(config.palette) ? config.palette : "blue" };
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
    return `${formatted}${unit === "%" ? "" : unit ? ` ${unit}` : ""}`;
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
      ? `<div class="meter" role="meter" aria-label="${escapeHtml(title)}" aria-valuemin="${min}" aria-valuemax="${max}" aria-valuenow="${value}"><div class="fill" style="width:${progress}%"></div><div class="meter-value">${escapeHtml(formattedValue)}</div></div>`
      : unavailable ? "" : `<div class="hint">Set a maximum value to show the progress bar.</div>`;

    this.shadowRoot.innerHTML = `
      <style>${STYLE}</style>
      <ha-card data-palette="${this._config.palette}">
        <div class="content">
          <div class="icon-wrap"><ha-icon icon="${escapeHtml(icon)}"></ha-icon></div>
          <div class="copy"><div class="value">${escapeHtml(formattedValue)}</div><div class="name">${escapeHtml(title)}</div></div>
        </div>
        ${meter}
      </ha-card>`;
  }
}

if (!customElements.get(CARD_TYPE)) customElements.define(CARD_TYPE, SensorMeterCard);

window.customCards = window.customCards || [];
window.customCards.push({ type: CARD_TYPE, name: "Sensor Meter Card", description: "Compact, theme-aware numeric sensor card with a configurable progress meter and More Info." });
