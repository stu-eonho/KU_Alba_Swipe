/**
 * OWNER: Dev A (data/auth)
 */
import type { SwipeDirection, WishlistEntry } from '@/types';

/**
 * TODO(A): record a swipe.
 *
 * supabase.from('swipes').upsert({ job_id, direction }, { onConflict: 'user_id,job_id' })
 *
 * GOTCHA: upsert, NOT insert. The UNIQUE (user_id, job_id) constraint makes insert
 * fail on any retry or double-tap. Do not send user_id - the column default is auth.uid().
 */
export async function createSwipe(_jobId: string, _direction: SwipeDirection): Promise<void> {
  throw new Error('TODO(A): not implemented');
}

/**
 * TODO(A): wishlist = swipes where direction = 'right', joined with jobs.
 * Use a nested select: .select('job_id, created_at, jobs(*)') - one query, not two.
 */
export async function fetchWishlist(): Promise<WishlistEntry[]> {
  throw new Error('TODO(A): not implemented');
}

/**
 * TODO(A): remove from wishlist.
 *
 * UPDATE direction to 'left'. Do NOT delete the row - deleting makes the job
 * reappear in the home deck, which reads as a bug to the user.
 */
export async function unwishlist(_jobId: string): Promise<void> {
  throw new Error('TODO(A): not implemented');
}

/**
 * TODO(A): delete all my swipes (Settings screen).
 * Build this FIRST among settings items - without it every rehearsal needs a new account.
 */
export async function resetSwipes(_userId: string): Promise<void> {
  throw new Error('TODO(A): not implemented');
}
