const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.json({ success: true, data: result });
});

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json({ success: true, data: result });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const tokens = await authService.refreshAccessToken(refreshToken);
  res.json({ success: true, data: tokens });
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.id);
  res.json({ success: true, message: 'Logged out successfully' });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);
  res.json({ success: true, ...result });
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body.token, req.body.password);
  res.json({ success: true, ...result });
});

const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(
    req.user.id,
    req.body.currentPassword,
    req.body.newPassword
  );
  res.json({ success: true, ...result });
});

const getProfile = asyncHandler(async (req, res) => {
  const { password, refreshToken, resetToken, resetExpires, ...user } = req.user;
  res.json({
    success: true,
    data: {
      ...user,
      permissions: req.permissions,
    },
  });
});

module.exports = {
  login,
  register,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
};
