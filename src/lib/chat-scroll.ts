/** Never call scrollIntoView() for a chat in a modal. That method may
 * scroll the entire document behind the modal on mobile Safari. */
export function scrollChatToBottom(list: Pick<HTMLElement, 'scrollTop' | 'scrollHeight'> | null) {
  if (list) list.scrollTop = list.scrollHeight;
}

/** Don't drag someone away from older messages while they are reading. */
export function chatIsNearBottom(
  list: Pick<HTMLElement, 'scrollTop' | 'scrollHeight' | 'clientHeight'>,
  thresholdPx = 100,
) {
  return list.scrollHeight - list.scrollTop - list.clientHeight < thresholdPx;
}
