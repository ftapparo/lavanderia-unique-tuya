import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from '../swagger.json';
import healthRoutes from '../routes/health.routes';
import devicesRoutes from '../routes/devices.routes';
import { requestContextMiddleware } from '../middleware/request-context';
import { responseHandler } from '../middleware/response-handler';
import type { Express } from 'express';
import type { Server } from 'http';
import { env } from '../config/env';

export const swaggerUiOptions = {
    swaggerOptions: {
        requestInterceptor: (request: any) => {
            request.headers = request.headers || {};
            request.headers['x-user'] = 'SWAGGER';
            request.headers['x-request-id'] = `swagger-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            return request;
        }
    }
};

export function createApp(): Express {
    const app = express();

    app.use(cors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: '*',
        credentials: false
    }));

    app.options(/.*/, cors());
    app.use(express.json());
    app.use(requestContextMiddleware);
    app.use(responseHandler);

    app.use('/v1/api', healthRoutes);
    app.use('/v1/api', devicesRoutes);

    app.use('/v1/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerUiOptions));

    app.get('/v1/openapi.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerDocument);
    });

    app.use((_req, res) => {
        res.fail('Rota nao encontrada.', 404);
    });

    app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        const message = error instanceof Error ? error.message : 'Erro interno do servidor.';
        res.fail('Erro interno do servidor.', 500, message);
    });

    return app;
}

export async function StartWebServer(appInstance: Express = createApp()): Promise<Server> {
    const app = appInstance;
    const port = process.env.PORT || env.port;

    return await new Promise<Server>((resolve, reject) => {
        const server = app.listen(port, () => {
            console.log(`[Api] WebServer rodando na porta ${port}`);
            resolve(server);
        });

        server.once('error', (error) => {
            reject(error);
        });
    });
}
