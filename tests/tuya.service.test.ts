describe('tuya.service', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    it('opera em modo mock sem dependencias externas', async () => {
        jest.unmock('../src/tuya');
        const { env } = require('../src/config/env');
        env.tuyaMockMode = true;

        const { tuyaService } = require('../src/services/tuya.service');

        const onResult = await tuyaService.turnOn('device-1');
        expect(onResult).toMatchObject({ deviceId: 'device-1', command: 'TURN_ON', mocked: true });

        const statusOn = await tuyaService.getStatus('device-1');
        expect(statusOn).toEqual({ deviceId: 'device-1', isOn: true });

        const consumptionOn = await tuyaService.getConsumption('device-1');
        expect(consumptionOn.deviceId).toBe('device-1');
        expect(consumptionOn.powerWatts).toBeGreaterThan(0);
        expect(consumptionOn.energyKwh).toBeGreaterThanOrEqual(0);

        const offResult = await tuyaService.turnOff('device-1');
        expect(offResult).toMatchObject({ deviceId: 'device-1', command: 'TURN_OFF', mocked: true });

        const statusOff = await tuyaService.getStatus('device-1');
        expect(statusOff).toEqual({ deviceId: 'device-1', isOn: false });
    });

    it('usa cliente real quando mock mode esta desligado', async () => {
        const requestMock = jest.fn()
            .mockResolvedValueOnce({ success: true, result: {} }) // turnOn
            .mockResolvedValueOnce({ success: true, result: {} }) // turnOff
            .mockResolvedValueOnce({ success: true, result: [{ code: 'switch_1', value: true }] }) // status
            .mockResolvedValueOnce({
                success: true,
                result: [{ code: 'cur_power', value: 321.5 }, { code: 'add_ele', value: 1.234 }],
            }); // consumption

        const initMock = jest.fn().mockResolvedValue(undefined);

        jest.doMock('../src/tuya', () => ({
            TuyaOpenApiClient: jest.fn().mockImplementation(() => ({
                init: initMock,
                request: requestMock,
            })),
        }));

        const { env } = require('../src/config/env');
        env.tuyaMockMode = false;

        const { tuyaService } = require('../src/services/tuya.service');

        const onResult = await tuyaService.turnOn('device-real');
        expect(onResult).toEqual({ deviceId: 'device-real', command: 'TURN_ON', mocked: false });

        const offResult = await tuyaService.turnOff('device-real');
        expect(offResult).toEqual({ deviceId: 'device-real', command: 'TURN_OFF', mocked: false });

        const status = await tuyaService.getStatus('device-real');
        expect(status).toEqual({ deviceId: 'device-real', isOn: true });

        const consumption = await tuyaService.getConsumption('device-real');
        expect(consumption).toMatchObject({
            deviceId: 'device-real',
            powerWatts: 321.5,
            energyKwh: 1.234,
        });

        expect(initMock).toHaveBeenCalledTimes(1);
        expect(requestMock).toHaveBeenCalledTimes(4);
    });

    it('realiza retry em falha transitoria no modo real', async () => {
        const requestMock = jest.fn()
            .mockRejectedValueOnce(new Error('timeout'))
            .mockResolvedValueOnce({ success: true, result: {} });

        const initMock = jest.fn().mockResolvedValue(undefined);

        jest.doMock('../src/tuya', () => ({
            TuyaOpenApiClient: jest.fn().mockImplementation(() => ({
                init: initMock,
                request: requestMock,
            })),
        }));

        const { env } = require('../src/config/env');
        env.tuyaMockMode = false;
        env.tuyaRetryAttempts = 2;
        env.tuyaRetryBaseDelayMs = 1;

        const { tuyaService } = require('../src/services/tuya.service');
        const result = await tuyaService.turnOn('device-retry');

        expect(result).toEqual({ deviceId: 'device-retry', command: 'TURN_ON', mocked: false });
        expect(requestMock).toHaveBeenCalledTimes(2);
    });
});
