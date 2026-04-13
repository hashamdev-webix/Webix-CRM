 // Pure constants — safe to import in both client and server code.
// No Node.js or Mongoose imports here.

export const LOCK_ON_STATUSES = ['active', 'in_progress', 'won'];
export const LOCK_OFF_STATUSES = ['not_interested', 'closed'];
export const ALL_STATUSES = ['new', 'active', 'in_progress', 'not_interested', 'won', 'closed'];
   