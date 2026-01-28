const { Order, OrderItem, Cart, CartItem, Product } = require('../models');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
  try {
    // Get user's cart
    const cart = await Cart.findOne({
      where: { user_id: req.user.id },
      include: [{ model: CartItem, include: [Product] }]
    });

    if (!cart || cart.CartItems.length === 0) {
      return res.status(400).json({ message: 'No items in cart' });
    }

    // Calculate total and prepare order items
    let total_amount = 0;
    const orderItemsData = [];

    for (const item of cart.CartItems) {
      const price = parseFloat(item.Product.price);
      total_amount += price * item.quantity;
      
      orderItemsData.push({
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_purchase: price
      });
    }

    // Create Order
    const order = await Order.create({
      user_id: req.user.id,
      total_amount: total_amount,
      status: 'pending'
    });

    // Create Order Items
    for (const itemData of orderItemsData) {
      await OrderItem.create({
        ...itemData,
        order_id: order.id
      });
    }

    // Clear Cart
    await CartItem.destroy({ where: { cart_id: cart.id } });

    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders
// @access  Private
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { user_id: req.user.id },
      include: [{ model: OrderItem, include: [Product] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createOrder, getMyOrders };
