import { formatDate } from "@/lib/utils";

export const OWNER_SUBMISSIONS_PAGE_SIZE = 12;
export const OWNER_SUBMISSIONS_MAX_PAGE_SIZE = 24;

export type OwnerSubmissionListItem = {
  id: string;
  type: "DRAWING" | "VOICE";
  imageUrl: string | null;
  audioUrl: string | null;
  audioPreset: string | null;
  note: string | null;
  createdAtLabel: string;
};

export function mapOwnerSubmission(submission: {
  id: string;
  type: "DRAWING" | "VOICE";
  imageUrl: string | null;
  audioUrl: string | null;
  audioPreset: string | null;
  note: string | null;
  createdAt: Date | string;
}): OwnerSubmissionListItem {
  return {
    id: submission.id,
    type: submission.type,
    imageUrl: submission.imageUrl,
    audioUrl: submission.audioUrl,
    audioPreset: submission.audioPreset,
    note: submission.note,
    createdAtLabel: formatDate(submission.createdAt),
  };
}