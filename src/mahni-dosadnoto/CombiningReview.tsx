import type { PublicReviewCard } from "@/mahni-dosadnoto/review";

export function AudienceReviewCard({ card, notice }: { card: PublicReviewCard; notice?: string }) {
  return (
    <section className="md-audience" aria-label="Преглед от залата">
      <p className="md-audience-kicker">ИИ ни помага да намерим общото между идеите. После проверяваме заедно дали сме ги подредили правилно.</p>
      {notice ? <p className="md-audience-notice">{notice}</p> : null}
      <p className="md-audience-map">{card.mapping}</p>
      <h2>{card.title}</h2>
      <p>{card.description}</p>
      <p className="md-audience-count">
        {card.ideaCount} {card.ideaCount === 1 ? "предложение" : "предложения"}
        {card.organizationCount > 0 ? ` · ${card.organizationCount} ${card.organizationCount === 1 ? "организация" : "организации"}` : ""}
      </p>
      {card.excerpts.length > 0 ? (
        <ul>
          {card.excerpts.map((excerpt) => (
            <li key={excerpt}>{excerpt}</li>
          ))}
        </ul>
      ) : null}
      <p className="md-audience-question">{card.question}</p>
    </section>
  );
}
