export async function register() {
  // Only run in Node.js server environment (not Edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startCronJobs } = await import('./lib/cron.js');
    await startCronJobs();
  }
}
