const { Cart, CartItem, Product } = require('../models');

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({
      where: { user_id: req.user.id },
      include: [
        {
          model: CartItem,
          include: [
            {
              model: Product,
              attributes: ['name', 'price', 'image_url']
            }
          ]
        }
      ]
    });

    if (!cart) {
      cart = await Cart.create({ user_id: req.user.id });
      cart.dataValues.CartItems = []; // Return empty items
    }

    res.json(cart);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    let qty = parseInt(quantity) || 1;

    let cart = await Cart.findOne({ where: { user_id: req.user.id } });
    if (!cart) {
      cart = await Cart.create({ user_id: req.user.id });
    }

    // Check if item exists
    let item = await CartItem.findOne({
      where: { cart_id: cart.id, product_id: productId }
    });

    if (item) {
      item.quantity += qty;
      await item.save();
    } else {
      await CartItem.create({
        cart_id: cart.id,
        product_id: productId,
        quantity: qty
      });
    }

    res.status(200).json({ message: 'Item added to cart' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/:itemId
// @access  Private
const removeFromCart = async (req, res) => {
  try {
    // Note: itemId here is the CartItem ID, or ProductId? 
    // Usually easier to delete by ProductId if assuming unique product per cart, or CartItem ID.
    // Let's assume params.id is productId for better UX from frontend (don't need to know cartItem ID)
    // OR params.id is CartItemID. 
    // Let's use ProductID for "Remove this product".
    
    // Actually, RESTful usually implies Resource ID. But simpler for Client to pass ProductID.
    // I'll check if it matches UUID format of CartItem or Product. 
    // I'll stick to: DELETE /api/cart/items/:productId
    
    // Wait, route is /api/cart/:id. I'll make it /api/cart/item/:productId
    
    return res.status(400).json({ message: 'Use specific route /api/cart/items/:productId' });

  } catch (error) {
     res.status(500).json({ message: 'Server error' });
  }
};

const deleteItem = async (req, res) => {
  try {
    const cart = await Cart.findOne({ where: { user_id: req.user.id } });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    await CartItem.destroy({
      where: { cart_id: cart.id, product_id: req.params.productId }
    });

    res.json({ message: 'Item removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getCart,
  addToCart,
  deleteItem
};
