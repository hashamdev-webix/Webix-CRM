// Cron job runner — imported once at app startup via instrumentation.js
// Runs cron jobs server-side inside Next.js

let cronStarted = false;

export async function startCronJobs() {
  if (cronStarted) return;
  cronStarted = true;

  // Only run in server environment
  if (typeof window !== 'undefined') return;

  const cron = (await import('node-cron')).default;
  const { syncMetaLeads, syncMetaMetrics } = await import('./meta-api.js');
  const { syncGoogleLeads, syncGoogleMetrics } = await import('./google-ads-api.js');

  console.log('[CRON] Starting cron jobs...');

  // Sync Meta leads every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    console.log('[CRON] Syncing Meta leads...');
    try {
      const result = await syncMetaLeads();
      console.log('[CRON] Meta leads sync:', result);
    } catch (err) {
      console.error('[CRON] Meta leads sync error:', err.message);
    }
  });

  // Sync Google leads every 10 minutes (offset by 5 min)
  cron.schedule('5,15,25,35,45,55 * * * *', async () => {
    console.log('[CRON] Syncing Google leads...');
    try {
      const result = await syncGoogleLeads();
      console.log('[CRON] Google leads sync:', result);
    } catch (err) {
      console.error('[CRON] Google leads sync error:', err.message);
    }
  });

  // Sync Meta ad metrics every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('[CRON] Syncing Meta metrics...');
    try {
      const result = await syncMetaMetrics();
      console.log('[CRON] Meta metrics sync:', result);
    } catch (err) {
      console.error('[CRON] Meta metrics sync error:', err.message);
    }
  });

  // Sync Google ad metrics every 15 minutes
  cron.schedule('7,22,37,52 * * * *', async () => {
    console.log('[CRON] Syncing Google metrics...');
    try {
      const result = await syncGoogleMetrics();
      console.log('[CRON] Google metrics sync:', result);
    } catch (err) {
      console.error('[CRON] Google metrics sync error:', err.message);
    }
  });

  console.log('[CRON] All cron jobs scheduled.');
}
