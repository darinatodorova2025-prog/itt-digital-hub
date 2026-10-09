import { useState, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import { Card, Sheet, type Side } from "./components";
import { qrReady, presets } from "./geometry.mjs";
import qr from "../config/qr.json";
import "./card.css";
import "./preview.css";
type View = "both" | Side | "sheet";
function Preview() {
  const [view, setView] = useState<View>("sheet");
  const [preset, setPreset] = useState<"8up" | "4up">("8up");
  const config = presets[preset];
  const [guides, setGuides] = useState(false);
  const [proof, setProof] = useState(false);
  const [zoom, setZoom] = useState(40);
  const [calibration, setCalibration] = useState(
    Number(localStorage.getItem("itt-card-screen-mm")) || 100,
  );
  const [measured, setMeasured] = useState("100");
  const scale = ((zoom / 100) * calibration) / 100;
  function calibrate() {
    const mm = Number(measured);
    if (mm > 20 && mm < 500) {
      const next = (calibration * 100) / mm;
      setCalibration(next);
      localStorage.setItem("itt-card-screen-mm", String(next));
      setZoom(100);
    }
  }
  return (
    <div className="preview-app">
      <aside className="controls">
        <div className="studio-brand">
          ITT <span>Digital Hub</span>
        </div>
        <h1>Конферентна карта</h1>
        <p className="studio-description">
          Редактируем текст и графика.
          <br />
          Точна геометрия за печат.
        </p>
        <div className="spec">
          65 × 90 mm <span>+ 3 mm bleed</span>
        </div>
        <fieldset>
          <legend>Изглед</legend>
          <div className="view-buttons">
            {(
              [
                ["both", "Двете страни"],
                ["front", "Лице"],
                ["back", "Гръб"],
                ["sheet", "A4 двустранно"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                aria-pressed={view === id}
                onClick={() => {
                  setView(id);
                  if (id === "sheet") setZoom(40);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Подредба за печат</legend>
          <div className="view-buttons">
            <button aria-pressed={preset === "8up"} onClick={() => setPreset("8up")}>8 карти · A4 landscape</button>
            <button aria-pressed={preset === "4up"} onClick={() => setPreset("4up")}>4 карти · A4 portrait</button>
          </div>
          <p className="control-note">{preset === "8up" ? "Къс ръб · 19 двустранни копия = 152 карти" : "Дълъг ръб · 4 карти на лист"}</p>
        </fieldset>
        <fieldset>
          <legend>Проверка</legend>
          <label className="toggle">
            <input
              type="checkbox"
              checked={guides}
              onChange={(e) => setGuides(e.target.checked)}
            />{" "}
            Bleed · Trim · Безопасна зона
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={proof}
              onChange={(e) => setProof(e.target.checked)}
            />{" "}
            Номерирана A4 проба
          </label>
          <p className="control-note">
            Насоките са само за преглед. В PDF се добавят единствено външните
            ножове.
          </p>
        </fieldset>
        <fieldset>
          <legend>Мащаб на екрана</legend>
          <label className="zoom-control">
            {zoom}%
            <input
              aria-label="Мащаб"
              type="range"
              min="20"
              max="250"
              step="10"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </label>
          <button className="text-button" onClick={() => setZoom(100)}>
            Физически размер · 100%
          </button>
          <details>
            <summary>Калибриране с линийка</summary>
            <p>
              При browser zoom 100% измерете линията долу. Въведете измерените
              mm.
            </p>
            <div
              className="ruler"
              style={{ width: `${(100 * calibration) / 100}mm` }}
            >
              100 mm
            </div>
            <label>
              Измерени mm
              <input
                type="number"
                aria-label="Измерена линия в mm"
                value={measured}
                onChange={(e) => setMeasured(e.target.value)}
              />
            </label>
            <button onClick={calibrate}>Калибрирай екрана</button>
            <button
              onClick={() => {
                setCalibration(100);
                localStorage.removeItem("itt-card-screen-mm");
              }}
            >
              Нулирай
            </button>
          </details>
          <p className="control-note">
            CSS mm зависят от DPI и browser zoom. Калибрацията е за текущия
            монитор и не променя PDF.
          </p>
        </fieldset>
        <div className={`qr-status ${qrReady(qr) ? "" : "blocked"}`}>
          {qrReady(qr)
            ? "QR адресът е проверен"
            : "QR адресът чака потвърждение"}
          <a href={qr.url || "#"} target="_blank" rel="noreferrer">
            {qr.url || "Няма адрес"}
          </a>
        </div>
        <div className="export-help">
          <code>npm run print:package</code>
          <p>Генерира PDF, PNG и preflight отчет от текущия код.</p>
        </div>
      </aside>
      <main className="canvas">
        <header className="canvas-heading">
          <span>
            {view === "sheet"
              ? `A4 · ${config.columns} × ${config.rows} · ${config.duplex}`
              : "КЕЕП · ВиК предизвикателство"}
          </span>
          <span>
            {guides
              ? "Розово: trim / bleed · зелено: safe"
              : "Редакция чрез Codex · live refresh"}
          </span>
        </header>
        <div
          className={`artwork ${view === "sheet" ? "sheet-view" : ""}`}
          style={{ "--preview-scale": scale } as CSSProperties}
        >
          {(view === "both" || view === "front") && (
            <div className="preview-item">
              <div className="art-label">
                01 / ЛИЦЕ <span>Покана за участие</span>
              </div>
              <div className="scaled-card">
                <Card side="front" guides={guides} />
              </div>
            </div>
          )}
          {(view === "both" || view === "back") && (
            <div className="preview-item">
              <div className="art-label">
                02 / ГРЪБ <span>Практичен ориентир</span>
              </div>
              <div className="scaled-card">
                <Card side="back" guides={guides} />
              </div>
            </div>
          )}
          {view === "sheet" &&
            (["front", "back"] as const).map((side) => (
              <div className="preview-item" key={side}>
                <div className="art-label">
                  {side === "front" ? "01 / ЛИЦА" : "02 / ГЪРБОВЕ"}
                  <span>{config.paper.width} × {config.paper.height} mm</span>
                </div>
                <div className="scaled-sheet" style={{ "--sheet-width": `${config.paper.width}mm`, "--sheet-height": `${config.paper.height}mm` } as CSSProperties}>
                  <Sheet side={side} guides={guides} proof={proof} config={config} />
                </div>
              </div>
            ))}
        </div>
        <footer className="canvas-footer">
          RGB PDF · IBM Plex Sans · Векторен текст и QR · Офсетите за принтера
          са в config/print.json
        </footer>
      </main>
    </div>
  );
}
const params = new URLSearchParams(location.search);
const side: Side = params.get("side") === "back" ? "back" : "front";
createRoot(document.getElementById("root")!).render(
  params.get("render") === "card" ? (
    <div className="print-surface">
      <Card side={side} />
    </div>
  ) : (
    <Preview />
  ),
);
