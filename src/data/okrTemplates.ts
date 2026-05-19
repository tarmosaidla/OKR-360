import type { KrTargetType } from '../types'

export interface KRTemplate {
  title: string
  target_type: KrTargetType
  target_value: number
  unit: string | null
}

export interface OKRTemplate {
  id: string
  title: string
  krs: KRTemplate[]
}

export interface TemplateCategory {
  id: string
  label: string
  templates: OKRTemplate[]
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'sales',
    label: 'Sales',
    templates: [
      {
        id: 'sales-revenue',
        title: 'Hit quarterly revenue targets',
        krs: [
          { title: 'Close new ARR', target_type: 'numeric', target_value: 500000, unit: '$' },
          { title: 'Add new logo customers', target_type: 'numeric', target_value: 15, unit: 'logos' },
          { title: 'Maintain pipeline coverage ratio', target_type: 'numeric', target_value: 3, unit: '× ARR target' },
          { title: 'Achieve win rate on qualified opportunities', target_type: 'percentage', target_value: 30, unit: null },
        ],
      },
      {
        id: 'sales-expansion',
        title: 'Expand into a new market segment',
        krs: [
          { title: 'Generate qualified leads in target segment', target_type: 'numeric', target_value: 50, unit: 'leads' },
          { title: 'Run paid pilots with segment prospects', target_type: 'numeric', target_value: 5, unit: 'pilots' },
          { title: 'Close first deals in new segment', target_type: 'numeric', target_value: 3, unit: 'deals' },
          { title: 'Achieve segment revenue', target_type: 'numeric', target_value: 100000, unit: '$' },
        ],
      },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    templates: [
      {
        id: 'mktg-topfunnel',
        title: 'Drive top-of-funnel growth',
        krs: [
          { title: 'Generate marketing-qualified leads', target_type: 'numeric', target_value: 500, unit: 'MQLs' },
          { title: 'Grow organic website visitors', target_type: 'numeric', target_value: 40000, unit: 'visitors/mo' },
          { title: 'Improve lead-to-MQL conversion rate', target_type: 'percentage', target_value: 12, unit: null },
          { title: 'Reduce customer acquisition cost', target_type: 'numeric', target_value: 800, unit: '$ CAC' },
        ],
      },
      {
        id: 'mktg-brand',
        title: 'Build brand awareness in target market',
        krs: [
          { title: 'Achieve share of voice in category', target_type: 'percentage', target_value: 15, unit: null },
          { title: 'Earn media mentions and press coverage', target_type: 'numeric', target_value: 20, unit: 'mentions' },
          { title: 'Grow LinkedIn followers in ICP', target_type: 'numeric', target_value: 2000, unit: 'followers' },
          { title: 'Hit brand NPS among target personas', target_type: 'numeric', target_value: 40, unit: 'NPS' },
        ],
      },
    ],
  },
  {
    id: 'engineering',
    label: 'Engineering',
    templates: [
      {
        id: 'eng-reliability',
        title: 'Improve platform reliability and performance',
        krs: [
          { title: 'Achieve service uptime SLA', target_type: 'percentage', target_value: 99.9, unit: null },
          { title: 'Reduce p95 API response time', target_type: 'numeric', target_value: 200, unit: 'ms' },
          { title: 'Cut mean time to recovery (MTTR)', target_type: 'numeric', target_value: 30, unit: 'minutes' },
          { title: 'Reduce critical incidents', target_type: 'numeric', target_value: 2, unit: 'incidents/mo' },
        ],
      },
      {
        id: 'eng-delivery',
        title: 'Accelerate engineering delivery cadence',
        krs: [
          { title: 'Ship planned roadmap items on time', target_type: 'percentage', target_value: 85, unit: null },
          { title: 'Increase deployment frequency', target_type: 'numeric', target_value: 10, unit: 'deploys/week' },
          { title: 'Reduce lead time from commit to production', target_type: 'numeric', target_value: 1, unit: 'days' },
          { title: 'Maintain test coverage threshold', target_type: 'percentage', target_value: 80, unit: null },
        ],
      },
      {
        id: 'eng-debt',
        title: 'Reduce technical debt and improve code health',
        krs: [
          { title: 'Resolve high-priority tech debt tickets', target_type: 'numeric', target_value: 30, unit: 'tickets' },
          { title: 'Increase test coverage on core modules', target_type: 'percentage', target_value: 75, unit: null },
          { title: 'Eliminate known security vulnerabilities', target_type: 'percentage', target_value: 100, unit: null },
          { title: 'Document critical system architecture', target_type: 'boolean', target_value: 1, unit: null },
        ],
      },
    ],
  },
  {
    id: 'product',
    label: 'Product',
    templates: [
      {
        id: 'product-launch',
        title: 'Launch new product feature to market',
        krs: [
          { title: 'Ship feature to production', target_type: 'boolean', target_value: 1, unit: null },
          { title: 'Reach feature adoption among active users', target_type: 'percentage', target_value: 30, unit: null },
          { title: 'Achieve feature CSAT score', target_type: 'numeric', target_value: 4.2, unit: '/ 5' },
          { title: 'Gather qualitative feedback interviews', target_type: 'numeric', target_value: 20, unit: 'interviews' },
        ],
      },
      {
        id: 'product-retention',
        title: 'Improve product retention and engagement',
        krs: [
          { title: 'Improve 30-day user retention', target_type: 'percentage', target_value: 45, unit: null },
          { title: 'Increase weekly active users', target_type: 'numeric', target_value: 5000, unit: 'WAU' },
          { title: 'Reduce time-to-value for new signups', target_type: 'numeric', target_value: 3, unit: 'days' },
          { title: 'Lower churn rate among paying customers', target_type: 'percentage', target_value: 2, unit: null },
        ],
      },
    ],
  },
  {
    id: 'people',
    label: 'People & HR',
    templates: [
      {
        id: 'hr-engagement',
        title: 'Improve employee engagement and retention',
        krs: [
          { title: 'Achieve employee NPS', target_type: 'numeric', target_value: 40, unit: 'eNPS' },
          { title: 'Reduce voluntary attrition', target_type: 'percentage', target_value: 8, unit: null },
          { title: 'Complete engagement survey participation', target_type: 'percentage', target_value: 85, unit: null },
          { title: 'Implement top 3 feedback actions', target_type: 'boolean', target_value: 1, unit: null },
        ],
      },
      {
        id: 'hr-hiring',
        title: 'Build a high-performance hiring pipeline',
        krs: [
          { title: 'Fill open roles on plan', target_type: 'numeric', target_value: 12, unit: 'hires' },
          { title: 'Reduce average time-to-fill', target_type: 'numeric', target_value: 30, unit: 'days' },
          { title: 'Achieve offer acceptance rate', target_type: 'percentage', target_value: 90, unit: null },
          { title: 'Reach diverse candidate slate on all roles', target_type: 'percentage', target_value: 50, unit: null },
        ],
      },
    ],
  },
  {
    id: 'cs',
    label: 'Customer Success',
    templates: [
      {
        id: 'cs-retention',
        title: 'Drive customer retention and expansion',
        krs: [
          { title: 'Achieve net revenue retention', target_type: 'percentage', target_value: 115, unit: null },
          { title: 'Keep gross churn below target', target_type: 'percentage', target_value: 5, unit: null },
          { title: 'Hit customer NPS', target_type: 'numeric', target_value: 50, unit: 'NPS' },
          { title: 'Close expansion ARR from existing accounts', target_type: 'numeric', target_value: 200000, unit: '$' },
        ],
      },
      {
        id: 'cs-onboarding',
        title: 'Reduce time-to-value for new customers',
        krs: [
          { title: 'Complete onboarding within target window', target_type: 'percentage', target_value: 90, unit: null },
          { title: 'Reduce average time-to-first-value', target_type: 'numeric', target_value: 7, unit: 'days' },
          { title: 'Achieve CSAT on onboarding experience', target_type: 'numeric', target_value: 4.5, unit: '/ 5' },
          { title: 'Lower support tickets per new customer', target_type: 'numeric', target_value: 2, unit: 'tickets' },
        ],
      },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    templates: [
      {
        id: 'finance-efficiency',
        title: 'Achieve operational efficiency targets',
        krs: [
          { title: 'Improve gross margin', target_type: 'percentage', target_value: 72, unit: null },
          { title: 'Reduce operating expenses vs budget', target_type: 'percentage', target_value: 5, unit: null },
          { title: 'Maintain cash runway', target_type: 'numeric', target_value: 18, unit: 'months' },
          { title: 'Grow revenue per FTE', target_type: 'numeric', target_value: 250000, unit: '$ / FTE' },
        ],
      },
    ],
  },
]
