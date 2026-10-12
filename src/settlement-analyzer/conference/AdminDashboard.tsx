'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronRight, Search, X } from 'lucide-react'
import type { Locale } from '@/lib/i18n'
import { SOFIA_TIME_ZONE } from '../beta/config'
import { adminCopy, type AdminCopy } from './admin-copy'
import type { AdminLead, AdminPeriod, AdminSnapshot, FunnelStep, SurveySummary } from '../server/admin-metrics'

const UNATTRIBUTED_CAMPAIGN = '__unattributed__'

type Props = {
  locale: Locale
  analyzerHref: string
  adminName: string
  privacyReady: boolean
  data: AdminSnapshot
}

const PERIODS: AdminPeriod[] = ['7d', '30d', 'all']
const TABS = ['feedback', 'contacts', 'activity'] as const
type TabId = (typeof TABS)[number]

export function AdminDashboard({ locale, analyzerHref, adminName, privacyReady, data }: Props) {
  const copy = adminCopy(locale)
  const router = useRouter()
  const pathname = usePathname()
  const [tab, setTab] = useState<TabId>('feedback')

  const navigate = (next: { period?: AdminPeriod; campaign?: string }) => {
    const params = new URLSearchParams()
    const period = next.period ?? data.period
    const campaign = next.campaign ?? data.campaign
    if (period !== '30d') params.set('range', period)
    if (campaign) params.set('campaign', campaign)
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  return (
    <main className="admin-page">
      <div className="page-topbar">
        <a href={analyzerHref}>← {copy.back}</a>
        <strong>{copy.admin}: {adminName}</strong>
      </div>
      <div className="admin-content">
        <header className="admin-heading">
          <div>
            <h1>{copy.title}</h1>
            <p>{copy.subtitle}</p>
          </div>
          <div className="admin-controls">
            <div className="admin-segment" role="group" aria-label={copy.periodLabel}>
              {PERIODS.map((period) => (
                <button key={period} type="button" aria-pressed={data.period === period} onClick={() => navigate({ period })}>
                  {copy.periods[period]}
                </button>
              ))}
            </div>
            {data.campaigns.length > 0 && (
              <label className="admin-select">
                <span>{copy.campaignLabel}</span>
                <select value={data.campaign} onChange={(event) => navigate({ campaign: event.target.value })}>
                  <option value="">{copy.allCampaigns}</option>
                  {data.campaigns.map((campaign) => <option key={campaign} value={campaign}>{campaign}</option>)}
                  {data.hasUnattributed && <option value={UNATTRIBUTED_CAMPAIGN}>{copy.unattributed}</option>}
                </select>
              </label>
            )}
            <button className="admin-refresh" type="button" onClick={() => router.refresh()}>{copy.refresh}</button>
            <p className="admin-freshness">
              {data.latestEventAt ? `${copy.freshness} ${formatDate(data.latestEventAt, locale)}` : copy.noEvents}
              {' · '}
              {copy.loaded} {formatDate(data.generatedAt, locale)}
            </p>
          </div>
        </header>

        {!privacyReady && (
          <div className="admin-config-warning">
            <strong>{copy.privacyTitle}</strong>
            <span>{copy.privacyBody}</span>
          </div>
        )}
        {data.truncated && <p className="admin-note">{copy.truncated}</p>}

        <section className="admin-kpis" aria-label={copy.periodLabel}>
          <Kpi label={copy.kpis.sessions.title} value={data.kpis.sessions.value} detail={copy.kpis.sessions.detail} hint={copy.kpis.sessions.hint} previous={data.kpis.sessions.previous} copy={copy} locale={locale} />
          <Kpi label={copy.kpis.analyzedUsers.title} value={data.kpis.analyzedUsers.value} detail={copy.kpis.analyzedUsers.detail} hint={copy.kpis.analyzedUsers.hint} previous={data.kpis.analyzedUsers.previous} copy={copy} locale={locale} />
          <Kpi label={copy.kpis.analyses.title} value={data.kpis.analyses.value} detail={copy.kpis.analyses.detail} hint={copy.kpis.analyses.hint} previous={data.kpis.analyses.previous} copy={copy} locale={locale} />
          <Kpi label={copy.kpis.contacts.title} value={data.kpis.contacts.value} detail={copy.kpis.contacts.detail} hint={copy.kpis.contacts.hint} previous={data.kpis.contacts.previous} copy={copy} locale={locale} />
        </section>

        <section className="admin-funnels" aria-label={copy.funnels.engagement}>
          <MiniFunnel title={copy.funnels.engagement} steps={data.funnels.engagement} copy={copy} locale={locale} />
          <MiniFunnel title={copy.funnels.survey} steps={data.funnels.survey} copy={copy} locale={locale} />
          <MiniFunnel title={copy.funnels.commercial} steps={data.funnels.commercial} copy={copy} locale={locale} />
        </section>
        <p className="admin-method">{copy.method}</p>

        <div className="admin-summaries">
          <FeedbackSummary data={data} copy={copy} locale={locale} />
          <BusinessSummary data={data} copy={copy} />
        </div>

        <div className="admin-tabs-wrap">
          <div className="admin-tabs" role="tablist" aria-label={copy.tabsLabel}>
            {TABS.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`admin-tab-${id}`}
                aria-selected={tab === id}
                aria-controls={`admin-panel-${id}`}
                tabIndex={tab === id ? 0 : -1}
                onClick={() => setTab(id)}
                onKeyDown={(event) => {
                  const index = TABS.indexOf(id)
                  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                    event.preventDefault()
                    const next = TABS[(index + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length] ?? id
                    setTab(next)
                    document.getElementById(`admin-tab-${next}`)?.focus()
                  }
                }}
              >
                {copy.tabs[id]}
              </button>
            ))}
          </div>
          <div className="admin-tabpanel" role="tabpanel" id={`admin-panel-${tab}`} aria-labelledby={`admin-tab-${tab}`}>
            {tab === 'feedback' && <FeedbackTab survey={data.survey} records={data.surveyRecords} copy={copy} locale={locale} />}
            {tab === 'contacts' && <ContactsTab leads={data.leads} copy={copy} locale={locale} />}
            {tab === 'activity' && <ActivityTab data={data} copy={copy} locale={locale} />}
          </div>
        </div>
      </div>
    </main>
  )
}

function Kpi({ label, value, detail, hint, previous, copy, locale }: { label: string; value: number; detail: string; hint: string; previous: number | null; copy: AdminCopy; locale: Locale }) {
  return (
    <article className="admin-kpi">
      <div className="admin-kpi-label">
        <small>{label}</small>
        <Hint text={hint} />
      </div>
      <strong>{formatNumber(value, locale)}</strong>
      <em>{detail}</em>
      {previous != null && <span className="admin-previous">{copy.previous}: {formatNumber(previous, locale)}</span>}
    </article>
  )
}

function MiniFunnel({ title, steps, copy, locale }: { title: string; steps: FunnelStep[]; copy: AdminCopy; locale: Locale }) {
  const base = Math.max(steps[0]?.count ?? 0, 1)
  return (
    <section className="mini-funnel">
      <h2>{title}</h2>
      <ol className="mini-steps">
        {steps.map((step) => {
          const hint = copy.hints[step.id as keyof AdminCopy['hints']]
          const ratioText = step.ratio
            ? step.ratio.percent == null
              ? `${hint} ${copy.noRateDetail}`
              : `${hint} ${formatNumber(step.ratio.numerator, locale)} / ${formatNumber(step.ratio.denominator, locale)}.`
            : hint
          return (
            <li key={step.id}>
              <span className="mini-label">
                {copy.steps[step.id as keyof AdminCopy['steps']]}
                <Hint text={ratioText} />
              </span>
              <strong>
                {formatNumber(step.count, locale)}
                {step.ratio ? <em>{step.ratio.percent == null ? copy.noRate : formatPercent(step.ratio.percent, locale)}</em> : null}
              </strong>
              <i style={{ width: `${Math.min(100, (step.count / base) * 100)}%` }} />
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function Hint({ text }: { text: string }) {
  return (
    <button type="button" className="admin-hint admin-hint--mark" aria-label={text}>
      i
      <span role="tooltip">{text}</span>
    </button>
  )
}

function FeedbackSummary({ data, copy, locale }: { data: AdminSnapshot; copy: AdminCopy; locale: Locale }) {
  const feedback = data.feedback
  return (
    <section className="admin-card admin-summary">
      <h2>{copy.feedbackTitle}</h2>
      {feedback.completed === 0 ? <p className="admin-empty">{copy.feedbackEmpty}</p> : feedback.single ? (
        <div className="summary-prose">
          <p><strong>n = {formatNumber(feedback.completed, locale)}.</strong> {copy.usefulness}: {feedback.single.usefulness ?? copy.noScore}{feedback.single.usefulness != null ? '/5' : ''}.</p>
          <p>{copy.topUse}: {feedback.single.useCase ?? copy.noneYet}.</p>
          <p>{copy.topPain}: {feedback.single.pain ?? copy.noneYet}.</p>
          <p>{copy.topNeed}: {feedback.single.capability ?? copy.noneYet}.</p>
          {feedback.single.interest && <p>{feedback.single.interest}.</p>}
        </div>
      ) : (
        <dl className="summary-list">
          <div><dt>{copy.completedSurveys}</dt><dd>{formatNumber(feedback.completed, locale)} <small>n = {formatNumber(feedback.withAnswers, locale)}</small></dd></div>
          <div><dt>{copy.averageUsefulness}</dt><dd>{feedback.averageUsefulness == null ? copy.noScore : `${formatNumber(feedback.averageUsefulness, locale)} / 5`} <small>n = {formatNumber(feedback.usefulnessCount, locale)}</small></dd></div>
          <div><dt>{copy.topUse}</dt><dd>{rank(feedback.topUseCase, copy, locale)}</dd></div>
          <div><dt>{copy.topPain}</dt><dd>{rank(feedback.topPain, copy, locale)}</dd></div>
          <div><dt>{copy.topNeed}</dt><dd>{rank(feedback.topCapability, copy, locale)}</dd></div>
          {feedback.withAnswers < feedback.completed && <div><dt>{copy.answersMissing}</dt><dd>{formatNumber(feedback.completed - feedback.withAnswers, locale)}</dd></div>}
        </dl>
      )}
    </section>
  )
}

function BusinessSummary({ data, copy }: { data: AdminSnapshot; copy: AdminCopy }) {
  const business = data.business
  const empty = business.contacts === 0 && business.anonymousInterest === 0
  return (
    <section className="admin-card admin-summary">
      <h2>{copy.businessTitle}</h2>
      {empty ? <p className="admin-empty">{copy.businessEmpty}</p> : (
        <>
          <dl className="summary-list">
            <div><dt>{copy.kpis.contacts.title}</dt><dd>{business.contacts}</dd></div>
            <div><dt>{copy.identifiable}</dt><dd>{business.identifiable}</dd></div>
            <div><dt>{copy.anonymous}</dt><dd>{business.anonymousInterest}</dd></div>
            <div><dt>{copy.meetings}</dt><dd>{business.meetings}</dd></div>
            <div><dt>{copy.information}</dt><dd>{business.informationRequests}</dd></div>
            <div><dt>{copy.qualification}</dt><dd>{copy.statuses.high} {business.statuses.high} · {copy.statuses.medium} {business.statuses.medium} · {copy.statuses.cold} {business.statuses.cold}</dd></div>
          </dl>
          <p className="summary-note">{copy.qualificationNote}</p>
        </>
      )}
    </section>
  )
}

function FeedbackTab({ survey, records, copy, locale }: { survey: SurveySummary; records: AdminSnapshot['surveyRecords']; copy: AdminCopy; locale: Locale }) {
  const [openId, setOpenId] = useState<string | null>(null)
  if (survey.completed === 0) return <p className="admin-empty">{copy.noSurveys}</p>
  return (
    <div className="feedback-tab">
      <p className="admin-method">
        {copy.surveyLead}
        {survey.versions.length > 0 && <> {copy.versions}: {survey.versions.join(', ')}.</>}
        {' '}n = {formatNumber(survey.completed, locale)}.
      </p>
      <div className="survey-questions">
        {survey.groups.map((group) => {
          const preview = [...group.choices].sort((a, b) => b.count - a.count)[0]
          return (
          <details key={group.title} className="survey-question">
            <summary>
              {group.title}
              {preview && preview.count > 0 ? <span>{preview.label}</span> : null}
            </summary>
            {group.hint && <p className="survey-hint">{group.hint}</p>}
            {survey.completed === 1 ? (
              <p className="summary-prose">{copy.chosen}: {group.choices.filter((choice) => choice.count > 0).map((choice) => choice.label).join(', ') || group.notes.map((note) => note.text).join(', ') || copy.noneYet}</p>
            ) : (
              <div className="survey-choices">
                {group.choices.map((choice) => {
                  const share = survey.completed ? (choice.count / survey.completed) * 100 : 0
                  return (
                    <div className="survey-choice" key={choice.label}>
                      <span>{choice.label}</span>
                      <div className="funnel-bar"><i style={{ width: choice.count ? `${Math.max(2, Math.min(100, share))}%` : '0%' }} /></div>
                      <strong>{choice.count}{survey.completed > 1 ? ` · ${formatPercent(share, locale)}` : ''}</strong>
                    </div>
                  )
                })}
              </div>
            )}
            {group.notes.length > 0 && (
              <div className="survey-notes">
                {group.notes.map((note) => (
                  <article className="survey-note" key={`${note.at}-${note.text}`}>
                    {note.at ? <small>{formatDate(note.at, locale)}</small> : null}
                    <p>{note.text}</p>
                  </article>
                ))}
              </div>
            )}
          </details>
          )
        })}
      </div>
      {records.length > 0 && (
        <div className="survey-records">
          <h3>{copy.responses}</h3>
          <ul>
            {records.map((record) => {
              const id = `${record.visitorId}-${record.completedAt}`
              const open = openId === id
              return (
                <li key={id}>
                  <button type="button" aria-expanded={open} onClick={() => setOpenId(open ? null : id)}>
                    <span>{record.completedAt ? formatDate(record.completedAt, locale) : copy.missing}</span>
                    <span>{record.usefulness == null ? copy.noScore : `${record.usefulness}/5`}</span>
                    <span>{record.role || record.interest || copy.openResponse}</span>
                  </button>
                  {open && (
                    <dl>
                      <div><dt>{copy.usefulness}</dt><dd>{record.usefulness ?? copy.missing}</dd></div>
                      <div><dt>{copy.fields.interest}</dt><dd>{record.interest || copy.missing}</dd></div>
                      <div><dt>{copy.role}</dt><dd>{record.role || copy.missing}</dd></div>
                      <div><dt>{copy.topUse}</dt><dd>{record.useCases.join(', ') || copy.missing}</dd></div>
                      <div><dt>{copy.topNeed}</dt><dd>{record.capabilities.join(', ') || copy.missing}</dd></div>
                      <div><dt>{copy.topPain}</dt><dd>{record.timeSink || copy.missing}</dd></div>
                      <div><dt>{copy.frequency}</dt><dd>{record.frequency || copy.missing}</dd></div>
                      <div><dt>{copy.stages}</dt><dd>{record.stages.join(', ') || copy.missing}</dd></div>
                      <div><dt>{copy.automation}</dt><dd>{record.automationNeed || copy.missing}</dd></div>
                      {record.notes.length > 0 && <div><dt>{copy.notes}</dt><dd>{record.notes.join(' · ')}</dd></div>}
                    </dl>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function ContactsTab({ leads, copy, locale }: { leads: AdminLead[]; copy: AdminCopy; locale: Locale }) {
  const [query, setQuery] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [topic, setTopic] = useState('')
  const [status, setStatus] = useState('')
  const [contactRequested, setContactRequested] = useState('')
  const [campaign, setCampaign] = useState('')
  const [sort, setSort] = useState('lastSeen')
  const [more, setMore] = useState(false)
  const [selected, setSelected] = useState<AdminLead | null>(null)
  const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, locale === 'bg' ? 'bg' : 'en'))
  const filtered = useMemo(() => {
    const normalized = query.toLocaleLowerCase(locale === 'bg' ? 'bg-BG' : 'en-GB').trim()
    const rows = leads.filter((lead) => {
      const matchesQuery = !normalized || [lead.fullName, lead.email, lead.companyName].some((value) => value.toLocaleLowerCase(locale === 'bg' ? 'bg-BG' : 'en-GB').includes(normalized))
      const wantsContact = lead.interest === 'discuss' || lead.interest === 'info'
      return matchesQuery
        && (!company || lead.companyName === company)
        && (!role || lead.organizationType === role)
        && (!topic || lead.projectTimeline === topic)
        && (!status || lead.status === status)
        && (!campaign || lead.utmCampaign === campaign)
        && (!contactRequested || (contactRequested === 'yes') === wantsContact)
    })
    return [...rows].sort((a, b) => {
      if (sort === 'score') return b.score - a.score
      if (sort === 'analyses') return b.analysisCount - a.analysisCount
      if (sort === 'name') return a.fullName.localeCompare(b.fullName, locale === 'bg' ? 'bg' : 'en')
      return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
    })
  }, [campaign, company, contactRequested, leads, locale, query, role, sort, status, topic])

  if (leads.length === 0) return <p className="admin-empty">{copy.noContacts}</p>

  return (
    <div className="contacts-tab">
      <div className="admin-section-title">
        <p>{copy.contactsLead(filtered.length, leads.length)}</p>
      </div>
      <div className="lead-toolbar lead-toolbar--compact">
        <label className="admin-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} aria-label={copy.search} /></label>
        <label>
          <select value={status} aria-label={copy.columns.status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">{copy.allStatuses}</option>
            {['Студен', 'Потенциален', 'Висок потенциал'].map((value) => <option key={value} value={value}>{copy.statusNames[value]}</option>)}
          </select>
        </label>
        <button type="button" className="admin-refresh" aria-expanded={more} onClick={() => setMore((current) => !current)}>
          {more ? copy.fewerFilters : copy.moreFilters}
        </button>
      </div>
      {more && (
        <div className="lead-toolbar">
          <label><select value={company} aria-label={copy.columns.organisation} onChange={(event) => setCompany(event.target.value)}><option value="">{copy.allOrganisations}</option>{unique(leads.map((lead) => lead.companyName)).map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><select value={role} aria-label={copy.columns.role} onChange={(event) => setRole(event.target.value)}><option value="">{copy.allRoles}</option>{unique(leads.map((lead) => lead.organizationType)).map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><select value={topic} aria-label={copy.fields.topic} onChange={(event) => setTopic(event.target.value)}><option value="">{copy.allTopics}</option>{unique(leads.map((lead) => lead.projectTimeline ?? '')).map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><select value={contactRequested} aria-label={copy.columns.interest} onChange={(event) => setContactRequested(event.target.value)}><option value="">{copy.allInterests}</option><option value="yes">{copy.requested}</option><option value="no">{copy.notRequested}</option></select></label>
          <label><select value={campaign} aria-label={copy.campaignLabel} onChange={(event) => setCampaign(event.target.value)}><option value="">{copy.allCampaigns}</option>{unique(leads.map((lead) => lead.utmCampaign ?? '')).map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><select value={sort} aria-label={copy.sortLast} onChange={(event) => setSort(event.target.value)}><option value="lastSeen">{copy.sortLast}</option><option value="score">{copy.sortScore}</option><option value="analyses">{copy.sortAnalyses}</option><option value="name">{copy.sortName}</option></select></label>
        </div>
      )}
      {filtered.length === 0 ? <p className="admin-empty">{copy.noFilterMatch}</p> : (
        <div className="admin-table-wrap">
          <table className="leads-table">
            <thead>
              <tr>
                <th>{copy.columns.name}</th>
                <th>{copy.columns.organisation}</th>
                <th>{copy.columns.role}</th>
                <th>{copy.columns.activity}</th>
                <th>{copy.columns.analyses}</th>
                <th>{copy.columns.interest}</th>
                <th>{copy.columns.status}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id} onClick={() => setSelected(lead)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(lead) } }}>
                  <td><strong>{lead.fullName || copy.unnamed}</strong>{lead.email && <small>{lead.email}</small>}</td>
                  <td>{lead.companyName || copy.missing}</td>
                  <td>{lead.jobRole || copy.missing}</td>
                  <td>{formatDate(lead.lastSeenAt, locale)}</td>
                  <td>{lead.analysisCount}</td>
                  <td>{lead.interest ? copy.interests[lead.interest] : copy.missing}</td>
                  <td><span className={`lead-status lead-status--${statusClass(lead.status)}`}>{copy.statusNames[lead.status] ?? lead.status}</span></td>
                  <td><ChevronRight aria-hidden="true" /><span className="sr-only">{copy.openLead}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && <LeadDrawer lead={selected} copy={copy} locale={locale} onClose={() => setSelected(null)} />}
    </div>
  )
}

function ActivityTab({ data, copy, locale }: { data: AdminSnapshot; copy: AdminCopy; locale: Locale }) {
  const activity = data.activity
  const maxSettlement = Math.max(1, ...activity.settlements.map((item) => item.count))
  const maxLayer = Math.max(1, ...activity.layers.map((item) => item.count))
  return (
    <div className="activity-tab">
      <dl className="summary-list activity-list">
        <div><dt>{copy.activityItems.repeatVisitors}</dt><dd>{formatNumber(activity.repeatVisitors, locale)}</dd></div>
        <div><dt>{copy.activityItems.repeatRate} <Hint text={copy.repeatHint} /></dt><dd>{activity.repeatVisitorRate.percent == null ? copy.noRate : `${formatPercent(activity.repeatVisitorRate.percent, locale)} (${activity.repeatVisitorRate.numerator}/${activity.repeatVisitorRate.denominator})`}</dd></div>
        <div><dt>{copy.activityItems.repeatAnalyzers}</dt><dd>{formatNumber(activity.repeatAnalyzers, locale)}</dd></div>
        <div><dt>{copy.activityItems.perUser} <Hint text={copy.perUserHint} /></dt><dd>{activity.analysesPerUser == null ? copy.noRate : formatNumber(activity.analysesPerUser, locale)}</dd></div>
        <div><dt>{copy.activityItems.surveyStarted}</dt><dd>{formatNumber(activity.surveyStarted, locale)}</dd></div>
        <div><dt>{copy.activityItems.surveyCompleted}</dt><dd>{formatNumber(activity.surveyCompleted, locale)}</dd></div>
        <div><dt>{copy.activityItems.registrations}</dt><dd>{copy.registrationsUnavailable}</dd></div>
        <div><dt>{copy.activityItems.failures} <Hint text={copy.failureHint} /></dt><dd>{formatNumber(activity.failedAttempts, locale)}{activity.failureShare.percent == null ? '' : ` · ${formatPercent(activity.failureShare.percent, locale)} ${copy.ofFinished}`}</dd></div>
        <div><dt>{copy.activityItems.unfinished}</dt><dd>{formatNumber(activity.unfinishedAttempts, locale)}</dd></div>
      </dl>
      <div className="activity-columns">
        <section>
          <h3>{copy.settlements}</h3>
          {activity.settlements.length === 0 ? <p className="admin-empty">{copy.noSettlements}</p> : activity.settlements.map((item) => (
            <div className="activity-bar" key={item.label}>
              <span>{item.label}</span>
              <div className="funnel-bar"><i style={{ width: `${(item.count / maxSettlement) * 100}%` }} /></div>
              <strong>{item.count}</strong>
            </div>
          ))}
        </section>
        <section>
          <h3>{copy.layers}</h3>
          {activity.layers.length === 0 ? <p className="admin-empty">{copy.noLayers}</p> : activity.layers.map((item) => (
            <div className="activity-bar" key={item.label}>
              <span>{copy.layersNames[item.label] ?? item.label}</span>
              <div className="funnel-bar"><i style={{ width: `${(item.count / maxLayer) * 100}%` }} /></div>
              <strong>{item.count}</strong>
            </div>
          ))}
        </section>
      </div>
      <p className="summary-note">{copy.staffNote}</p>
    </div>
  )
}

function LeadDrawer({ lead, copy, locale, onClose }: { lead: AdminLead; copy: AdminCopy; locale: Locale; onClose: () => void }) {
  const interest = lead.interest ? copy.interests[lead.interest] : copy.missing
  return (
    <div className="lead-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }} onKeyDown={(event) => { if (event.key === 'Escape') onClose() }}>
      <aside className="lead-drawer" role="dialog" aria-modal="true" aria-label={`${copy.detailsFor} ${lead.fullName || copy.unnamed}`}>
        <header>
          <div>
            <span className={`lead-status lead-status--${statusClass(lead.status)}`}>{copy.statusNames[lead.status] ?? lead.status}</span>
            <h2>{lead.fullName || copy.unnamed}</h2>
            <p>{lead.companyName || copy.missing}</p>
          </div>
          <button type="button" aria-label={copy.closeLead} onClick={onClose}><X /></button>
        </header>
        <div className="lead-detail-scroll">
          <DetailSection title={copy.sections.contact}>
            <Detail label={copy.fields.email} value={lead.email || copy.missing} />
            <Detail label={copy.fields.phone} value={lead.phone || copy.missing} />
            <Detail label={copy.fields.role} value={lead.jobRole || copy.missing} />
          </DetailSection>
          <DetailSection title={copy.sections.organisation}>
            <Detail label={copy.columns.organisation} value={lead.companyName || copy.missing} />
            <Detail label={copy.fields.frequency} value={lead.employeeRange || copy.missing} />
          </DetailSection>
          <DetailSection title={copy.sections.profile}>
            <Tags label={copy.fields.uses} values={lead.useCases} empty={copy.fields.none} />
            <Tags label={copy.fields.needs} values={lead.painPoints} empty={copy.fields.none} />
            <Detail label={copy.fields.topic} value={lead.projectTimeline || copy.missing} />
            <Detail label={copy.fields.interest} value={interest} />
          </DetailSection>
          <DetailSection title={copy.sections.behaviour}>
            <Detail label={copy.fields.created} value={formatDate(lead.createdAt, locale)} />
            <Detail label={copy.fields.lastSeen} value={formatDate(lead.lastSeenAt, locale)} />
            <Detail label={copy.fields.sessionsPeriod} value={String(lead.sessionCount)} />
            <Detail label={copy.fields.sessionsAll} value={String(lead.sessionCountAll)} />
            <Detail label={copy.fields.analysesPeriod} value={String(lead.analysisCount)} />
            <Detail label={copy.fields.analysesAll} value={String(lead.analysisCountAll)} />
            <Tags label={copy.fields.settlements} values={lead.settlements} empty={copy.fields.none} />
            <Detail label={copy.fields.profile} value={lead.profileCompleted ? copy.fields.profileDone : copy.fields.profileOpen} />
          </DetailSection>
          <DetailSection title={copy.sections.source}>
            <Detail label={copy.sections.source} value={lead.source || copy.fields.direct} />
            <Detail label={copy.fields.campaign} value={lead.utmCampaign || copy.unattributed} />
            <Detail label={copy.fields.content} value={lead.utmContent || copy.fields.none} />
          </DetailSection>
          <DetailSection title={copy.sections.score}>
            <div className="score-summary"><strong>{lead.score}/100</strong><span>{copy.statusNames[lead.status] ?? lead.status}</span></div>
            {lead.scoreBreakdown.length ? (
              <ul className="score-breakdown">
                {lead.scoreBreakdown.map((item) => <li key={item.label}><span>{copy.scoreLabels[item.label] ?? item.label}</span><strong>+{item.points}</strong></li>)}
              </ul>
            ) : <p className="detail-empty">{copy.fields.noSignals}</p>}
          </DetailSection>
        </div>
      </aside>
    </div>
  )
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="lead-detail-section"><h3>{title}</h3>{children}</section>
}
function Detail({ label, value }: { label: string; value: string }) {
  return <div className="lead-detail-row"><span>{label}</span><strong>{value}</strong></div>
}
function Tags({ label, values, empty }: { label: string; values: string[]; empty: string }) {
  return <div className="lead-tags"><span>{label}</span><div>{values.length ? values.map((value) => <em key={value}>{value}</em>) : <small>{empty}</small>}</div></div>
}

function rank(value: { label: string; count: number } | null, copy: AdminCopy, locale: Locale) {
  if (!value) return copy.noneYet
  return `${value.label} · ${formatNumber(value.count, locale)}`
}

function formatDate(value: string, locale: Locale) {
  const time = Date.parse(value)
  if (Number.isNaN(time)) return '—'
  return new Intl.DateTimeFormat(locale === 'bg' ? 'bg-BG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: SOFIA_TIME_ZONE }).format(new Date(time))
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === 'bg' ? 'bg-BG' : 'en-GB', { maximumFractionDigits: 1 }).format(value)
}

function formatPercent(value: number, locale: Locale) {
  return `${formatNumber(value, locale)}%`
}

function statusClass(value: string) {
  return value === 'Висок потенциал' ? 'high' : value === 'Потенциален' ? 'medium' : 'cold'
}
