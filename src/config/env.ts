const read = (value: string | undefined, fallback: string): string => {
    const normalized = (value || '').trim();
    return normalized || fallback;
};

const readOneOf = (values: Array<string | undefined>, fallback: string): string => {
    for (const value of values) {
        const normalized = (value || '').trim();
        if (normalized) {
            return normalized;
        }
    }
    return fallback;
};

const readNumber = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const readBoolean = (value: string | undefined, fallback: boolean): boolean => {
    if (typeof value !== 'string') {
        return fallback;
    }

    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return fallback;
};

export const env = {
    nodeEnv: read(process.env.NODE_ENV, 'development'),
    port: readNumber(process.env.PORT, 3001),
    tuyaClientId: readOneOf([process.env.TUYA_CLIENT_ID, process.env.TUYA_ACCESS_ID], ''),
    tuyaClientSecret: readOneOf([process.env.TUYA_CLIENT_SECRET, process.env.TUYA_ACCESS_SECRET], ''),
    tuyaBaseUrl: readOneOf([process.env.TUYA_BASE_URL, process.env.TUYA_ENDPOINT], 'https://openapi.tuyaus.com'),
    tuyaMockMode: readBoolean(process.env.TUYA_MOCK_MODE, true),
    tuyaTimeoutMs: readNumber(process.env.TUYA_TIMEOUT_MS, 5000),
    tuyaRetryAttempts: readNumber(process.env.TUYA_RETRY_ATTEMPTS, 3),
    tuyaRetryBaseDelayMs: readNumber(process.env.TUYA_RETRY_BASE_DELAY_MS, 250),
};
