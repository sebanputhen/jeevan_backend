const express = require('express');
const router = express.Router();
const projectSettingsController = require('../controllers/projectSettingsController');

router.get('/', projectSettingsController.getAll);
router.get('/year/:year', projectSettingsController.getByYear);
router.post('/bulk', projectSettingsController.saveBulkSettings);
router.put('/:id', projectSettingsController.updateSetting);
router.delete('/:id', projectSettingsController.deleteSetting);

module.exports = router;