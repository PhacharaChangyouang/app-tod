require('dotenv').config();
const app = require('./app');
const { migrate } = require('./config/migrate');

const PORT = process.env.PORT || 3002;

async function start() {
  if (process.env.RUN_MIGRATIONS !== 'false') await migrate();
  app.listen(PORT, () => console.log(`Reminder service listening on ${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start reminder-service', err);
  process.exit(1);
});
