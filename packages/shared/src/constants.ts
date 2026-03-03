// FinOps Platform - Shared Constants

// ── Emission Factors (kg-CO2/kWh) ──
// Source: Ministry of Environment Japan
export const EMISSION_FACTORS: Record<string, number> = {
    // Japanese power companies
    TEPCO: 0.441,    // Tokyo Electric Power
    KEPCO: 0.352,    // Kansai Electric Power
    CHUBU: 0.410,    // Chubu Electric Power
    TOHOKU: 0.468,   // Tohoku Electric Power

    // AWS Region → Power company
    'ap-northeast-1': 0.441,  // Tokyo → TEPCO
    'ap-northeast-3': 0.352,  // Osaka → KEPCO

    // Azure Region → Power company
    japaneast: 0.441,
    japanwest: 0.352,
};

// ── PUE (Power Usage Effectiveness) ──
export const PUE: Record<string, number> = {
    aws: 1.135,
    azure: 1.185,
};

// ── Default Schedule (Night-Watch) ──
export const DEFAULT_SCHEDULE = {
    startTimeJst: '09:00',
    endTimeJst: '18:00',
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
    warningMinutes: 10,
    defaultExtendHours: 2,
} as const;

// ── JCT (Japan Consumption Tax) ──
export const JCT_RATE = 0.10;

// ── Plan Limits ──
export const PLAN_LIMITS = {
    free: {
        maxCloudAccounts: 1,
        maxResources: 10,
        aiAdvisor: false,
        greenOps: false,
        lineFullAccess: false,
    },
    pro: {
        maxCloudAccounts: 5,
        maxResources: 100,
        aiAdvisor: true,
        greenOps: true,
        lineFullAccess: true,
    },
    enterprise: {
        maxCloudAccounts: Infinity,
        maxResources: Infinity,
        aiAdvisor: true,
        greenOps: true,
        lineFullAccess: true,
    },
} as const;

// ── LINE Messaging ──
export const LINE_API = {
    MESSAGING_BASE: 'https://api.line.me/v2/bot',
    PUSH_MESSAGE: 'https://api.line.me/v2/bot/message/push',
    REPLY_MESSAGE: 'https://api.line.me/v2/bot/message/reply',
    PROFILE: 'https://api.line.me/v2/bot/profile',
} as const;

export const LINE_FLEX_COLORS = {
    primary: '#10B981',
    secondary: '#14B8A6',
    danger: '#EF4444',
    warning: '#F59E0B',
    muted: '#94A3B8',
    background: '#0F172A',
    surface: '#1E293B',
    text: '#E2E8F0',
    textMuted: '#94A3B8',
} as const;

export const WEEKLY_REPORT_DEFAULTS = {
    dayOfWeek: 1,
    hourJst: 9,
    timezone: 'Asia/Tokyo',
} as const;

// ── API Paths ──
export const API_PATHS = {
    AUTH_LOGIN: '/api/v1/auth/line-login',
    AUTH_REFRESH: '/api/v1/auth/refresh',
    ACCOUNTS: '/api/v1/accounts',
    RESOURCES: '/api/v1/resources',
    SCHEDULES: '/api/v1/schedules',
    COSTS: '/api/v1/costs',
    CARBON: '/api/v1/carbon',
    AI: '/api/v1/ai',
    BILLING: '/api/v1/billing',
    LINE_WEBHOOK: '/api/v1/line/webhook',
    LINE_CONFIG: '/api/v1/line/config',
    LINE_SEND_REPORT: '/api/v1/line/send-report',
    LINE_DELIVERY_STATUS: '/api/v1/line/delivery-status',
    ORG: '/api/v1/org',
    ORG_SETTINGS: '/api/v1/org/settings',
    REPORTS: '/api/v1/reports',
    REPORTS_WEEKLY: '/api/v1/reports/weekly',
    NOTIFICATIONS: '/api/v1/notifications',
} as const;
