import { Router } from 'express';
import applicationsRoutes from './applications.routes';
import branchesRoutes from './branches.routes';
import customersRoutes from './customers.routes';
import analystRoutes from './analyst.routes';
import queryRoutes from './query';
import { db } from '../db/connection';

const apiRouter = Router();

// Root API information endpoint
apiRouter.get('/', async (_req, res) => {
  const health = await db.checkHealth();
  res.json({
    name: 'Banking Conversational Data Analyst API',
    version: '1.0.0',
    status: health.isHealthy ? 'healthy' : 'degraded',
    endpoints: {
      conversationalQuery: 'POST /api/query',
      applications: '/api/applications',
      branches: '/api/branches',
      customers: '/api/customers',
      analystSchema: '/api/analyst/schema',
      analystOverview: '/api/analyst/overview',
      analystSafeQuery: 'POST /api/analyst/query',
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});

apiRouter.use('/query', queryRoutes);
apiRouter.use('/applications', applicationsRoutes);
apiRouter.use('/branches', branchesRoutes);
apiRouter.use('/customers', customersRoutes);
apiRouter.use('/analyst', analystRoutes);

export default apiRouter;
