require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
// 1. คอมเมนต์การเรียกใช้ cors
// const cors = require('cors'); 
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const familyRoutes = require('./routes/family.routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(helmet());

// 2. คอมเมนต์ Middleware cors ออก เพื่อให้ Nginx เป็นคนจัดการแทนทั้งหมด
/*
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
*/

app.use(express.json());

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000),
  max: Number(process.env.RATE_LIMIT_MAX || 100),
});
app.use(limiter);

// Health check — ใช้โดย Docker HEALTHCHECK
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'auth-service' });
});

// รับ Route โดยไม่ต้องมี Prefix เพราะ Gateway ตัด /auth ออกให้แล้ว
app.use('/', authRoutes);
app.use('/family', familyRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

app.use(errorHandler);

module.exports = app;