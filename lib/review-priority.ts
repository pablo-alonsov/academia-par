/** A correct final number does not review the reasoning or a written question. */
export function requiresWrittenReview(response: Record<string, any>, activity?: Record<string, any>) {
  return Boolean(
    !response.autoResult ||
    response.kind === 'resource-use' ||
    ['open','paper','external'].includes(activity?.type) ||
    Object.values(response.procedure || {}).some(value => typeof value === 'string' && value.trim()) ||
    (typeof response.comment === 'string' && response.comment.trim())
  );
}
