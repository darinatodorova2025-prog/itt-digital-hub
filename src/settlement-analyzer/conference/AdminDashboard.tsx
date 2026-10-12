'use client'

import { useMemo, useState } from 'react'
import { BarChart3, Building2, CalendarClock, CheckCircle2, ChevronRight, Filter, MapPinned, Repeat2, Search, UserCheck, UsersRound, X } from 'lucide-react'
import type { AdminLead, SurveySummary } from '../server/admin-data'

type Props = {
  adminName: string
  privacyReady: boolean
  leads: AdminLead[]
  kpis: {
    visits: number; registrations: number; registrationConversion: number; usersWithAnalysis: number; analyses: number
    returnVisitors: number; completedProfiles: number; highPotential: number; contactRequests: number
  }
  funnel: Array<{ label: string; value: number }>
  survey: SurveySummary
}

export function AdminDashboard({ adminName, privacyReady, leads, kpis, funnel, survey }: Props) {
  const [query, setQuery] = useState('')
  const [company, setCompany] = useState('')
  const [type, setType] = useState('')
  const [timeline, setTimeline] = useState('')
  const [status, setStatus] = useState('')
  const [contactRequested, setContactRequested] = useState('')
  const [campaign, setCampaign] = useState('')
  const [sort, setSort] = useState('lastSeen')
  const [selected, setSelected] = useState<AdminLead | null>(null)
  const unique = (key: keyof AdminLead) => [...new Set(leads.map((lead) => String(lead[key] ?? '')).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'bg'))
  const filtered = useMemo(() => {
    const normalized = query.toLocaleLowerCase('bg-BG').trim()
    const rows = leads.filter((lead) => {
      const matchesQuery = !normalized || [lead.fullName, lead.email, lead.companyName].some((value) => value.toLocaleLowerCase('bg-BG').includes(normalized))
      return matchesQuery && (!company || lead.companyName === company) && (!type || lead.organizationType === type)
        && (!timeline || lead.projectTimeline === timeline) && (!status || lead.status === status)
        && (!campaign || lead.utmCampaign === campaign)
        && (!contactRequested || (contactRequested === 'yes') === Boolean(lead.contactInterest && lead.contactInterest !== 'Засега не'))
    })
    return [...rows].sort((a, b) => {
      if (sort === 'score') return b.score - a.score
      if (sort === 'analyses') return b.analysisCount - a.analysisCount
      if (sort === 'name') return a.fullName.localeCompare(b.fullName, 'bg')
      return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
    })
  }, [campaign, company, contactRequested, leads, query, sort, status, timeline, type])

  return (
    <main className="admin-page">
      <div className="page-topbar"><span>← Анализатор</span><strong>Анализ и квалификация</strong><span className="admin-identity">Администратор: {adminName}</span></div>
      <div className="admin-content">
        <header className="admin-heading"><div><p className="eyebrow">Преглед</p><h1>Контакти и използване на анализатора</h1><p>Бизнес фуния, квалификация и сигнали за последващ контакт.</p></div><span className="live-badge">● Актуални данни</span></header>
        {!privacyReady && <div className="admin-config-warning"><strong>Необходима настройка преди публично събитие</strong><span>Добавете име на администратора на данните и имейл за заявки за поверителност в настройките на Sites.</span></div>}
        <section className="admin-kpis" aria-label="Ключови показатели">
          <Kpi icon={<BarChart3 />} label="Посещения" value={kpis.visits} />
          <Kpi icon={<UserCheck />} label="Регистрации" value={kpis.registrations} detail={`${formatPercent(kpis.registrationConversion)} конверсия`} />
          <Kpi icon={<MapPinned />} label="Потребители с анализ" value={kpis.usersWithAnalysis} />
          <Kpi icon={<Building2 />} label="Общо анализи" value={kpis.analyses} />
          <Kpi icon={<Repeat2 />} label="Повторни посещения" value={kpis.returnVisitors} />
          <Kpi icon={<CheckCircle2 />} label="Попълнени профили" value={kpis.completedProfiles} />
          <Kpi icon={<UsersRound />} label="Висок потенциал" value={kpis.highPotential} />
          <Kpi icon={<CalendarClock />} label="Заявки за контакт" value={kpis.contactRequests} />
        </section>

        <section className="admin-card funnel-card"><div className="admin-section-title"><div><h2>Фуния</h2><p>Преминаване между ключовите стъпки.</p></div></div><div className="funnel-list">{funnel.map((item, index) => { const previous = index === 0 ? item.value : funnel[index - 1]?.value ?? 0; const conversion = previous ? item.value / previous * 100 : 0; const max = Math.max(1, funnel[0]?.value ?? 1); return <div className="funnel-row" key={item.label}><span>{item.label}</span><div className="funnel-bar"><i style={{ width: `${Math.max(3, item.value / max * 100)}%` }} /></div><strong>{item.value}</strong><em>{index === 0 ? '100%' : formatPercent(conversion)}</em></div> })}</div></section>

        <SurveySection survey={survey} />

        <section className="admin-card leads-card">
          <div className="admin-section-title"><div><h2>Потенциални клиенти</h2><p>{filtered.length} от {leads.length} контакта</p></div></div>
          <div className="lead-toolbar">
            <label className="admin-search"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Търсене по име, имейл или организация" /></label>
            <label><Filter /><select value={company} onChange={(e) => setCompany(e.target.value)}><option value="">Всички организации</option>{unique('companyName').map((value) => <option key={value}>{value}</option>)}</select></label>
            <label><select value={type} onChange={(e) => setType(e.target.value)}><option value="">Всички типове</option>{unique('organizationType').map((value) => <option key={value}>{value}</option>)}</select></label>
            <label><select value={timeline} onChange={(e) => setTimeline(e.target.value)}><option value="">Всеки проектен хоризонт</option>{unique('projectTimeline').map((value) => <option key={value}>{value}</option>)}</select></label>
            <label><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Всеки статус на контакт</option>{['Студен', 'Потенциален', 'Висок потенциал'].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label><select value={contactRequested} onChange={(e) => setContactRequested(e.target.value)}><option value="">Всички интереси</option><option value="yes">Заявили контакт</option><option value="no">Без заявка</option></select></label>
            <label><select value={campaign} onChange={(e) => setCampaign(e.target.value)}><option value="">Всички кампании</option>{unique('utmCampaign').map((value) => <option key={value}>{value}</option>)}</select></label>
            <label><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="lastSeen">Последно посещение</option><option value="score">Най-висока оценка</option><option value="analyses">Най-много анализи</option><option value="name">Име</option></select></label>
          </div>
          <div className="admin-table-wrap"><table className="leads-table"><thead><tr><th>Име</th><th>Организация</th><th>Роля</th><th>Последно посещение</th><th>Анализи</th><th>Оценка</th><th>Статус</th><th /></tr></thead><tbody>{filtered.map((lead) => <tr key={lead.id} onClick={() => setSelected(lead)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') setSelected(lead) }}><td><strong>{lead.fullName}</strong><small>{lead.email}</small></td><td>{lead.companyName}</td><td>{lead.organizationType}</td><td>{formatDate(lead.lastSeenAt)}</td><td>{lead.analysisCount}</td><td><strong>{lead.score}</strong></td><td><span className={`lead-status lead-status--${statusClass(lead.status)}`}>{lead.status}</span></td><td><ChevronRight /></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="admin-empty">Няма контакти, които отговарят на избраните филтри.</div>}</div>
        </section>
      </div>
      {selected && <LeadDrawer lead={selected} onClose={() => setSelected(null)} />}
    </main>
  )
}

function SurveySection({ survey }: { survey: SurveySummary }) {
  const profileLabel = survey.completed === 1 ? "1 попълнен профил" : `${survey.completed} попълнени профила`
  return (
    <section className="admin-card survey-card">
      <div className="admin-section-title">
        <div>
          <h2>Отговори от анкетата</h2>
          <p>{survey.completed === 0 ? "Само от завършени анкети." : `${profileLabel}. Един човек може да избере повече от един отговор.`}</p>
        </div>
      </div>
      {survey.completed === 0 ? <div className="admin-empty">Още няма попълнена анкета.</div> : (
        <>
          <div className="survey-groups">
            {survey.groups.map((item) => (
              <div className="survey-group" key={item.title}>
                <h3>{item.title}</h3>
                <div className="survey-choices">
                  {item.choices.map((choice) => {
                    const share = choice.count / survey.completed * 100
                    return (
                      <div className="survey-choice" key={choice.label}>
                        <span>{choice.label}</span>
                        <div className="funnel-bar"><i style={{ width: choice.count ? `${Math.max(3, share)}%` : "0%" }} /></div>
                        <strong>{choice.count}</strong>
                        <em>{formatPercent(share)}</em>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          {survey.notes.length > 0 && (
            <div className="survey-notes">
              <h3>Свободен текст</h3>
              {survey.notes.map((note) => (
                <article className="survey-note" key={`${note.question}-${note.at}-${note.text}`}>
                  <small>{note.at ? `${note.question} · ${formatDate(note.at)}` : note.question}</small>
                  <p>{note.text}</p>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

function Kpi({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail?: string }) { return <article className="admin-kpi"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong>{detail && <em>{detail}</em>}</div></article> }

function LeadDrawer({ lead, onClose }: { lead: AdminLead; onClose: () => void }) {
  return <div className="lead-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><aside className="lead-drawer" aria-label={`Детайли за ${lead.fullName}`}><header><div><span className={`lead-status lead-status--${statusClass(lead.status)}`}>{lead.status}</span><h2>{lead.fullName}</h2><p>{lead.companyName}</p></div><button aria-label="Затвори детайлите" onClick={onClose}><X /></button></header><div className="lead-detail-scroll"><DetailSection title="Контакт"><Detail label="Имейл" value={lead.email} /><Detail label="Телефон" value={lead.phone || 'Не е посочен'} /><Detail label="Длъжност" value={lead.jobRole || 'Не е посочена'} /></DetailSection><DetailSection title="Организация"><Detail label="Име" value={lead.companyName} /><Detail label="Роля" value={lead.organizationType} /><Detail label="Честота" value={lead.employeeRange || 'Не е посочена'} /><Detail label="Сайт" value={lead.website || 'Не е посочен'} /></DetailSection><DetailSection title="Профил"><Tags label="Възможни употреби" values={lead.useCases} /><Tags label="Дейности, които отнемат време" values={lead.painPoints} /><Detail label="Тема за разговор" value={lead.projectTimeline || 'Не е попълнена'} /><Detail label="Интерес към разговор" value={lead.contactInterest || 'Не е попълнен'} /></DetailSection><DetailSection title="Поведение"><Detail label="Регистрация" value={formatDate(lead.createdAt)} /><Detail label="Последно посещение" value={formatDate(lead.lastSeenAt)} /><Detail label="Посещения" value={String(lead.sessionCount)} /><Detail label="Анализи" value={String(lead.analysisCount)} /><Tags label="Анализирани населени места" values={lead.settlements} /><Detail label="Профил" value={lead.profileCompleted ? 'Попълнен' : 'Непопълнен'} /></DetailSection><DetailSection title="Източник на посещението"><Detail label="Източник" value={lead.source} /><Detail label="Кампания" value={lead.utmCampaign || 'Няма'} /><Detail label="Съдържание" value={lead.utmContent || 'Няма'} /></DetailSection><DetailSection title="Оценка на потенциала"><div className="score-summary"><strong>{lead.score}/100</strong><span>{lead.status}</span></div>{lead.scoreBreakdown.length ? <ul className="score-breakdown">{lead.scoreBreakdown.map((item) => <li key={item.label}><span>{item.label}</span><strong>+{item.points}</strong></li>)}</ul> : <p className="detail-empty">Все още няма квалифициращи сигнали.</p>}</DetailSection></div></aside></div>
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="lead-detail-section"><h3>{title}</h3>{children}</section> }
function Detail({ label, value }: { label: string; value: string }) { return <div className="lead-detail-row"><span>{label}</span><strong>{value}</strong></div> }
function Tags({ label, values }: { label: string; values: string[] }) { return <div className="lead-tags"><span>{label}</span><div>{values.length ? values.map((value) => <em key={value}>{value}</em>) : <small>Няма данни</small>}</div></div> }
function formatDate(value: string) { return new Intl.DateTimeFormat('bg-BG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Sofia' }).format(new Date(value)) }
function formatPercent(value: number) { return `${new Intl.NumberFormat('bg-BG', { maximumFractionDigits: 1 }).format(value)}%` }
function statusClass(value: string) { return value === 'Висок потенциал' ? 'high' : value === 'Потенциален' ? 'medium' : 'cold' }
