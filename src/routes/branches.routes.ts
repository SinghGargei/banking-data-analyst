import { Router } from 'express';
import {
  getBranches,
  getBranchById,
  getBranchStats,
} from '../controllers/branches.controller';

const router = Router();

router.get('/', getBranches);
router.get('/stats', getBranchStats);
router.get('/:id', getBranchById);

export default router;
