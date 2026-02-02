async function me(req, res) {
  
  return res.json({
    id: req.user._id,
    email: req.user.email,
    role: req.user.role,
    country: req.user.country || "",
  });
}

module.exports = { me };
