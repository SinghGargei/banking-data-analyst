import { Router } from 'express';
import {
  getApplications,
  getApplicationById,
  getApplicationsSummary,
} from '../controllers/applications.controller';

const router = Router();

router.get('/', getApplications);
router.get('/summary', getApplicationsSummary);
router.get('/:id', getApplicationById);

export default router;
