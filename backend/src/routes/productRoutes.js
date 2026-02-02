const router = require("express").Router();
const {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const { auth, isAdmin } = require("../middleware/auth");

router.get("/", listProducts);
router.get("/:id", getProduct);

// admin only
router.post("/", auth, isAdmin, createProduct);
router.patch("/:id", auth, isAdmin, updateProduct);
router.delete("/:id", auth, isAdmin, deleteProduct);

module.exports = router;