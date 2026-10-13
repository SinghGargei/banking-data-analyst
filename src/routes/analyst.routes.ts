import { Router } from 'express';
import {
  getSchema,
  getOverview,
  executeSafeQuery,
} from '../controllers/analyst.controller';

const router = Router();

router.get('/schema', getSchema);
router.get('/overview', getOverview);
router.post('/query', executeSafeQuery);

export default router;
