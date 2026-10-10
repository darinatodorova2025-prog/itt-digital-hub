"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { capture, captureOnce } from "@/lib/analytics/client";
import { deltaTBucket, flowBucket, insulationBucket } from "@/lib/analytics/pipe";
import { pipeThermalAnalysis as copy } from "@/content/pipe-thermal-analysis";
import {
  DEFAULT_INPUT,
  calculatePipeThermal,
  comparisonCurves,
  errorForField,
  fieldErrorMessage,
  formatH,
  formatHours,
  formatPower,
  formatTemperature,
  formatUa,
  overlayComparisonMm,
  validatePipeThermalInput,
  type HOutMode,
  type PipeThermalField,
  type WindClass,
} from "@/lib/pipe-thermal";
import { cn } from "@/lib/cn";
import { FieldGroup, NumericField, SelectField } from "./Fields";
import { TemperatureChart, compareLineStyle } from "./TemperatureChart";

type Draft = Record<PipeThermalField, string> & {
  hOutMode: HOutMode;
  wind: WindClass;
  includePeCapacity: boolean;
};

function draftFromDefault(): Draft {
  return {
    t0C: String(DEFAULT_INPUT.t0C),
    toutC: String(DEFAULT_INPUT.toutC),
    dOutMm: String(DEFAULT_INPUT.dOutMm),
    tPeMm: String(DEFAULT_INPUT.tPeMm),
    tInsMm: String(DEFAULT_INPUT.tInsMm),
    kPe: String(DEFAULT_INPUT.kPe),
    kIns: String(DEFAULT_INPUT.kIns),
    windSpeedMs: String(DEFAULT_INPUT.windSpeedMs),
    hManual: String(DEFAULT_INPUT.hManual),
    flowM3h: String(DEFAULT_INPUT.flowM3h),
    kWater: String(DEFAULT_INPUT.kWater),
    muWater: String(DEFAULT_INPUT.muWater),
    prWater: String(DEFAULT_INPUT.prWater),
    kAir: String(DEFAULT_INPUT.kAir),
    rhoWater: String(DEFAULT_INPUT.rhoWater),
    cpWater: String(DEFAULT_INPUT.cpWater),
    rhoPe: String(DEFAULT_INPUT.rhoPe),
    cpPe: String(DEFAULT_INPUT.cpPe),
    hOutMode: DEFAULT_INPUT.hOutMode,
    wind: DEFAULT_INPUT.wind,
    includePeCapacity: DEFAULT_INPUT.includePeCapacity,
  };
}

export function PipeThermalWorkspace({ locale }: { locale: Locale }) {
  const [draft, setDraft] = useState<Draft>(draftFromDefault);
  const [overlayMm, setOverlayMm] = useState<number[]>([]);
  const dirty = useRef(false);
  const sequence = useRef(0);
  const lastSignature = useRef("");
  const advancedOpen = useRef(false);
  const units = copy.units;

  function edit(patch: Partial<Draft>) {
    dirty.current = true;
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  const parsed = useMemo(
    () =>
      validatePipeThermalInput({
        ...draft,
        t0C: draft.t0C,
        toutC: draft.toutC,
        dOutMm: draft.dOutMm,
        tPeMm: draft.tPeMm,
        tInsMm: draft.tInsMm,
        kPe: draft.kPe,
        kIns: draft.kIns,
        windSpeedMs: draft.windSpeedMs,
        hManual: draft.hManual,
        flowM3h: draft.flowM3h,
        kWater: draft.kWater,
        muWater: draft.muWater,
        prWater: draft.prWater,
        kAir: draft.kAir,
        rhoWater: draft.rhoWater,
        cpWater: draft.cpWater,
        rhoPe: draft.rhoPe,
        cpPe: draft.cpPe,
        hOutMode: draft.hOutMode,
        wind: draft.wind,
        includePeCapacity: draft.includePeCapacity,
      }),
    [draft],
  );

  const result = parsed.ok ? calculatePipeThermal(parsed.input) : null;
  const errors = parsed.ok ? [] : parsed.errors;
  const domainHours = result?.profile.at(-1)?.hours ?? 24;
  const overlays =
    parsed.ok && result ? comparisonCurves(parsed.input, overlayMm, domainHours) : [];

  function toggleOverlay(tInsMm: number) {
    if (parsed.ok && parsed.input.tInsMm === tInsMm) return;
    setOverlayMm((prev) => {
      const enabled = !prev.includes(tInsMm);
      capture("tool_feature_used", {
        tool_id: "pipe-thermal-analysis",
        locale,
        feature: "insulation_overlay",
        insulation_mm: tInsMm,
        enabled,
      });
      return enabled ? [...prev, tInsMm] : prev.filter((mm) => mm !== tInsMm);
    });
  }

  useEffect(() => {
    if (!dirty.current) return;
    const fields = parsed.ok ? "" : parsed.errors.map((error) => error.field).join(",");
    const signature = [
      parsed.ok ? "ok" : "bad",
      draft.flowM3h,
      draft.tInsMm,
      draft.t0C,
      draft.toutC,
      draft.hOutMode,
      draft.wind,
      fields,
    ].join("|");
    if (signature === lastSignature.current) return;
    const timer = window.setTimeout(() => {
      lastSignature.current = signature;
      sequence.current += 1;
      const advanced = advancedOpen.current || advancedChanged(draft);
      if (parsed.ok && result) {
        const initial = Number(draft.t0C);
        const ambient = Number(draft.toutC);
        capture("tool_operation_result", {
          tool_id: "pipe-thermal-analysis",
          locale,
          status: "completed",
          confirmation: "client",
          successful: true,
          fully_completed: true,
          sequence: sequence.current,
          first: sequence.current === 1,
          h_out_mode: draft.hOutMode,
          wind: draft.hOutMode === "wind" ? draft.wind : null,
          flow_bucket: flowBucket(parsed.input.flowM3h),
          insulation_bucket: insulationBucket(parsed.input.tInsMm),
          delta_t_bucket: deltaTBucket(Number.isFinite(initial) ? initial : parsed.input.t0C, Number.isFinite(ambient) ? ambient : parsed.input.toutC),
          overlay_count: overlayMm.length,
          advanced,
        });
        return;
      }
      capture("tool_operation_result", {
        tool_id: "pipe-thermal-analysis",
        locale,
        status: "invalid",
        confirmation: "client",
        successful: false,
        fully_completed: false,
        sequence: sequence.current,
        first: sequence.current === 1,
        validation_fields: parsed.ok ? [] : parsed.errors.map((error) => error.field),
        advanced,
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [draft, locale, overlayMm.length, parsed, result]);

  useEffect(() => {
    const onLeave = () => {
      if (!dirty.current || sequence.current > 0) return;
      capture("tool_operation_result", {
        tool_id: "pipe-thermal-analysis",
        locale,
        status: "abandoned",
        confirmation: "client",
        successful: false,
        fully_completed: false,
        error_code: "abandoned",
        first: true,
      });
    };
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, [locale]);

  function num(field: PipeThermalField, unit: string, hint?: string) {
    const err = errorForField(errors, field);
    return (
      <NumericField
        id={`pta-${field}`}
        label={copy.fields[field][locale]}
        value={draft[field]}
        unit={unit}
        hint={hint}
        error={err ? fieldErrorMessage(err, locale) : undefined}
        onChange={(value) => edit({ [field]: value })}
      />
    );
  }

  return (
    <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)] lg:gap-5">
      <form
        className="grid min-w-0 w-full gap-5 rounded-[1.25rem] bg-white p-5 md:p-6"
        onSubmit={(event) => event.preventDefault()}
        autoComplete="off"
        noValidate
      >
        <h2 className="text-h4 text-ink">{copy.inputsTitle[locale]}</h2>

        <FieldGroup title={copy.groups.pipe[locale]}>
          {num("dOutMm", units.mm)}
          {num("tPeMm", units.mm)}
          {num("kPe", units.mK)}
          <label className="flex min-h-9 cursor-pointer items-start gap-2.5 text-meta text-ink-2">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-signal"
              checked={draft.includePeCapacity}
              onChange={(event) => edit({ includePeCapacity: event.target.checked })}
            />
            <span>{copy.fields.includePeCapacity[locale]}</span>
          </label>
        </FieldGroup>

        <FieldGroup title={copy.groups.insulation[locale]}>
          {num("tInsMm", units.mm)}
          {num("kIns", units.mK, copy.hints.kIns[locale])}
        </FieldGroup>

        <FieldGroup title={copy.groups.fluid[locale]}>
          {num("flowM3h", units.m3h, copy.hints.flowM3h[locale])}
        </FieldGroup>

        <FieldGroup title={copy.groups.conditions[locale]}>
          {num("t0C", units.c)}
          {num("toutC", units.c)}
          <SelectField
            id="pta-hOutMode"
            label={copy.fields.hOutMode[locale]}
            value={draft.hOutMode}
            hint={copy.hints.hOutMode[locale]}
            onChange={(value) => edit({ hOutMode: value as HOutMode })}
          >
            <option value="wind">{copy.modes.wind[locale]}</option>
            <option value="physics">{copy.modes.physics[locale]}</option>
            <option value="manual">{copy.modes.manual[locale]}</option>
          </SelectField>
          {draft.hOutMode === "wind" ? (
            <SelectField
              id="pta-wind"
              label={copy.fields.wind[locale]}
              value={draft.wind}
              onChange={(value) => edit({ wind: value as WindClass })}
            >
              <option value="calm">{copy.wind.calm[locale]}</option>
              <option value="breeze">{copy.wind.breeze[locale]}</option>
              <option value="windy">{copy.wind.windy[locale]}</option>
            </SelectField>
          ) : null}
          {draft.hOutMode === "physics" ? num("windSpeedMs", units.ms) : null}
          {draft.hOutMode === "manual" ? num("hManual", units.wm2k) : null}
        </FieldGroup>

        <details
          className="pta-advanced border-t border-line pt-4"
          onToggle={(event) => {
            advancedOpen.current = event.currentTarget.open;
            if (event.currentTarget.open) captureOnce("pipe-advanced", "tool_feature_used", { tool_id: "pipe-thermal-analysis", locale, feature: "advanced_opened" });
          }}
        >
          <summary className="cursor-pointer text-small font-medium text-ink">{copy.groups.advanced[locale]}</summary>
          <div className="mt-4 grid gap-2.5">
            {num("kWater", units.mK)}
            {num("muWater", units.pas)}
            {num("prWater", "-")}
            {num("kAir", units.mK)}
            {num("rhoWater", units.kgm3)}
            {num("cpWater", units.jkgk)}
            {num("rhoPe", units.kgm3)}
            {num("cpPe", units.jkgk)}
          </div>
        </details>
        <p className="text-meta text-ink-3">{copy.liveNote[locale]}</p>
      </form>

      <div className="min-w-0 w-full overflow-x-clip rounded-[1.25rem] bg-white p-4 md:p-5">
        {result ? (
          <div className="grid gap-5">
            <section className="rounded-[1.1rem] bg-marine p-4 text-on-dark md:p-5" data-surface="dark">
              <h2 className="text-h4 text-on-dark">{copy.resultsTitle[locale]}</h2>
              <dl className="mt-4 grid grid-cols-2 gap-2.5">
                <Kpi
                  label={copy.kpis.tau[locale]}
                  value={formatHours(result.tauHours)}
                  unit={copy.kpiUnits.tau}
                  hint={copy.kpiHint.tau[locale]}
                />
                <Kpi
                  label={copy.kpis.tZero[locale]}
                  value={result.timeToZeroHours === null ? copy.none[locale] : formatHours(result.timeToZeroHours)}
                  unit={result.timeToZeroHours === null ? undefined : copy.kpiUnits.tZero}
                  hint={result.timeToZeroHours === null ? undefined : copy.kpiHint.tZero[locale]}
                />
                <Kpi
                  label={copy.kpis.t24[locale]}
                  value={formatTemperature(result.temperatures.at24h)}
                  unit={copy.kpiUnits.t24}
                  hint={copy.kpiHint.t24[locale]}
                />
                <Kpi
                  label={copy.kpis.heat[locale]}
                  value={formatPower(result.heatLossAtT0W)}
                  unit={copy.kpiUnits.heat}
                  hint={copy.kpiHint.heat[locale]}
                />
              </dl>
            </section>

            <TemperatureChart
              locale={locale}
              points={result.profile}
              t0C={parsed.ok ? parsed.input.t0C : DEFAULT_INPUT.t0C}
              toutC={parsed.ok ? parsed.input.toutC : DEFAULT_INPUT.toutC}
              tauSeconds={result.tauSeconds}
              timeToZeroHours={result.timeToZeroHours}
              temperatureAt24hC={result.temperatures.at24h}
              currentTInsMm={parsed.ok ? parsed.input.tInsMm : DEFAULT_INPUT.tInsMm}
              comparisons={overlays}
            />

            <div>
              <h2 className="text-h4 text-ink">{copy.compare.title[locale]}</h2>
              <p className="mt-1 text-meta text-ink-3">{copy.compare.hint[locale]}</p>
              <div className="mt-3 w-full min-w-0 overflow-x-auto">
                <table className="w-full border-collapse text-left text-meta md:text-small">
                  <thead>
                    <tr className="border-b border-line text-meta text-ink-3">
                      <th className="py-2 pr-3 pl-2.5 font-medium">{copy.compare.thickness[locale]}</th>
                      <th className="py-2 pr-3 font-medium">{copy.compare.tau[locale]} (h)</th>
                      <th className="py-2 pr-3 font-medium">{copy.compare.t24[locale]}</th>
                      <th className="py-2 pr-2.5 font-medium">{copy.compare.tZero[locale]}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.insulationCompare.map((row) => {
                      const current = parsed.ok && row.tInsMm === parsed.input.tInsMm;
                      const overlayOn = overlayComparisonMm(
                        parsed.ok ? parsed.input.tInsMm : DEFAULT_INPUT.tInsMm,
                        overlayMm,
                      ).includes(row.tInsMm);
                      const style = compareLineStyle(row.tInsMm);
                      return (
                        <tr
                          key={row.tInsMm}
                          className={cn(
                            "border-b border-line/80",
                            current && "bg-marine-tint text-ink",
                            !current && overlayOn && "bg-paper",
                            !current && "cursor-pointer hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-signal",
                          )}
                          tabIndex={current ? undefined : 0}
                          role={current ? undefined : "button"}
                          aria-pressed={current ? undefined : overlayOn}
                          aria-label={
                            current
                              ? undefined
                              : `${row.tInsMm} mm. ${overlayOn ? copy.compare.hide[locale] : copy.compare.show[locale]}`
                          }
                          onClick={current ? undefined : () => toggleOverlay(row.tInsMm)}
                          onKeyDown={
                            current
                              ? undefined
                              : (event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    toggleOverlay(row.tInsMm);
                                  }
                                }
                          }
                        >
                          <td className="py-2 pr-3 pl-2.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-2">
                              <span
                                className="inline-block w-3.5 border-t-2"
                                style={{
                                  borderColor: current ? "var(--color-signal)" : style.stroke,
                                  borderStyle: current ? "solid" : "dashed",
                                  opacity: current || overlayOn ? 1 : 0.35,
                                }}
                                aria-hidden="true"
                              />
                              {row.tInsMm} mm
                              {current ? (
                                <span className="text-meta text-signal">{copy.compare.current[locale]}</span>
                              ) : null}
                            </span>
                          </td>
                          <td className="py-2 pr-3 tabular-nums">{formatHours(row.tauHours)}</td>
                          <td className="py-2 pr-3 tabular-nums">{formatTemperature(row.temperatureAt24hC)} °C</td>
                          <td className="py-2 pr-2.5 tabular-nums">
                            {row.timeToZeroHours === null ? copy.none[locale] : `${formatHours(row.timeToZeroHours)} h`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-meta text-ink-3">
                {copy.details.hOut[locale]} {formatH(result.hOut)} {units.wm2k}
                {" · "}
                {copy.details.hIn[locale]} {formatH(result.hIn)} {units.wm2k}
                {" · "}
                {copy.details.ua[locale]} {formatUa(result.uaWK)} W/K
              </p>
            </div>
          </div>
        ) : (
          <p className="max-w-[46ch] text-small text-ink-2" role="status">
            {copy.invalidSummary[locale]}
          </p>
        )}
      </div>
    </div>
  );
}

function advancedChanged(draft: Draft): boolean {
  const defaults = draftFromDefault();
  return (["kWater", "muWater", "prWater", "kAir", "rhoWater", "cpWater", "rhoPe", "cpPe"] as const).some((field) => draft[field] !== defaults[field]);
}

function Kpi({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-white/[0.06] px-3.5 py-3.5 md:px-4 md:py-4">
      <dt className="break-words text-meta text-on-dark-muted">{label}</dt>
      <dd className="mt-2 flex flex-wrap items-baseline gap-1.5">
        <span className="font-sans text-[1.65rem] leading-none tracking-tight whitespace-nowrap text-on-dark tabular-nums md:text-[1.9rem]">
          {value}
        </span>
        {unit ? <span className="text-meta text-on-dark-muted">{unit}</span> : null}
      </dd>
      {hint ? <p className="mt-2 hidden text-meta text-on-dark-muted sm:block">{hint}</p> : null}
    </div>
  );
}
