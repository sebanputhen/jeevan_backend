const express = require('express');
const router = express.Router();
const slabController = require('../controllers/slabController');

router.get('/:year', slabController.getSlabs);
router.post('/', slabController.saveSlabs);

module.exports = router;