const express = require('express');
const familyController = require('../controllers/family.controller');
const authenticate = require('../middlewares/authenticate');

const router = express.Router();

router.use(authenticate);
router.get('/connections', familyController.listConnections);
router.post('/connections', familyController.createConnection);
router.patch('/connections/:id', familyController.updateConnection);

module.exports = router;
