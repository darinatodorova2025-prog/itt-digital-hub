import type { ResultCredit } from "./result-credits";

export function ResultCredits({ organizations }: { organizations: ResultCredit[] }) {
  if (organizations.length === 0) return null;
  return (
    <ul className="md-result-orgs">
      {organizations.map((org) => (
        <li key={org.organization}>
          {org.organization}
          {org.people.length > 0 ? (
            <ul>
              {org.people.map((person) => (
                <li key={person}>{person}</li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
