import { Router } from 'express';
import { authenticate } from '@modules/identity/http/middleware';
import { validate } from '@shared/http/middleware/validate';
import * as ctrl from '../controllers/favorites.controller';
import { addFavoriteSchema, productIdParamSchema } from '../validators/favorites.validation';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.post('/', validate({ body: addFavoriteSchema }), ctrl.add);
router.delete('/:productId', validate({ params: productIdParamSchema }), ctrl.remove);

export default router;
