/**
 * OWNER: Dev A (data/auth)
 *
 * This is the ONLY thing Dev B calls to get deck data.
 * queryKey: ['jobs'] - do not invalidate it after a swipe. The card is already
 * removed optimistically, and refetching makes the deck flicker.
 *
 * TODO(A): return { jobs, isLoading, isError, swipe(jobId, direction) }
 */
export function useDeck() {
  throw new Error('TODO(A): not implemented');
}
