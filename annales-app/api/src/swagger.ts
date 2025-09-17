import type { Express, Request, Response, NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc, { type Options } from 'swagger-jsdoc';

export function setupSwagger(app: Express) {
  const options: Options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Annales API',
        version: '1.0.0',
      },
      servers: [{ url: '/api' }],
    },
    // En prod, seul dist/** existe ; en dev, on garde src/**
    apis: [
      './dist/routes/**/*.js',
      './src/routes/**/*.ts',
      './src/routes/**/*.js',
    ],
  };

  const spec = swaggerJSDoc(options);

  // JSON de la spec (utilisé par le smoke test)
  app.get('/api/docs.json', (_req: Request, res: Response) => {
    res.type('application/json').send(spec);
  });

  // UI Swagger (CSP détendue uniquement ici)
  app.use(
    '/api/docs',
    (_req: Request, res: Response, next: NextFunction) => {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; base-uri 'self'; font-src 'self' https: data:; form-action 'self'; frame-ancestors 'self'; img-src 'self' data:; object-src 'none'; script-src 'self' 'unsafe-inline'; script-src-attr 'none'; style-src 'self' https: 'unsafe-inline'; upgrade-insecure-requests"
      );
      next();
    },
    swaggerUi.serve,
    swaggerUi.setup(spec, { explorer: true })
  );
}