/** API error object from backend: { error: { code, message } } */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

/**
 * Lỗi từ API gateway / backend service.
 * Dùng `code` để map sang UX message, không dùng raw `message`.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** Parse response body thành ApiError nếu có, fallback về statusText */
export const toApiError = async (res: Response): Promise<ApiError> => {
  try {
    const body = (await res.json()) as ApiErrorBody;
    return new ApiError(res.status, body.error.code, body.error.message);
  } catch {
    return new ApiError(res.status, 'UNKNOWN', res.statusText || 'Unknown error');
  }
};
