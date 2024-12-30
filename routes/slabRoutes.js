const express = require('express');
const router = express.Router();
const path = require('path');
const slabController = require(path.resolve(__dirname, '../controllers/SlabController'));

router.get('/:year', slabController.getSlabs);
router.post('/', slabController.saveSlabs);  

module.exports = router;