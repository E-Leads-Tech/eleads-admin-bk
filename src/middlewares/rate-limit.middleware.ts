import rateLimit from "express-rate-limit";

/**
 * Strict limiter for authentication endpoints.
 * Prevents brute-force attacks on sign-in, sign-up and token refresh.
 * 10 requests per 15-minute window per IP.
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

/**
 * Strict limiter for the resend confirmation code endpoint.
 * 5 requests per 15-minute window per IP.
 */
export const resendCodeRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many resend attempts, please try again later.",
  },
});
