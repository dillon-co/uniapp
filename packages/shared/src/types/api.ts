export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    cursor: string | null;
    hasMore: boolean;
    total?: number;
  };
}
