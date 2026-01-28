const fs = require("fs");
const path = require("path");

const dirs = [
  "public/assets/images/products",
  "public/assets/images/categories",
  "public/assets/images/banners",
  "public/assets/images/logos",
  "public/assets/icons",
  "public/assets/fonts",
  "src/client/css/base",
  "src/client/css/components",
  "src/client/css/layout",
  "src/client/css/pages",
  "src/client/js/lib",
  "src/client/js/utils",
  "src/client/js/api",
  "src/client/js/components",
  "src/client/js/pages",
  "src/client/html/partials",
  "src/client/html/pages",
  "src/server/config",
  "src/server/models",
  "src/server/routes/api",
  "src/server/controllers",
  "src/server/middleware",
  "src/server/services",
  "src/server/utils",
  "src/server/database/migrations",
  "src/server/database/seeds",
  "src/server/database/queries",
  "src/shared",
  "tests/client",
  "tests/server",
  "tests/integration",
  "docs",
  "scripts",
];

dirs.forEach((dir) => {
  const fullPath = path.join(__dirname, "..", dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Created: ${dir}`);
  } else {
    console.log(`Exists: ${dir}`);
  }
});
