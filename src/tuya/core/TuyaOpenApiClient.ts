import crypto from 'crypto';
import { requestLogger } from '../TuyaRequestLogger';
import { TuyaError } from './TuyaError';
import { MemoryTokenStore, TokenStore } from './TuyaTokenStore';

export interface TuyaClientOptions {
    baseUrl: string;
    accessKey: string;
    secretKey: string;
    store?: TokenStore;
    timeoutMs?: number;
    retryAttempts?: number;
    retryBaseDelayMs?: number;
    log?: boolean;
}

export interface TuyaRequestOptions {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    query?: Record<string, unknown>;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
    retry?: boolean;
}

type TuyaResponseEnvelope<T> = {
    success: boolean;
    code?: number | string;
    msg?: string;
    result?: T;
    t?: number;
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class TuyaOpenApiClient {
    private readonly baseUrl: string;
    private readonly accessKey: string;
    private readonly secretKey: string;
    private readonly store: TokenStore;
    private readonly timeoutMs: number;
    private readonly retryAttempts: number;
    private readonly retryBaseDelayMs: number;
    private readonly log: boolean;

    constructor(opt: TuyaClientOptions) {
        this.baseUrl = opt.baseUrl.replace(/\/+$/, '');
        this.accessKey = opt.accessKey;
        this.secretKey = opt.secretKey;
        this.store = opt.store || new MemoryTokenStore();
        this.timeoutMs = opt.timeoutMs ?? 15000;
        this.retryAttempts = opt.retryAttempts ?? 3;
        this.retryBaseDelayMs = opt.retryBaseDelayMs ?? 250;
        this.log = opt.log ?? false;
    }

    private debug(...args: unknown[]) {
        if (this.log) {
            console.log('[TuyaClient]', ...args);
        }
    }

    private generateNonce(): string {
        if ((crypto as unknown as { randomUUID?: () => string }).randomUUID) {
            return (crypto as unknown as { randomUUID: () => string }).randomUUID();
        }
        const bytes = crypto.randomBytes(16);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = bytes.toString('hex');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
    }

    private sign(str: string): string {
        return crypto.createHmac('sha256', this.secretKey).update(str, 'utf8').digest('hex').toUpperCase();
    }

    private normalizeQuery(query?: Record<string, unknown>): URLSearchParams {
        const params = new URLSearchParams();
        if (!query) return params;
        const keys = Object.keys(query).sort();
        for (const key of keys) {
            const value = query[key];
            if (value === null || value === undefined) continue;
            params.append(key, String(value));
        }
        return params;
    }

    private async httpRequest<T>(url: string, init: RequestInit): Promise<T> {
        let lastError: unknown;
        for (let attempt = 1; attempt <= this.retryAttempts; attempt += 1) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
            try {
                const route = (() => {
                    try {
                        const u = new URL(url);
                        return `${u.pathname}${u.search || ''}`;
                    } catch {
                        return url;
                    }
                })();
                void requestLogger.log(route);

                const response = await fetch(url, {
                    ...init,
                    signal: controller.signal,
                });
                const text = await response.text();
                const payload = text ? JSON.parse(text) : {};

                if (!response.ok) {
                    throw new TuyaError(`HTTP_${response.status}`, response.status);
                }

                return payload as T;
            } catch (error) {
                lastError = error;
                if (attempt >= this.retryAttempts) {
                    break;
                }
                await sleep(this.retryBaseDelayMs * (2 ** (attempt - 1)));
            } finally {
                clearTimeout(timeout);
            }
        }

        throw lastError instanceof TuyaError
            ? lastError
            : new TuyaError(lastError instanceof Error ? lastError.message : 'TUYA_REQUEST_FAILED');
    }

    private buildStringToSign(pathWithQuery: string, method: string, body?: Record<string, unknown>): string {
        const bodyStr = body && Object.keys(body).length > 0 ? JSON.stringify(body) : '';
        const contentHash = crypto.createHash('sha256').update(bodyStr, 'utf8').digest('hex');
        return [method.toUpperCase(), contentHash, '', decodeURIComponent(pathWithQuery)].join('\n');
    }

    private async getTokenHeader(t: string, nonce: string): Promise<Record<string, string>> {
        const path = '/v1.0/token?grant_type=1';
        const stringToSign = this.buildStringToSign(path, 'GET');
        const signStr = `${this.accessKey}${t}${nonce}${stringToSign}`;
        const sign = this.sign(signStr);
        return {
            t,
            sign,
            client_id: this.accessKey,
            sign_method: 'HMAC-SHA256',
            nonce,
        };
    }

    private async getRequestHeader(
        t: string,
        nonce: string,
        pathWithQuery: string,
        method: string,
        body?: Record<string, unknown>,
    ): Promise<Record<string, string>> {
        const accessToken = await this.store.getAccessToken();
        if (!accessToken) {
            throw new TuyaError('ACCESS_TOKEN_MISSING');
        }
        const stringToSign = this.buildStringToSign(pathWithQuery, method, body);
        const signStr = `${this.accessKey}${accessToken}${t}${nonce}${stringToSign}`;
        const sign = this.sign(signStr);
        return {
            t,
            sign,
            client_id: this.accessKey,
            access_token: accessToken,
            sign_method: 'HMAC-SHA256',
            nonce,
        };
    }

    async init(): Promise<void> {
        const t = Date.now().toString();
        const nonce = this.generateNonce();
        const headers = await this.getTokenHeader(t, nonce);
        const response = await this.httpRequest<TuyaResponseEnvelope<{
            access_token: string;
            refresh_token: string;
            expire_time: number;
        }>>(
            `${this.baseUrl}/v1.0/token?grant_type=1`,
            { method: 'GET', headers },
        );

        if (!response.success || !response.result) {
            throw new TuyaError(response.msg || 'GET_TOKEN_FAILED', response.code);
        }

        await this.store.setTokens(response.result);
        this.debug('Token inicial obtido.');
    }

    async refreshToken(): Promise<void> {
        await this.init();
    }

    async request<T = unknown>(opt: TuyaRequestOptions): Promise<TuyaResponseEnvelope<T>> {
        const { path, method, body, headers: extraHeaders, retry = true } = opt;
        const queryParams = this.normalizeQuery(opt.query);
        const pathWithQuery = queryParams.toString() ? `${path}?${queryParams.toString()}` : path;

        if (await this.store.isExpired()) {
            await this.refreshToken();
        }

        const t = Date.now().toString();
        const nonce = this.generateNonce();
        const requestHeaders = await this.getRequestHeader(t, nonce, pathWithQuery, method, body);

        const response = await this.httpRequest<TuyaResponseEnvelope<T>>(
            `${this.baseUrl}${pathWithQuery}`,
            {
                method,
                headers: {
                    'content-type': 'application/json',
                    ...requestHeaders,
                    ...(extraHeaders || {}),
                },
                body: body && Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
            },
        );

        if (!response.success && retry && String(response.code) === '1010') {
            await this.refreshToken();
            return this.request({ ...opt, retry: false });
        }

        return response;
    }
}
