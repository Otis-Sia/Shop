const { sequelize, Category, Product } = require('../src/server/models');

const seedData = async () => {
  try {
    await sequelize.sync({ force: true }); // WARNING: This clears DB

    const categories = await Category.bulkCreate([
      { name: 'Electronics', description: 'Gadgets and devices', slug: 'electronics' },
      { name: 'Clothing', description: 'Apparel and fashion', slug: 'clothing' },
      { name: 'Books', description: 'Readables', slug: 'books' },
    ]);

    const products = await Product.bulkCreate([
      {
        name: 'Smartphone X',
        description: 'Latest model with high-res camera',
        price: 999.99,
        stock: 50,
        category_id: categories[0].id,
        image_url: '/assets/images/products/phone.jpg'
      },
      {
        name: 'Laptop Pro',
        description: 'Powerful laptop for developers',
        price: 1499.99,
        stock: 30,
        category_id: categories[0].id,
        image_url: '/assets/images/products/laptop.jpg'
      },
      {
        name: 'T-Shirt',
        description: 'Cotton basic tee',
        price: 19.99,
        stock: 100,
        category_id: categories[1].id,
        image_url: '/assets/images/products/tshirt.jpg'
      }
    ]);

    console.log('Data seeded successfully');
    process.exit();
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
