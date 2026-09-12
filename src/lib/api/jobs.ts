/**
 * OWNER: Dev A (data/auth)
 *
 * snake_case (DB) -> camelCase (app) conversion happens HERE and nowhere else.
 * Every call must do `if (error) throw error` - supabase-js does not throw on its own,
 * and skipping it turns failures into silent blank screens.
 */
import type { Job, Review } from '@/types';

/**
 * TODO(A): jobs the user has NOT swiped yet (home deck).
 *
 * 1) select job_id from swipes            (RLS returns only my rows)
 * 2) select * from jobs where id not in (...)  limit 20
 *
 * GOTCHA: when the swipe list is EMPTY, `.not('id','in','()')` is a SQL syntax error.
 * Branch on it and skip .not() entirely. This fires on the very first screen
 * a newly signed-up user sees.
 */
export async function fetchDeckJobs(): Promise<Job[]> {
  throw new Error('TODO(A): not implemented');
}

/** TODO(A): job_reviews for one job, newest first, limit 3. */
export async function fetchReviews(_jobId: string): Promise<Review[]> {
  throw new Error('TODO(A): not implemented');
}
