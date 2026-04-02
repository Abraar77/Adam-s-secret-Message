import { formatDate } from "@/lib/utils";

export const OWNER_SUBMISSIONS_PAGE_SIZE = 12;
export const OWNER_SUBMISSIONS_MAX_PAGE_SIZE = 24;

export type OwnerSubmissionListItem = {
  id: string;
  imageUrl: string;
  note: string | null;
  createdAtLabel: string;
};

export function mapOwnerSubmission(
  submission: { id: string; imageUrl: string; note: string | null; createdAt: Date | string }
): OwnerSubmissionListItem {
  return {
    id: submission.id,
    imageUrl: submission.imageUrl,
    note: submission.note,
    createdAtLabel: formatDate(submission.createdAt),
  };
}
