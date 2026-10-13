import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  getCustomerStats,
} from '../controllers/customers.controller';

const router = Router();

router.get('/', getCustomers);
router.get('/stats', getCustomerStats);
router.get('/:id', getCustomerById);

export default router;
