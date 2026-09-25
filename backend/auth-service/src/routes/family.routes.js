const express = require('express');
const familyController = require('../controllers/family.controller');
const authenticate = require('../middlewares/authenticate');

const router = express.Router();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.param('id', (req, res, next, value) => UUID_PATTERN.test(value)
  ? next()
  : res.status(400).json({ success: false, message: 'Invalid id' }));
router.param('userId', (req, res, next, value) => UUID_PATTERN.test(value)
  ? next()
  : res.status(400).json({ success: false, message: 'Invalid user id' }));

function requireSystem(req, res, next) {
  if (req.user?.role !== 'system') return res.status(403).json({ success: false, message: 'Internal service access only' });
  return next();
}

// Internal service routes authenticate with the shared service key before user routes.
router.get('/internal/:userId/recipients', authenticate, requireSystem, familyController.listRecipientIds);
router.get('/internal/:userId/elderly', authenticate, requireSystem, familyController.listLinkedElderly);
router.use(authenticate);
router.get('/connections', familyController.listConnections);
router.post('/connections', familyController.createConnection);
router.patch('/connections/:id', familyController.updateConnection);
router.get('/linked-elderly', familyController.listLinkedElderly);

module.exports = router;
