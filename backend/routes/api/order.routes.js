const express = require('express');
const router = express.Router();
const { createOrder, getMyOrders } = require('../../controllers/order.controller');
const { protect } = require('../../middleware/auth');

router.post('/', protect, createOrder);
router.get('/', protect, getMyOrders);

module.exports = router;
