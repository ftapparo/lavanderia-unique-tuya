import type { Request, Response } from 'express';
import { tuyaService } from '../services/tuya.service';

const normalizeDeviceId = (value: unknown): string => String(value || '').trim();

export const devicesController = {
    async turnOn(req: Request, res: Response) {
        const deviceId = normalizeDeviceId(req.params.deviceId);
        if (!deviceId) {
            res.fail('deviceId obrigatorio.', 400);
            return;
        }
        const result = await tuyaService.turnOn(deviceId);
        res.ok(result);
    },

    async turnOff(req: Request, res: Response) {
        const deviceId = normalizeDeviceId(req.params.deviceId);
        if (!deviceId) {
            res.fail('deviceId obrigatorio.', 400);
            return;
        }
        const result = await tuyaService.turnOff(deviceId);
        res.ok(result);
    },

    async status(req: Request, res: Response) {
        const deviceId = normalizeDeviceId(req.params.deviceId);
        if (!deviceId) {
            res.fail('deviceId obrigatorio.', 400);
            return;
        }
        const result = await tuyaService.getStatus(deviceId);
        res.ok(result);
    },

    async consumption(req: Request, res: Response) {
        const deviceId = normalizeDeviceId(req.params.deviceId);
        if (!deviceId) {
            res.fail('deviceId obrigatorio.', 400);
            return;
        }
        const result = await tuyaService.getConsumption(deviceId);
        res.ok(result);
    },
};
