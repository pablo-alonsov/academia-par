type Item = Record<string, any>;
export const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024;
export const PROFILE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Avatar objects have a separate purpose and storage namespace from classwork. */
export function validAvatarFile(studentId: string, file: Item | null | undefined): boolean {
  return Boolean(file && file.purpose === "avatar" && file.studentId === studentId &&
    PROFILE_PHOTO_TYPES.includes(file.type) && Number.isSafeInteger(file.size) && file.size > 0 && file.size <= MAX_PROFILE_PHOTO_BYTES &&
    /^[a-f0-9]{64}$/.test(file.avatarRevision || "") && typeof file.key === "string" &&
    file.key.startsWith(`avatars/${studentId}/${file.id}/`) && file.detached !== true);
}
export function avatarUrl(student: Item, file: Item | null | undefined): string | undefined {
  if (!validAvatarFile(student.id, file)) return undefined;
  return `/api/profiles/${encodeURIComponent(student.id)}/avatar?v=${file!.avatarRevision}`;
}
