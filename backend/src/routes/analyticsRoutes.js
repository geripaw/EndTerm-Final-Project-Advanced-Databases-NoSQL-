const router = require("express").Router();
const { auth, isAdmin } = require("../middleware/auth");
const {
  topProducts,
  revenueByCountry,
  revenueByMonth,
} = require("../controllers/analyticsController");


router.get("/top-products", auth, isAdmin, topProducts);
router.get("/revenue-by-country", auth, isAdmin, revenueByCountry);
router.get("/revenue-by-month", auth, isAdmin, revenueByMonth);

module.exports = router;
