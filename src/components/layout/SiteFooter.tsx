"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { homeHashHref, isHomePath, primaryNavHref } from "@/lib/home-nav";
import { contactPhones, footerNav, showSecondaryContactPhone, site } from "@/content/site";
import { t } from "@/content/messages";
import { ContactEmailLink } from "@/components/contact/ContactEmailLink";
import { Container } from "./Container";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { scrollToHomeHash } from "./useHomeSectionSpy";

function PhoneLink({ phone }: { phone: string }) {
  return (
    <a
      href={`tel:${phone.replace(/\s+/g, "")}`}
      className="text-on-dark-muted transition-colors duration-150 hover:text-on-dark hover:underline hover:decoration-amber hover:underline-offset-[4px]"
    >
      {phone}
    </a>
  );
}

export function SiteFooter({ locale }: { locale: Locale }) {
  const m = t(locale);
  const pathname = usePathname() ?? "";
  const onHome = isHomePath(pathname);
  const year = new Date().getFullYear();
  const copyright = `© ${year} ${site.name[locale]}`;

  return (
    <footer className="w-full min-w-0 bg-marine text-on-dark" data-surface="dark">
      <Container className="py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Logo locale={locale} tone="on-dark" layout="full" />
            <p className="mt-6 max-w-sm text-small text-on-dark-muted">{site.descriptor[locale]}</p>
          </div>

          <nav aria-label={m.footerNav} className="md:col-span-3">
            <ul className="grid gap-2.5 text-small">
              {footerNav.map((item) => {
                const hashHref = homeHashHref(locale, item.key);
                const to = primaryNavHref(locale, item.key);
                return (
                <li key={item.key}>
                  <Link
                    href={to}
                    scroll={!hashHref}
                    onClick={(e) => {
                      if (onHome && hashHref && scrollToHomeHash(hashHref)) e.preventDefault();
                    }}
                    className="text-on-dark-muted transition-colors duration-150 hover:text-on-dark hover:underline hover:decoration-amber hover:underline-offset-[4px]"
                  >
                    {item.label[locale]}
                  </Link>
                </li>
                );
              })}
            </ul>
          </nav>

          <div className="md:col-span-4">
            <p className="label-dark">{m.language}</p>
            <LanguageSwitcher current={locale} tone="on-dark" label={m.languageFooter} className="mt-2" />
            <p className="mt-8 max-w-sm text-small text-on-dark-muted">
              {site.contactNote[locale]}
              <br />
              <ContactEmailLink tone="on-dark" />
              <br />
              <PhoneLink phone={contactPhones[0]} />
              {showSecondaryContactPhone ? (
                <>
                  <br />
                  <PhoneLink phone={contactPhones[1]} />
                </>
              ) : null}
            </p>
          </div>
        </div>

        <p className="mt-10 border-t border-on-dark/10 pt-6 font-sans text-[0.75rem] text-on-dark-muted">{copyright}</p>
      </Container>
    </footer>
  );
}
