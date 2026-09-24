const express = require('express');
const familyController = require('../controllers/family.controller');
const authenticate = require('../middlewares/authenticate');

const router = express.Router();

// Internal service routes authenticate with the shared service key before user routes.
router.get('/internal/:userId/recipients', authenticate, familyController.listRecipientIds);
router.get('/internal/:userId/elderly', authenticate, familyController.listLinkedElderly);
router.use(authenticate);
router.get('/connections', familyController.listConnections);
router.post('/connections', familyController.createConnection);
router.patch('/connections/:id', familyController.updateConnection);
router.get('/linked-elderly', familyController.listLinkedElderly);

module.exports = router;
