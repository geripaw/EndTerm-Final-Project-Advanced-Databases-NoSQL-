const router = require("express").Router();
const { me } = require("../controllers/userController");
const { auth } = require("../middleware/auth");

router.get("/me", auth, me);

module.exports = router;