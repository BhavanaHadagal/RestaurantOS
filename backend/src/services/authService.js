const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const config = require('../config');
const prisma = require('../config/database');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');

const generateTokens = (userId, role) => {
  const payload = { userId, role };
  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
  const refreshToken = jwt.sign({ userId, role }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
  return { accessToken, refreshToken };
};

const hashPassword = async (password) => bcrypt.hash(password, 12);

const comparePassword = async (password, hash) => bcrypt.compare(password, hash);

const sendResetEmail = async (email, resetToken) => {
  if (!config.smtp.host || !config.smtp.user) {
    logger.warn('SMTP not configured, reset token logged for dev', { email, resetToken });
    return;
  }

  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
  });

  const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from: config.smtp.from,
    to: email,
    subject: 'RestaurantOS - Password Reset',
    html: `
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>This link expires in 1 hour.</p>
    `,
  });
};

const login = async (email, password) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  });

  if (!user || !user.isActive) {
    throw new AppError('Invalid email or password', 401);
  }

  const isValid = await comparePassword(password, user.password);
  if (!isValid) {
    throw new AppError('Invalid email or password', 401);
  }

  const tokens = generateTokens(user.id, user.role.name);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: tokens.refreshToken },
  });

  logger.info('User logged in', { userId: user.id, email });

  const { password: _, refreshToken: __, ...userWithoutSensitive } = user;
  return {
    user: {
      ...userWithoutSensitive,
      permissions: user.role.permissions.map((rp) => rp.permission.name),
    },
    ...tokens,
  };
};

const refreshAccessToken = async (refreshToken) => {
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
  } catch {
    throw new AppError('Invalid refresh token', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: { role: true },
  });
  if (!user || user.refreshToken !== refreshToken) {
    throw new AppError('Invalid refresh token', 401);
  }

  const tokens = generateTokens(user.id, user.role.name);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: tokens.refreshToken },
  });

  return tokens;
};

const logout = async (userId) => {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
  logger.info('User logged out', { userId });
};

const forgotPassword = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { message: 'If the email exists, a reset link has been sent' };
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetExpires = new Date(Date.now() + 3600000);

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetExpires },
  });

  await sendResetEmail(email, resetToken);
  logger.info('Password reset requested', { email });

  return { message: 'If the email exists, a reset link has been sent' };
};

const resetPassword = async (token, newPassword) => {
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetExpires: { gt: new Date() },
    },
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
      resetToken: null,
      resetExpires: null,
    },
  });

  logger.info('Password reset completed', { userId: user.id });
  return { message: 'Password reset successful' };
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);

  const isValid = await comparePassword(currentPassword, user.password);
  if (!isValid) throw new AppError('Current password is incorrect', 400);

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });

  logger.info('Password changed', { userId });
  return { message: 'Password changed successfully' };
};

const register = async ({ email, password, firstName, lastName, phone, restaurantName }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Email already registered', 409);

  const ownerRole = await prisma.role.findUnique({ where: { name: 'Owner' } });
  if (!ownerRole) throw new AppError('Registration unavailable', 503);

  const hashed = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      firstName,
      lastName,
      phone: phone || null,
      restaurantName: restaurantName?.trim() || null,
      roleId: ownerRole.id,
    },
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  });

  const tokens = generateTokens(user.id, user.role.name);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: tokens.refreshToken },
  });

  logger.info('User registered', { userId: user.id, email, restaurantName });

  const { password: _, refreshToken: __, ...userWithoutSensitive } = user;
  return {
    user: {
      ...userWithoutSensitive,
      permissions: user.role.permissions.map((rp) => rp.permission.name),
    },
    ...tokens,
  };
};

module.exports = {
  generateTokens,
  hashPassword,
  comparePassword,
  login,
  register,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
};
