export const PRIVACY_VERSION = '2026-09-20'

export const ORGANIZATION_TYPES = [
  'Проектант / проектантско бюро',
  'Строителна компания',
  'ВиК оператор',
  'Производител на оборудване',
  'Доставчик / търговец',
  'Инженерна / консултантска компания',
  'Община / публична организация',
  'Университет / научна организация',
  'Друго',
] as const

export const ORGANIZATION_TYPE_EN: Record<(typeof ORGANIZATION_TYPES)[number], string> = {
  'Проектант / проектантско бюро': 'Designer / design studio',
  'Строителна компания': 'Construction company',
  'ВиК оператор': 'Water utility',
  'Производител на оборудване': 'Equipment manufacturer',
  'Доставчик / търговец': 'Supplier / trader',
  'Инженерна / консултантска компания': 'Engineering / consulting firm',
  'Община / публична организация': 'Municipality / public body',
  'Университет / научна организация': 'University / research organisation',
  Друго: 'Other',
}

export const EMPLOYEE_RANGES = [
  '1–10 души',
  '11–50 души',
  '51–250 души',
  'Над 250 души',
  'Публична организация',
  'Предпочитам да не посочвам',
] as const

export const EMPLOYEE_RANGE_EN: Record<(typeof EMPLOYEE_RANGES)[number], string> = {
  '1–10 души': '1–10 people',
  '11–50 души': '11–50 people',
  '51–250 души': '51–250 people',
  'Над 250 души': 'More than 250 people',
  'Публична организация': 'Public organisation',
  'Предпочитам да не посочвам': 'Prefer not to say',
}

export const USE_CASES = [
  'Предварителен анализ на територия',
  'Проектиране',
  'Планиране на инфраструктура',
  'Оценка на потенциален проект',
  'Подготовка на оферти',
  'Количествени и предварителни оценки',
  'Продажба на ВиК оборудване',
  'Анализ на потенциални клиенти или пазари',
  'GIS / пространствени анализи',
  'Подготовка на доклади',
  'Друго',
] as const

export const USE_CASE_EN: Record<(typeof USE_CASES)[number], string> = {
  'Предварителен анализ на територия': 'Preliminary area analysis',
  'Проектиране': 'Design',
  'Планиране на инфраструктура': 'Infrastructure planning',
  'Оценка на потенциален проект': 'Project appraisal',
  'Подготовка на оферти': 'Preparing bids',
  'Количествени и предварителни оценки': 'Quantities and preliminary estimates',
  'Продажба на ВиК оборудване': 'Water-equipment sales',
  'Анализ на потенциални клиенти или пазари': 'Client or market analysis',
  'GIS / пространствени анализи': 'GIS / spatial analysis',
  'Подготовка на доклади': 'Preparing reports',
  'Друго': 'Other',
}

export const PAIN_POINTS = [
  'Събиране на информация',
  'Проучване на територии и обекти',
  'Анализ на данни',
  'Подготовка на техническа документация',
  'Подготовка на оферти',
  'Количествени сметки',
  'Работа с нормативна документация',
  'Подготовка на доклади',
  'Търсене на проекти и клиенти',
  'Координация между екипи',
  'Обработка на Excel / таблици / документи',
  'Друго',
] as const

export const PAIN_POINT_EN: Record<(typeof PAIN_POINTS)[number], string> = {
  'Събиране на информация': 'Gathering information',
  'Проучване на територии и обекти': 'Surveying places and sites',
  'Анализ на данни': 'Data analysis',
  'Подготовка на техническа документация': 'Preparing technical documents',
  'Подготовка на оферти': 'Preparing bids',
  'Количествени сметки': 'Bills of quantities',
  'Работа с нормативна документация': 'Working with regulations',
  'Подготовка на доклади': 'Preparing reports',
  'Търсене на проекти и клиенти': 'Finding projects and clients',
  'Координация между екипи': 'Team coordination',
  'Обработка на Excel / таблици / документи': 'Working with Excel / tables / documents',
  'Друго': 'Other',
}

export const PROJECT_TIMELINES = [
  'Да, в момента',
  'В следващите 3 месеца',
  'В следващите 6–12 месеца',
  'Засега само разглеждам възможностите',
] as const

export const PROJECT_TIMELINE_EN: Record<(typeof PROJECT_TIMELINES)[number], string> = {
  'Да, в момента': 'Yes, currently',
  'В следващите 3 месеца': 'In the next 3 months',
  'В следващите 6–12 месеца': 'In the next 6–12 months',
  'Засега само разглеждам възможностите': 'Exploring options for now',
}

export const CONTACT_INTERESTS = [
  'Да, бих искал разговор',
  'Да, но на по-късен етап',
  'Засега не',
] as const

export const CONTACT_INTEREST_EN: Record<(typeof CONTACT_INTERESTS)[number], string> = {
  'Да, бих искал разговор': 'Yes, I would like a conversation',
  'Да, но на по-късен етап': 'Yes, but later',
  'Засега не': 'Not for now',
}

export const TRACKED_EVENT_NAMES = [
  'landing_viewed',
  'registration_started',
  'registration_completed',
  'analysis_started',
  'analysis_completed',
  'second_analysis_started',
  'profile_prompt_viewed',
  'profile_started',
  'profile_completed',
  'return_visit',
  'contact_requested',
  'feature_used',
  'network_upload_modal_open',
  'network_upload_interest_yes',
  'network_upload_interest_no',
] as const

export type TrackedEventName = typeof TRACKED_EVENT_NAMES[number]
