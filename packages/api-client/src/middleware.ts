/**
 * Middleware xử lý request trước khi gửi.
 * Có thể mutate url, headers, body... (vd: inject token, log, thêm tracing header).
 *
 * @returns [url, init] đã được transform (có thể async)
 */
export type RequestMiddleware = (
  url: string,
  init: RequestInit,
) => [string, RequestInit] | Promise<[string, RequestInit]>;

/**
 * Middleware xử lý response sau khi nhận.
 * (vd: refresh token khi 401, log error, parse custom format).
 *
 * @returns Response đã được transform (có thể async)
 */
export type ResponseMiddleware = (res: Response) => Response | Promise<Response>;

//--------------------------------------------------------------------------------------------------
// Middleware chains
//--------------------------------------------------------------------------------------------------

/** Chạy pipeline request middleware tuần tự */
export const applyRequestMiddleware = async (
  url: string,
  init: RequestInit,
  middlewares: readonly RequestMiddleware[],
): Promise<[string, RequestInit]> => {
  let currentUrl = url;
  let currentInit = init;
  for (const mw of middlewares) {
    [currentUrl, currentInit] = await mw(currentUrl, currentInit);
  }
  return [currentUrl, currentInit];
};

/** Chạy pipeline response middleware tuần tự */
export const applyResponseMiddleware = async (
  res: Response,
  middlewares: readonly ResponseMiddleware[],
): Promise<Response> => {
  let current = res;
  for (const mw of middlewares) {
    current = await mw(current);
  }
  return current;
};
