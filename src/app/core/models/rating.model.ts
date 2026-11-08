export interface RatingHighlight {
  code: string;
  label: string;
  positive: boolean;
}

export interface ReceivedHighlight extends RatingHighlight {
  total: number;
}

export interface RatingSummary {
  average: number | null;
  total: number;
  highlights: ReceivedHighlight[];
}

export interface PendingRating {
  attendanceId: string;
  requestId: string;
  service: string;
  ratedName?: string;
  start: string;
  end: string;
  deadline: string;
}

export interface PendingRatings {
  pending: PendingRating[];
  highlights: RatingHighlight[];
}

export interface RatingInput {
  score: number;
  highlights: string[];
}
