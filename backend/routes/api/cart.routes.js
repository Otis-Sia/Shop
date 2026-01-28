const express = require('express');
const router = express.Router();
const { getCart, addToCart, deleteItem } = require('../../controllers/cart.controller');
const { protect } = require('../../middleware/auth');

router.use(protect); // All cart routes require login

router.get('/', getCart);
router.post('/', addToCart);
router.delete('/items/:productId', deleteItem);

module.exports = router;
