# Tools analytics

Internal guide for the PostHog EU analytics on [ittdigitalhub.org](https://ittdigitalhub.org). The public site does not expose this data.

## Architecture

PostHog EU is the product analytics system: page views, tool events, funnels, retention, and session replay.

| Data | Source of truth | Where it lives |
| --- | --- | --- |
| Visitor, session, tool journey, replay | PostHog project `301034` | EU Cloud, `https://eu.i.posthog.com` |
| Settlement Analyzer Beta limits, surveys, leads, analysis runs | Existing Supabase Beta tables | Unchanged |
| Contact enquiry content | Existing Resend delivery | PostHog stores only that a delivery succeeded |
| ViK and AI Act comparison outcome, latency, tokens | Next.js server event `tool_operation_result` | PostHog |
| Hosted AI Act model call, provider, tokens | Agent Hub event `ai_model_result` | PostHog, after the hub process is restarted with the project token |
| Infrastructure | Existing Vercel Analytics, Cloudflare, Vercel | Not replaced |

One logical AI comparison is one `tool_operation_result`. Control and Expert are properties of that event, not two successes. The hosted assistant records the visitor-visible result in the browser and the model call separately as `ai_model_result`, so the two are not added together.

Analytics never changes a product response. Capture helpers swallow their own errors.

## Applications

| Tool id | Route | Result confirmation |
| --- | --- | --- |
| `tools` | `/[locale]/tools` | Catalogue only |
| `vik-proektant` | `/[locale]/vik-proektant/compare` | Server |
| `ai-act-assistant` | `/[locale]/ai-act/compare` | Server |
| `ai-act-agent` | `/[locale]/ai-act-agent` | Browser for the answer; Agent Hub for the model call |
| `settlement-analyzer` | `/[locale]/settlement-analyzer` | Browser. Beta rules stay in Supabase |
| `pipe-thermal-analysis` | `/[locale]/pipe-thermal-analysis` | Browser |

`vik-designer` remains a hidden catalogue entry. The Agent Hub still emits `ai_model_result` for that agent when the hub runs this code.

## Events

Names are stable. Properties go through `sanitizeProperties` in `src/lib/analytics/privacy.ts`. Unknown keys are dropped. Prompts, answers, emails, passwords, and tokens used as secrets are dropped. `input_tokens` and `output_tokens` are kept.

| Event | When |
| --- | --- |
| `$pageview`, `$pageleave` | Automatic on client-side navigation |
| `tools_catalogue_viewed` | Tools catalogue, once per path |
| `tool_card_seen` | A tool card is at least 45% visible, once per card |
| `tool_card_clicked` | A live tool card is opened |
| `tool_opened` | A tool route, once per path. `from_tool` is set when the previous tool differs |
| `tool_operation_started` | A comparison, analysis, calculation, or hosted question starts |
| `tool_operation_result` | The logical operation finishes |
| `tool_feature_used` | Example, source, score, export, overlay, advanced options, contact from the trial limit |
| `scroll_depth` | 50% and 90% of a page, once each |
| `locale_switched` | BG/EN switch |
| `contact_viewed` | `/work-with-us` |
| `contact_submitted` | Server, only after Resend accepts the enquiry. Status `ok` |
| `sa_search` | Settlement search, at most once every 4 seconds. Query text is not stored |
| `sa_settlement_selected` | A settlement is chosen. Includes EKATTE and name |
| `sa_pack_selected` | A ready-made pack is chosen |
| `sa_layer_changed` | A map layer is toggled by the visitor |
| `sa_mode_changed` | Supply / sewer / stormwater mode |
| `sa_feedback_prompt` | The existing Beta feedback dialog is shown |
| `sa_survey` | `started`, `completed`, `dismissed`, `abandoned`, or `claimed` |
| `sa_trial_limit` | The existing trial-limit dialog is shown |
| `ai_model_result` | One Agent Hub model completion |
| `ai_act_*` | Existing AI Act agent journey events, also sent to Vercel Analytics |

`tool_operation_result.status` is `completed`, `partial`, `failed`, `rate_limited`, `invalid`, `gated`, or `abandoned`. `successful` is true only for `completed` and `partial`. Pipe abandonment is `abandoned`, not a failure.

Question text is classified in the browser or on the Next.js server into `topic_category`. The text itself is not a property. Repeat detection keeps a hash in memory for the page session and sends `is_repeat`, not the question.

## KPI definitions

Production dashboards filter `environment = production`.

- **Visitors:** unique people on `$pageview`.
- **Sessions:** unique sessions on `$pageview`.
- **Tool opening:** `tool_opened`.
- **Started operation:** `tool_operation_started`.
- **Successful operation:** `tool_operation_result` with `successful = true`.
- **Completion rate:** successful results divided by started operations. Compare the two insights. Do not add `ai_model_result`.
- **Failure:** `tool_operation_result` with `status = failed`, excluding `error_code = abandoned`.
- **Contact conversion:** `contact_submitted` with `status = ok`.
- **Return usage:** the same PostHog distinct id opening a tool on a later day. Use PostHog retention on `tool_opened`.
- **Campaign:** `utm_campaign` registered from the landing URL and stored for 30 days in the `itt_utm` cookie. A missing value means the visit had no campaign. It is not an assumed source.
- **Language, device, country, referrer:** `locale`, `$device_type`, PostHog GeoIP country, `$referring_domain`.

Settlement Analyzer counts in PostHog are product events. The trial of 5 successful analyses, the feedback prompt after 3, survey versions, and lead records remain the Supabase Beta counters. Do not reconcile them by deleting either side.

## PostHog project

- Organization: **ITT Digital Hub**
- Project: **ITT Digital Hub**, id `301034`
- UI: https://eu.posthog.com/project/301034
- Dashboard: https://eu.posthog.com/project/301034/dashboard/1012897
- Ingestion: `https://eu.i.posthog.com`
- Browser traffic uses the same-origin proxy `/ingest`, rewritten to the EU hosts
- Time zone: Europe/Sofia
- IP anonymisation: on
- PostHog AI data processing: off
- AI training: off
- No billing customer and no payment card

There is no public analytics page and no admin API. The existing settlement admin still shows Beta leads only.

## Environment

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | Vercel production and preview, local `.env.local` | Publishable project key (`phc_`). Required for capture |
| `NEXT_PUBLIC_POSTHOG_CAPTURE_DEV` | Local only, optional | Set to `1` to send events from `next dev` |
| `ANALYTICS_MODEL_PRICES_JSON` | Server only, optional | `{ "model-id": { "inputPerMillionUsd": 1.25, "outputPerMillionUsd": 10 } }`. Cost stays empty unless both rates are present |

Never commit a personal API key (`phx_`). The project token is public by PostHog's design and still stays out of git; `.env.example` documents the name only.

Events are sent when the token exists and the environment is `production` or `preview`. `test` and normal local development do not send.

## Session replay

Replay is off until a visit reaches a tool or the contact page. It then continues for that browser session so the path between tools stays visible. Admin and Махни досадното never record.

Project settings, as well as the browser SDK:

- Record only URLs containing `/tools`, `/vik-proektant`, `/ai-act`, `/settlement-analyzer`, `/pipe-thermal-analysis`, or `/work-with-us`
- Block `/admin` and `/mahni-dosadnoto`
- Sample rate `1.00` of the sessions that match those URLs
- Ignore recordings shorter than 2 seconds
- Retention 30 days
- Mask every input
- Also mask `.ph-mask` (questions, contact form, lead form)
- Do not record request or response bodies, or headers
- Drop network entries for model providers, Supabase, and Resend

## Cost

The project is on the PostHog free plan. No card is attached, so a limit cannot be charged.

Free tier used here, checked against the current PostHog pricing page during setup:

- 1,000,000 product analytics events / month
- 5,000 session recordings / month
- 100,000 error-tracking exceptions / month are available and left off
- Feature flags, experiments, and PostHog AI are not enabled for this site

At conference scale this is enough. Recordings are limited to tool and contact pages, search is debounced, and pipe calculations emit one event after the visitor stops typing for 0.9 seconds. If a free quota is exhausted, PostHog stops accepting that product for the rest of the month. It does not invoice this project.

Estimated additional platform cost: **€0 / month**.

Token cost on the AI providers is unchanged. `estimated_cost_usd` is filled only from `ANALYTICS_MODEL_PRICES_JSON` or from a cost figure the provider already returned. No extra model call is made for classification.

## Campaign URLs

Use the real landing URL. These are the URLs to print or present. They are not evidence that anyone has used them.

Tools catalogue, Bulgarian:

`https://ittdigitalhub.org/bg/tools?utm_source=conference&utm_medium=qr&utm_campaign=ai-industrial-summit-2026`

English:

`https://ittdigitalhub.org/en/tools?utm_source=conference&utm_medium=qr&utm_campaign=ai-industrial-summit-2026`

Direct tools, same parameters:

- `/bg/vik-proektant/compare`
- `/bg/ai-act/compare`
- `/bg/ai-act-agent`
- `/bg/settlement-analyzer`
- `/bg/pipe-thermal-analysis`

`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, and `utm_term` are kept in the `itt_utm` cookie for 30 days. Later navigations do not need the parameters in the address bar.

A talk and a printed QR code should use different `utm_medium` values, for example `talk` and `qr`, with the same `utm_campaign`.

## Add a tool

1. Add its id to `TOOL_IDS` and `toolIdFromPath` in `src/lib/analytics/config.ts`.
2. Call `capture` or `captureFeature` from `src/lib/analytics/client.ts` at the meaningful action, not on every render.
3. If the result is produced on the server, send one `tool_operation_result` from that route with `confirmation: "server"` and the correlation headers from `beginTrackedOperation`.
4. If the result is produced in the browser, send one `tool_operation_result` with `confirmation: "client"`.
5. Add any new property key to `ALLOWED_KEYS` or it will be discarded.
6. Add a PostHog insight to dashboard `1012897` filtered by `tool_id`.
7. Extend `tests/analytics.test.ts`.

## Troubleshooting

No events in the dashboard:

- Confirm `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` is set on the Vercel environment that is serving the site, then redeploy. Next.js inlines it only when client code reads `process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` directly. `NEXT_PUBLIC_VERCEL_ENV` is set from `VERCEL_ENV` in `next.config.ts` so preview visits are not labeled production.
- Browser events must keep the PostHog `token` and anonymous `distinct_id` properties. `scrubBrowserProperties` leaves a `phc_` project key and a non-email distinct id in place, and still removes passwords, authorization headers, email-shaped ids and other secrets.
- The dashboard hides `development` and `preview`. Check activity without that filter: https://eu.posthog.com/project/301034/activity
- Local `next dev` sends nothing unless `NEXT_PUBLIC_POSTHOG_CAPTURE_DEV=1`.

Replay is empty:

- Open a tool page and stay longer than 2 seconds. The homepage alone is not recorded.
- Recordings can take a few minutes to appear.

Server and browser events do not share a person:

- Comparisons send `x-posthog-distinct-id` and `x-posthog-session-id`. `correlated` is true when the distinct id arrived.
- Agent Hub events use `hub_<requestId>` until the gateway forwards the browser id. Join them to the hosted assistant with `request_id`.

Beta numbers differ from PostHog:

- That is expected. Supabase is the trial ledger. PostHog is the product journey.

## Rollback

1. In Vercel, remove `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` or redeploy the previous deployment. Capture then no-ops and the tools keep working.
2. Revert the analytics commit if the code itself must come out.
3. Do not delete the PostHog project or the Supabase Beta tables as part of a rollback.

Agent Hub model events start only after the local hub process on `127.0.0.1:8788` is restarted with this code and the project token in its environment. Restarting it is separate from the website deploy. Follow `docs/agent-platform-runbook.md` and check `http://127.0.0.1:8788/health` and `https://agent.ittdigitalhub.org/health` afterwards.
