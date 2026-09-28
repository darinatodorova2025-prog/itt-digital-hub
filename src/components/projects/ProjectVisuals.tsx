import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { ArrowRight } from "@/components/ui/Icons";

export function SampleLabel({ children }: { children: ReactNode }) {
  return <p className="label mb-4">{children}</p>;
}

export function PullQuote({ children }: { children: ReactNode }) {
  return <p className="mt-6 max-w-[46ch] border-l-2 border-signal pl-5 font-sans text-h4 text-ink">{children}</p>;
}

export function CapabilityList({ items }: { items: readonly string[] }) {
  return (
    <ol className="mt-6 grid gap-3 sm:grid-cols-2">
      {items.map((item, index) => (
        <li key={item} className="surface-card p-5 md:p-5">
          <p className="label">{String(index + 1).padStart(2, "0")}</p>
          <p className="mt-2 text-small text-ink">{item}</p>
        </li>
      ))}
    </ol>
  );
}

export function ProcessFlow({ items }: { items: readonly string[] }) {
  return (
    <ol className="mt-6 flex flex-wrap items-stretch gap-y-3">
      {items.map((item, index) => (
        <li key={item} className="flex items-center">
          <span className="inline-flex min-h-10 items-center gap-2.5 rounded-ctrl border border-ink bg-paper px-3 py-1.5 text-small font-medium text-ink">
            <span className="font-mono text-[0.6875rem] tracking-[0.06em] text-ink-3">{String(index + 1).padStart(2, "0")}</span>
            {item}
          </span>
          {index < items.length - 1 ? <ArrowRight className="mx-1.5 shrink-0 text-ink-3" aria-hidden="true" /> : null}
        </li>
      ))}
    </ol>
  );
}

function Pill({ children, tone = "paper" }: { children: ReactNode; tone?: "paper" | "signal" | "ink" }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-ctrl border px-3 py-1.5 text-center text-small font-medium",
        tone === "signal" && "border-signal bg-signal text-on-dark",
        tone === "ink" && "border-ink bg-ink text-on-dark",
        tone === "paper" && "border-ink bg-paper text-ink",
      )}
    >
      {children}
    </span>
  );
}

export function WarrantyCardDiagram({ locale }: { locale: Locale }) {
  const physical = locale === "bg" ? ["Производител", "Дистрибутори", "Търговци", "Клиент"] : ["Manufacturer", "Distributors", "Retailers", "Customer"];
  const digital = locale === "bg" ? ["Производител", "Платформа", "Клиент"] : ["Manufacturer", "Platform", "Customer"];
  const physicalLabel = locale === "bg" ? "Дистрибуционен модел" : "Distribution model";
  const digitalLabel = locale === "bg" ? "Директна дигитална връзка" : "Direct digital relationship";

  return (
    <div className="flex h-full flex-col justify-center gap-3 px-4 pb-16 pt-4 text-on-dark md:gap-5 md:px-5">
      <div className="hidden lg:block">
        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-on-dark-muted">{physicalLabel}</p>
        <ol className="mt-2 flex flex-wrap items-center gap-y-2">
          {physical.map((item, index) => (
            <li key={item} className="flex items-center">
              <span className="inline-flex min-h-8 items-center rounded-ctrl border border-on-dark/25 px-2.5 py-1 text-[0.75rem] text-on-dark">
                {item}
              </span>
              {index < physical.length - 1 ? <ArrowRight className="mx-1 shrink-0 text-on-dark-muted" size={12} aria-hidden="true" /> : null}
            </li>
          ))}
        </ol>
      </div>
      <div>
        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-on-dark-muted">{digitalLabel}</p>
        <ol className="mt-3 flex flex-col items-start gap-2 lg:hidden">
          {digital.map((item, index) => (
            <li key={`${item}-stack`}>
              <span
                className={cn(
                  "inline-flex min-h-8 items-center rounded-ctrl px-2.5 py-1 text-[0.75rem]",
                  index === 1 ? "bg-signal text-on-dark" : "border border-on-dark/80 bg-on-dark text-ink",
                )}
              >
                {item}
              </span>
            </li>
          ))}
        </ol>
        <ol className="mt-2 hidden items-center lg:flex lg:flex-wrap lg:gap-y-2">
          {digital.map((item, index) => (
            <li key={`${item}-row`} className="flex items-center">
              <span
                className={cn(
                  "inline-flex min-h-8 items-center rounded-ctrl px-2.5 py-1 text-[0.75rem]",
                  index === 1 ? "bg-signal text-on-dark" : "border border-on-dark/80 bg-on-dark text-ink",
                )}
              >
                {item}
              </span>
              {index < digital.length - 1 ? (
                <span className="mx-1 inline-flex text-signal" aria-hidden="true">
                  <ArrowRight className="rotate-180" size={12} />
                  <ArrowRight className="-ml-1" size={12} />
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export function OrchestrationCardDiagram({ locale }: { locale: Locale }) {
  const steps = locale === "bg" ? ["Задача", "Политика", "Оркестрация", "Резултат"] : ["Task", "Policy", "Orchestration", "Result"];
  const cells = [
    { title: locale === "bg" ? "Локално" : "Local first", note: locale === "bg" ? "По-голям контрол" : "The default path" },
    { title: locale === "bg" ? "MCP" : "MCP", note: locale === "bg" ? "Достъп, не оркестрация" : "Access, not orchestration" },
    { title: locale === "bg" ? "Облак" : "Cloud", note: locale === "bg" ? "Когато е необходим" : "Only when justified" },
  ];

  return (
    <div className="flex h-full flex-col justify-center gap-4 px-4 pb-16 pt-4 text-on-dark md:px-5">
      <ol className="flex flex-wrap items-center gap-y-2">
        {steps.map((item, index) => (
          <li key={item} className="flex items-center">
            <span className="inline-flex min-h-8 items-center rounded-ctrl border border-on-dark/25 px-2.5 py-1 text-[0.75rem]">
              {item}
            </span>
            {index < steps.length - 1 ? <ArrowRight className="mx-1 shrink-0 text-on-dark-muted" size={12} aria-hidden="true" /> : null}
          </li>
        ))}
      </ol>
      <div className="grid grid-cols-3 gap-2">
        {cells.map((cell, index) => (
          <div
            key={cell.title}
            className={cn("rounded-[0.85rem] px-2.5 py-2.5", index === 2 ? "border border-signal/50 bg-signal/20" : "bg-white/8")}
          >
            <p className="text-[0.75rem] leading-snug text-on-dark">{cell.title}</p>
            <p className="mt-1 text-[0.625rem] text-on-dark-muted">{cell.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WarrantyVerificationVisual({ locale }: { locale: Locale }) {
  const routineTitle = locale === "bg" ? "Рутинна проверка" : "Routine verification";
  const routineBody =
    locale === "bg"
      ? "ИИ чете документа, извлича датата и продължава автоматично, когато всичко съвпада."
      : "AI reads the document, extracts the date and continues automatically when everything matches.";
  const exceptionTitle = locale === "bg" ? "Изключения" : "Exceptions";
  const exceptionBody =
    locale === "bg"
      ? "Непълни или несъгласувани случаи отиват към система за обработка на случаи за човешка проверка."
      : "Incomplete or inconsistent cases go to a case-management system for human review.";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-[1.25rem] bg-marine p-5 text-on-dark md:p-6">
        <p className="label-dark">{routineTitle}</p>
        <p className="mt-4 text-small text-on-dark">{routineBody}</p>
      </div>
      <div className="rounded-[1.25rem] border border-line bg-white p-5 md:p-6">
        <p className="label">{exceptionTitle}</p>
        <p className="mt-4 text-small text-ink-2">{exceptionBody}</p>
      </div>
    </div>
  );
}

export function WarrantyRelationVisual({ locale }: { locale: Locale }) {
  const physical = locale === "bg" ? ["Производител", "Дистрибутори", "Търговци", "Клиент"] : ["Manufacturer", "Distributors", "Retailers", "Customer"];
  const digital = locale === "bg" ? ["Производител", "Дигитална платформа", "Клиент"] : ["Manufacturer", "Digital platform", "Customer"];
  const physicalLabel = locale === "bg" ? "Дистрибуционен модел" : "Distribution model";
  const digitalLabel = locale === "bg" ? "Директна дигитална връзка" : "Direct digital relationship";

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-line bg-white p-5 md:p-7">
      <p className="label mb-4">{physicalLabel}</p>
      <ol className="flex flex-wrap items-center gap-y-3">
        {physical.map((item, index) => (
          <li key={item} className="flex items-center">
            <Pill>{item}</Pill>
            {index < physical.length - 1 ? <ArrowRight className="mx-1.5 shrink-0 text-ink-3" aria-hidden="true" /> : null}
          </li>
        ))}
      </ol>
      <p className="label mt-8 mb-4">{digitalLabel}</p>
      <ol className="flex flex-wrap items-center gap-y-3">
        {digital.map((item, index) => (
          <li key={`${item}-digital`} className="flex items-center">
            <Pill tone={index === 1 ? "signal" : "ink"}>{item}</Pill>
            {index < digital.length - 1 ? (
              <span className="mx-1.5 inline-flex text-signal" aria-hidden="true">
                <ArrowRight className="rotate-180" size={14} />
                <ArrowRight className="-ml-1" size={14} />
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

const sampleMarkets = [
  { name: { bg: "Пазар A", en: "Market A" }, value: 34 },
  { name: { bg: "Пазар B", en: "Market B" }, value: 28 },
  { name: { bg: "Пазар C", en: "Market C" }, value: 22 },
  { name: { bg: "Пазар D", en: "Market D" }, value: 16 },
];

export function WarrantyDashboardVisual({ locale }: { locale: Locale }) {
  const label = locale === "bg" ? "Илюстративно управленско табло · Примерни данни" : "Illustrative dashboard · Sample data";
  const mix = locale === "bg" ? "Дял от примерни регистрации" : "Share of sample registrations";
  const cases = locale === "bg" ? "Примерни случаи" : "Sample cases";
  const audience = locale === "bg" ? "Примерна аудитория" : "Sample audience";
  const open = locale === "bg" ? "За преглед" : "In review";
  const resolved = locale === "bg" ? "Решени" : "Resolved";
  const opted = locale === "bg" ? "Със съгласие" : "Opted in";
  const warrantyOnly = locale === "bg" ? "Само гаранция" : "Warranty only";
  const retailers = locale === "bg" ? ["Търговец 01", "Търговец 02", "Търговец 03"] : ["Retail partner 01", "Retail partner 02", "Retail partner 03"];
  const products = locale === "bg" ? ["Продуктова линия 12", "Продуктова линия 08", "Продуктова линия 03"] : ["Product line 12", "Product line 08", "Product line 03"];

  return (
    <figure className="overflow-hidden rounded-[1.25rem] border border-line bg-white">
      <figcaption className="border-b border-line px-5 py-3 text-meta text-ink-3">{label}</figcaption>
      <div className="grid gap-6 p-5 md:grid-cols-2 md:p-7">
        <div>
          <p className="text-small font-medium text-ink">{mix}</p>
          <ul className="mt-4 space-y-3">
            {sampleMarkets.map((row) => (
              <li key={row.name.en}>
                <div className="flex justify-between text-meta text-ink-2">
                  <span>{row.name[locale]}</span>
                  <span>{row.value}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-2">
                  <div className="h-full rounded-full bg-signal" style={{ width: `${row.value}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-4">
          <div className="rounded-[1rem] bg-paper px-4 py-4">
            <p className="text-small font-medium text-ink">{cases}</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-meta text-ink-2">
              <div>
                <dt>{open}</dt>
                <dd className="mt-1 font-sans text-h3 text-ink">12</dd>
              </div>
              <div>
                <dt>{resolved}</dt>
                <dd className="mt-1 font-sans text-h3 text-ink">41</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-[1rem] bg-paper px-4 py-4">
            <p className="text-small font-medium text-ink">{audience}</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-meta text-ink-2">
              <div>
                <dt>{opted}</dt>
                <dd className="mt-1 font-sans text-h3 text-ink">62%</dd>
              </div>
              <div>
                <dt>{warrantyOnly}</dt>
                <dd className="mt-1 font-sans text-h3 text-ink">38%</dd>
              </div>
            </dl>
          </div>
        </div>
        <div>
          <p className="text-small font-medium text-ink">{locale === "bg" ? "Примерни търговци" : "Sample retailers"}</p>
          <ul className="mt-3 space-y-2 text-small text-ink-2">
            {retailers.map((name) => (
              <li key={name} className="border-b border-line py-2">
                {name}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-small font-medium text-ink">{locale === "bg" ? "Примерни продукти" : "Sample products"}</p>
          <ul className="mt-3 space-y-2 text-small text-ink-2">
            {products.map((name) => (
              <li key={name} className="border-b border-line py-2">
                {name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </figure>
  );
}

export function CreatorWorkspaceVisual({ locale }: { locale: Locale }) {
  const label = locale === "bg" ? "Илюстративен интерфейс · Примерни данни" : "Illustrative interface · Sample data";
  const creator = locale === "bg" ? "Елена Вале" : "Elena Vale";
  const collab = locale === "bg" ? "Алпийски сезон" : "Alpine Season";
  const status = locale === "bg" ? "В ход" : "In progress";
  const deliverables = locale === "bg" ? "Доставки" : "Deliverables";
  const published = locale === "bg" ? "Публикувано съдържание" : "Published content";
  const rows =
    locale === "bg"
      ? [
          ["1 × Фотосерия", "Завършено"],
          ["1 × Видео", "В преглед"],
          ["1 × Статия", "Предстои"],
        ]
      : [
          ["1 × Photo set", "Completed"],
          ["1 × Video", "In review"],
          ["1 × Article", "Upcoming"],
        ];

  return (
    <figure className="overflow-hidden rounded-[1.25rem] border border-line bg-white">
      <figcaption className="border-b border-line px-5 py-3 text-meta text-ink-3">{label}</figcaption>
      <div className="grid gap-5 p-5 md:grid-cols-12 md:gap-6 md:p-7">
        <div className="md:col-span-4">
          <p className="label">{locale === "bg" ? "Създател" : "Creator"}</p>
          <p className="mt-2 font-sans text-h3 text-ink">{creator}</p>
          <p className="mt-1 text-small text-ink-2">{locale === "bg" ? "Пътуване, природа, продукт" : "Travel, outdoor, product"}</p>
          <p className="mt-4 text-meta text-ink-3">{locale === "bg" ? "Активно отношение от 2024" : "Active relationship since 2024"}</p>
        </div>
        <div className="rounded-[1rem] bg-paper p-4 md:col-span-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="label">{locale === "bg" ? "Сътрудничество" : "Collaboration"}</p>
              <p className="mt-2 text-h4 text-ink">{collab}</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-meta text-ink-2">{status}</span>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-small font-medium text-ink">{deliverables}</p>
              <ul className="mt-2 space-y-2 text-small text-ink-2">
                {rows.map(([item, state]) => (
                  <li key={item} className="flex justify-between gap-3 border-b border-line py-1.5">
                    <span>{item}</span>
                    <span className="text-ink-3">{state}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-small font-medium text-ink">{published}</p>
              <ul className="mt-2 space-y-2 text-small text-ink-2">
                {(locale === "bg" ? ["Фотосерия", "Кратък клип", "Бележка в блог"] : ["Photo set", "Short clip", "Blog note"]).map((item) => (
                  <li key={item} className="border-b border-line py-1.5">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}

export function CreatorAnalyticsVisual({ locale }: { locale: Locale }) {
  const label = locale === "bg" ? "Илюстративен интерфейс · Примерни данни" : "Illustrative interface · Sample data";
  const heading = locale === "bg" ? "Сравнение на представянето" : "Performance comparison";
  const rows =
    locale === "bg"
      ? [
          ["Елена Вале", "Алпийски сезон", "Висока релевантност"],
          ["Ния Брукс", "Градска серия", "Стабилно представяне"],
          ["Томас Рийв", "Продуктов тест", "За наблюдение"],
        ]
      : [
          ["Elena Vale", "Alpine Season", "High relevance"],
          ["Nia Brooks", "City series", "Steady performance"],
          ["Tomas Reeve", "Product trial", "Watch"],
        ];

  return (
    <figure className="overflow-hidden rounded-[1.25rem] border border-line bg-white">
      <figcaption className="border-b border-line px-5 py-3 text-meta text-ink-3">{label}</figcaption>
      <div className="p-5 md:p-7">
        <p className="font-sans text-h4 text-ink">{heading}</p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-small">
            <thead className="text-meta uppercase tracking-[0.06em] text-ink-3">
              <tr className="border-b border-line">
                <th className="py-2 pr-4 font-medium">{locale === "bg" ? "Създател" : "Creator"}</th>
                <th className="py-2 pr-4 font-medium">{locale === "bg" ? "Сътрудничество" : "Collaboration"}</th>
                <th className="py-2 font-medium">{locale === "bg" ? "Сигнал" : "Signal"}</th>
              </tr>
            </thead>
            <tbody className="text-ink-2">
              {rows.map((row) => (
                <tr key={row[0]} className="border-b border-line">
                  <td className="py-3 pr-4 text-ink">{row[0]}</td>
                  <td className="py-3 pr-4">{row[1]}</td>
                  <td className="py-3">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </figure>
  );
}

export function SolarMarketVisual({ locale }: { locale: Locale }) {
  const leftTitle = locale === "bg" ? "Технически капацитет" : "Technical capacity";
  const rightTitle = locale === "bg" ? "Икономическо решение" : "Economic decision";
  const left = locale === "bg" ? "Колко може да произведе централата?" : "How much can the plant produce?";
  const right = locale === "bg" ? "Има ли смисъл да произвежда точно сега?" : "Does it make economic sense right now?";
  const assets = locale === "bg" ? ["Фотоволтаично производство", "Батерийно съхранение", "Ценови сигнал от IBEX"] : ["Photovoltaic production", "Battery storage", "IBEX price signal"];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-[1.25rem] border border-line bg-white p-5 md:p-6">
        <p className="label">{leftTitle}</p>
        <p className="mt-4 font-sans text-h4 text-ink">{left}</p>
      </div>
      <div className="rounded-[1.25rem] bg-marine p-5 text-on-dark md:p-6">
        <p className="label-dark">{rightTitle}</p>
        <p className="mt-4 font-sans text-h4 text-on-dark">{right}</p>
      </div>
      <ul className="grid gap-3 md:col-span-2 md:grid-cols-3">
        {assets.map((item) => (
          <li key={item} className="rounded-[1.25rem] border border-line bg-paper px-4 py-4 text-small text-ink">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FlowArrow() {
  return (
    <span className="flex h-6 items-center px-3" aria-hidden="true">
      <ArrowRight className="rotate-90 text-ink-3" />
    </span>
  );
}

export function OrchestrationArchitectureVisual({ locale }: { locale: Locale }) {
  const isBg = locale === "bg";
  const task = isBg ? "Задача" : "Task";
  const policy = isBg ? "Политика за изпълнение" : "Execution policy";
  const orch = isBg ? "Оркестрация" : "Orchestration";
  const workers = isBg ? "Локални работници" : "Local workers";
  const verify = isBg ? "Оценка и проверка" : "Evaluation and verification";
  const result = isBg ? "Резултат" : "Result";
  const mcp = isBg ? "MCP: инструменти, данни и проектен контекст" : "MCP: tools, data and project context";
  const mcpNote = isBg
    ? "MCP осигурява достъп. Оркестрацията управлява изпълнението."
    : "MCP provides access. The orchestration layer owns execution.";
  const cloud = isBg ? "Избирателна облачна интелигентност" : "Selective cloud intelligence";
  const cloudNote = isBg ? "Само когато е оправдано" : "Only when justified";

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-line bg-white p-5 md:p-7">
      <div className="flex max-w-3xl flex-col items-start">
        <Pill>{task}</Pill>
        <FlowArrow />
        <Pill>{policy}</Pill>
        <FlowArrow />
        <div className="grid w-full gap-3 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
          <Pill>{orch}</Pill>
          <div className="rounded-[1rem] border border-signal/40 bg-signal/10 px-4 py-3">
            <p className="text-small font-medium text-ink">{cloud}</p>
            <p className="mt-1 text-meta text-ink-3">{cloudNote}</p>
          </div>
        </div>
        <FlowArrow />
        <Pill>{workers}</Pill>
        <p className="px-3 py-2 text-meta text-ink-3" aria-hidden="true">
          ↕
        </p>
        <div className="w-full rounded-[1rem] bg-paper px-4 py-4">
          <p className="text-small font-medium text-ink">{mcp}</p>
          <p className="mt-2 text-meta text-ink-3">{mcpNote}</p>
        </div>
        <FlowArrow />
        <Pill>{verify}</Pill>
        <FlowArrow />
        <Pill tone="signal">{result}</Pill>
      </div>
    </div>
  );
}
