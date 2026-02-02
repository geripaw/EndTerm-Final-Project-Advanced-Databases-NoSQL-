const router = require("express").Router();
const { auth, isAdmin } = require("../middleware/auth");

const {
  createOrder,
  listOrders,
  getOrder,
  addItem,
  removeItem,
  updateStatus,
  deleteOrder,
} = require("../controllers/orderController");

// all orders routes require auth
router.use(auth);

router.post("/", createOrder);
router.get("/", listOrders);
router.get("/:id", getOrder);

router.patch("/:id/items", addItem);
router.delete("/:id/items/:productId", removeItem);

router.patch("/:id/status", updateStatus);

// admin only
router.delete("/:id", isAdmin, deleteOrder);

module.exports = router;
