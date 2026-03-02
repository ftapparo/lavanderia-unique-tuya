import { env } from '../config/env';
import { TuyaOpenApiClient } from '../tuya';

type DeviceState = {
    isOn: boolean;
    powerWatts: number;
    energyKwh: number;
    sampledAt: string;
};

const mockStates = new Map<string, DeviceState>();

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const withRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= env.tuyaRetryAttempts; attempt += 1) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt >= env.tuyaRetryAttempts) {
                break;
            }
            await delay(env.tuyaRetryBaseDelayMs * (2 ** (attempt - 1)));
        }
    }
    throw lastError;
};

const getOrCreateMockState = (deviceId: string): DeviceState => {
    const existing = mockStates.get(deviceId);
    if (existing) {
        return existing;
    }

    const initial: DeviceState = {
        isOn: false,
        powerWatts: 0,
        energyKwh: 0,
        sampledAt: new Date().toISOString(),
    };
    mockStates.set(deviceId, initial);
    return initial;
};

const buildConsumption = (deviceId: string): DeviceState => {
    const state = getOrCreateMockState(deviceId);
    if (state.isOn) {
        state.powerWatts = 200 + Math.round(Math.random() * 800);
        state.energyKwh = Number((state.energyKwh + (state.powerWatts / 1000) * (30 / 3600)).toFixed(6));
    } else {
        state.powerWatts = 0;
    }
    state.sampledAt = new Date().toISOString();
    return state;
};

const callTuyaPlatform = async <T>(fn: () => Promise<T>): Promise<T> => {
    return withRetry(fn);
};

let realClient: TuyaOpenApiClient | null = null;

const getRealClient = async (): Promise<TuyaOpenApiClient> => {
    if (!realClient) {
        realClient = new TuyaOpenApiClient({
            baseUrl: env.tuyaBaseUrl,
            accessKey: env.tuyaClientId,
            secretKey: env.tuyaClientSecret,
            timeoutMs: env.tuyaTimeoutMs,
            retryAttempts: env.tuyaRetryAttempts,
            retryBaseDelayMs: env.tuyaRetryBaseDelayMs,
            log: env.nodeEnv !== 'production',
        });
        await realClient.init();
    }
    return realClient;
};

const ensureResult = <T>(response: { success: boolean; code?: unknown; msg?: string; result?: T }): T => {
    if (!response.success || response.result === undefined) {
        throw new Error(`TUYA_ERROR ${String(response.code || '')} ${response.msg || ''}`.trim());
    }
    return response.result;
};

export const tuyaService = {
    async turnOn(deviceId: string) {
        if (env.tuyaMockMode) {
            const state = getOrCreateMockState(deviceId);
            state.isOn = true;
            state.sampledAt = new Date().toISOString();
            return { deviceId, command: 'TURN_ON', mocked: true };
        }

        return callTuyaPlatform(async () => {
            const client = await getRealClient();
            const response = await client.request<unknown>({
                path: `/v1.0/iot-03/devices/${encodeURIComponent(deviceId)}/commands`,
                method: 'POST',
                body: {
                    commands: [{ code: 'switch_1', value: true }],
                },
            });
            ensureResult(response);
            return { deviceId, command: 'TURN_ON', mocked: false };
        });
    },

    async turnOff(deviceId: string) {
        if (env.tuyaMockMode) {
            const state = getOrCreateMockState(deviceId);
            state.isOn = false;
            state.powerWatts = 0;
            state.sampledAt = new Date().toISOString();
            return { deviceId, command: 'TURN_OFF', mocked: true };
        }

        return callTuyaPlatform(async () => {
            const client = await getRealClient();
            const response = await client.request<unknown>({
                path: `/v1.0/iot-03/devices/${encodeURIComponent(deviceId)}/commands`,
                method: 'POST',
                body: {
                    commands: [{ code: 'switch_1', value: false }],
                },
            });
            ensureResult(response);
            return { deviceId, command: 'TURN_OFF', mocked: false };
        });
    },

    async getStatus(deviceId: string) {
        if (env.tuyaMockMode) {
            const state = getOrCreateMockState(deviceId);
            return {
                deviceId,
                isOn: state.isOn,
            };
        }

        return callTuyaPlatform(async () => {
            const client = await getRealClient();
            const response = await client.request<Array<{ code: string; value: unknown }>>({
                path: `/v1.0/iot-03/devices/${encodeURIComponent(deviceId)}/status`,
                method: 'GET',
            });
            const result = ensureResult(response);
            const switchItem = result.find((item) => item.code === 'switch_1' || item.code === 'switch');
            return {
                deviceId,
                isOn: Boolean(switchItem?.value),
            };
        });
    },

    async getConsumption(deviceId: string) {
        if (env.tuyaMockMode) {
            const state = buildConsumption(deviceId);
            return {
                deviceId,
                powerWatts: state.powerWatts,
                energyKwh: state.energyKwh,
                sampledAt: state.sampledAt,
            };
        }

        return callTuyaPlatform(async () => {
            const client = await getRealClient();
            const response = await client.request<Array<{ code: string; value: unknown }>>({
                path: `/v1.0/iot-03/devices/${encodeURIComponent(deviceId)}/status`,
                method: 'GET',
            });
            const result = ensureResult(response);
            const power = Number(result.find((item) => item.code === 'cur_power')?.value ?? 0);
            const energy = Number(result.find((item) => item.code === 'add_ele')?.value ?? 0);
            return {
                deviceId,
                powerWatts: Number.isFinite(power) ? power : 0,
                energyKwh: Number.isFinite(energy) ? energy : 0,
                sampledAt: new Date().toISOString(),
            };
        });
    },
};
