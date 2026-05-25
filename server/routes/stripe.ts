import { Router, raw, json } from 'express';
import { createIntent, webhook } from '../controllers/stripeController.js';

const router = Router();

// Webhook must receive raw body for signature verification (registered before global express.json())
router.post('/webhook', raw({ type: 'application/json' }), webhook);
// create-intent needs JSON parsing — applied here because global express.json() runs after this router
router.post('/create-intent', json(), createIntent);

export default router;
