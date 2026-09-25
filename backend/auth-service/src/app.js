require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const passwordResetRoutes = require('./routes/password-reset.routes');
const familyRoutes = require('./routes/family.routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8080',
  'https://aha-frontend-production.up.railway.app',
  'https://aha.up.railway.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '32kb' }));

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000),
  max: Number(process.env.RATE_LIMIT_MAX || 100),
});
app.use(limiter);

app.get('/health', (req, res) => res.status(200).json({ status: 'ok', service: 'auth-service' }));
app.use('/auth', authRoutes);
app.use('/auth', passwordResetRoutes);
app.use('/family', familyRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));
app.use(errorHandler);

module.exports = app;
