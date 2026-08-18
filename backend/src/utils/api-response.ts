import type { Response } from "express";

type SuccessBody<TData> = {
  success: true;
  message: string;
  data: TData;
};

type ErrorBody = {
  success: false;
  message: string;
  error: {
    code: string;
  };
};

export function sendSuccess<TData>(
  response: Response,
  message: string,
  data: TData,
  statusCode = 200
): Response<SuccessBody<TData>> {
  return response.status(statusCode).json({
    success: true,
    message,
    data
  });
}

export function sendError(
  response: Response,
  message: string,
  code: string,
  statusCode = 500
): Response<ErrorBody> {
  return response.status(statusCode).json({
    success: false,
    message,
    error: {
      code
    }
  });
}
