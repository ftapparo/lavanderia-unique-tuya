import express from 'express';
import { devicesController } from '../controllers/devices.controller';

const router = express.Router();

router.post('/devices/:deviceId/turn-on', async (req, res, next) => {
    Promise.resolve(devicesController.turnOn(req, res)).catch(next);
});
router.post('/devices/:deviceId/turn-off', async (req, res, next) => {
    Promise.resolve(devicesController.turnOff(req, res)).catch(next);
});
router.get('/devices/:deviceId/status', async (req, res, next) => {
    Promise.resolve(devicesController.status(req, res)).catch(next);
});
router.get('/devices/:deviceId/consumption', async (req, res, next) => {
    Promise.resolve(devicesController.consumption(req, res)).catch(next);
});

export default router;
