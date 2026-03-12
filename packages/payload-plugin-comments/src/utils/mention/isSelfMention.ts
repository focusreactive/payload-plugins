type UserId = number | string | null | undefined;

export function isSelfMention(currentUserId: UserId, userId: UserId) {
  return currentUserId != null && userId === currentUserId;
}
