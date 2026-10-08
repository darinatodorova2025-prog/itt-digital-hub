/* eslint-disable @next/next/no-img-element -- print artwork uses exact physical image dimensions. */
import { useEffect, useState, type CSSProperties } from "react";
import QRCode from "qrcode";
import content from "../config/content.json";
import artwork from "../config/artwork.json";
import qr from "../config/qr.json";
import { full, print, slots, cropSegments, qrReady } from "./geometry.mjs";
export type Side = "front" | "back";
export function BrandHeader({ dark = false }: { dark?: boolean }) {
  return (
    <div data-safe className="brand-logo">
      <img
        src={`/assets/itt-lockup-compact${dark ? "-on-dark" : ""}.png`}
        alt={content.brand}
      />
    </div>
  );
}
export function QRSection() {
  const [svg, setSvg] = useState("");
  const ready = qrReady(qr);
  useEffect(() => {
    let active = true;
    if (ready)
      QRCode.toString(qr.url, {
        type: "svg",
        errorCorrectionLevel:
          qr.errorCorrectionLevel as QRCode.QRCodeErrorCorrectionLevel,
        margin: qr.quietZoneModules,
        color: { dark: "#040e31", light: "#ffffff" },
      }).then((value) => {
        if (active) setSvg(value);
      });
    return () => {
      active = false;
    };
  }, [ready]);
  return (
    <div data-safe className="qr-section" data-qr-url={ready ? qr.url : ""}>
      {ready && svg ? (
        <div
          className="qr-art"
          role="img"
          aria-label={`QR: ${qr.url}`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="qr-placeholder">
          <strong>QR</strong>
          <span>Очаква потвърден адрес</span>
          <small>ПРОБА · НЕ ЗА ПЕЧАТ</small>
        </div>
      )}
    </div>
  );
}
export function ChallengeSteps() {
  return (
    <ol data-safe className="steps">
      {content.front.steps.map((step, i) => (
        <li key={step}>
          <span>{i + 1}</span>
          {step}
        </li>
      ))}
    </ol>
  );
}
export function RewardSection() {
  const highlight = "безплатен ИИ одит";
  const [before, after] = content.front.rewardBody.split(highlight);
  return (
    <section data-safe className="reward">
      <div>
        <strong>{content.front.rewardTitle}</strong>
        <b>{content.front.rewardNoun}</b>
      </div>
      <p>{before}<strong className="reward-highlight">{highlight}</strong>{after}</p>
    </section>
  );
}
export function ContactFooter() {
  return (
    <footer className="contact-footer">
      <div data-safe>
        <span>{content.website}</span>
      </div>
    </footer>
  );
}
const dimensions = {
  "--full-width": `${full.width}mm`,
  "--full-height": `${full.height}mm`,
  "--bleed": `${print.bleed}mm`,
  "--trim-width": `${print.trim.width}mm`,
  "--trim-height": `${print.trim.height}mm`,
  "--safe": `${print.safe}mm`,
} as CSSProperties;
export function FrontCard() {
  const [before, after] = content.front.heading.split("проблем");
  return (
    <>
      <div className="front-hero" />
      <div className="front-content safe-content">
        <BrandHeader dark />
        <p data-safe className="challenge-label" aria-hidden={!content.front.header}>
          {content.front.header}
        </p>
        <h1 data-safe>
          {before}
          <span className="headline-emphasis">проблем</span>
          {after}
        </h1>
        {content.front.support && (
          <p data-safe className="support">
            {content.front.support}
          </p>
        )}
      </div>
      <div className="workbench">
        <div className="participation">
          <QRSection />
          <ChallengeSteps />
        </div>
        <RewardSection />
        <ContactFooter />
      </div>
    </>
  );
}
export function BackCard() {
  const [before, after] = content.back.heading.split("процес");
  return (
    <div className="composed-back">
      <header className="back-hero">
        <div className="safe-content">
          <BrandHeader dark />
          <h1 data-safe>
            {before}<span className="back-title-accent">процес</span>{" "}
            {after.trim().split(" ").map((word, i) => (
              <span key={i} className={word.startsWith("оптимизира") ? "back-title-accent" : undefined}>
                {i > 0 ? " " : ""}{word}
              </span>
            ))}
          </h1>
          {content.back.instruction && (
            <p data-safe className="instruction">{content.back.instruction}</p>
          )}
        </div>
      </header>
      <section className="back-workbench">
        <ol className="assessment">
          {content.back.questions.map((question, i) => (
            <li key={question}>
              <span data-safe className="question-checkbox" aria-hidden="true" />
              <span className="question-divider" aria-hidden="true" />
              <span data-safe className="question-text">{question}</span>
              <span className="visually-hidden">Въпрос {i + 1}</span>
            </li>
          ))}
        </ol>
        <div className="back-summary">
          <p data-safe className="interpretation">
            <strong>{content.back.interpretation.split(" може ")[0]}</strong>{" може "}
            {content.back.interpretation.split(" може ")[1]}
          </p>
        </div>
        <section className="cta">
          <h2 data-safe>{content.back.ctaHeading}</h2>
          <p data-safe>{content.back.ctaBody}</p>
        </section>
        <footer className="back-footer">
          <span data-safe className="back-website">{content.website}</span>
          <span data-safe className="back-email">{content.back.email}</span>
          <span data-safe className="back-phone">{content.back.phone}</span>
        </footer>
      </section>
    </div>
  );
}
export function Card({
  side,
  guides = false,
  proofId,
}: {
  side: Side;
  guides?: boolean;
  proofId?: number;
}) {
  return (
    <article
      lang="bg"
      className={`card card-${side}`}
      style={{
        ...dimensions,
        "--safe": "4mm",
        "--back-contact-drop": `${4 - artwork.backContactBottomSafeMm}mm`,
      } as CSSProperties}
      data-side={side}
    >
      {side === "front" ? <FrontCard /> : <BackCard />}
      {proofId && (
        <div className="proof-slot">
          {side === "front" ? "F" : "B"}
          {proofId} ↑
        </div>
      )}
      {guides && (
        <div className="guides" aria-hidden="true">
          <div className="trim-guide" />
          <div className="safe-guide" />
        </div>
      )}
    </article>
  );
}
export function Sheet({
  side,
  guides = false,
  proof = false,
}: {
  side: Side;
  guides?: boolean;
  proof?: boolean;
}) {
  const placements = slots(side);
  return (
    <div
      className="sheet"
      style={{
        width: `${print.paper.width}mm`,
        height: `${print.paper.height}mm`,
      }}
    >
      {placements.map((slot) => (
        <div
          key={slot.id}
          className="sheet-slot"
          style={{
            left: `${slot.x}mm`,
            top: `${slot.y}mm`,
            transform: `rotate(${slot.rotation}deg)`,
          }}
        >
          <Card
            side={side}
            guides={guides}
            proofId={proof ? slot.id : undefined}
          />
        </div>
      ))}
      <svg
        className="sheet-marks"
        viewBox={`0 0 ${print.paper.width} ${print.paper.height}`}
        aria-hidden="true"
      >
        {placements.flatMap((slot) =>
          cropSegments(slot).map((line, i) => (
            <line
              key={`${slot.id}-${i}`}
              x1={line[0]}
              y1={line[1]}
              x2={line[2]}
              y2={line[3]}
              stroke="#040e31"
              strokeWidth={print.crop.lineWidthPt / (72 / 25.4)}
            />
          )),
        )}
      </svg>
    </div>
  );
}
