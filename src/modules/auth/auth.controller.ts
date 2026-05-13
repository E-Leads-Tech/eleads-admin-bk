import { Request, Response } from "express";
import { httpResponse } from "../../lib/http-response";
import authService, { AuthError } from "./auth.service";
import {
  validateConfirmSignUp,
  validateRefreshToken,
  validateResendCode,
  validateSignIn,
  validateSignUp,
} from "./auth.validation";

class AuthController {
  async signUp(req: Request, res: Response) {
    try {
      const { errors, data } = validateSignUp(req.body);

      if (errors) {
        return httpResponse.badRequest(res, "Validation failed", errors);
      }

      const user = await authService.signUp(data!);
      return httpResponse.created(res, user, "User registered successfully");
    } catch (error) {
      if (error instanceof AuthError) {
        switch (error.code) {
          case "EMAIL_EXISTS":
            return httpResponse.conflict(res, error.message);
          case "COMPANY_NOT_FOUND":
            return httpResponse.notFound(res, error.message);
          case "COGNITO_ERROR":
            return httpResponse.badRequest(res, error.message);
          case "HUBSPOT_ERROR":
            return httpResponse.internalError(res, error.message);
          default:
            return httpResponse.internalError(res, error.message);
        }
      }

      console.error("[signUp] Unexpected error:", error);
      return httpResponse.internalError(res, "Server error");
    }
  }

  async confirmSignUp(req: Request, res: Response) {
    try {
      const { errors, data } = validateConfirmSignUp(req.body);

      if (errors) {
        return httpResponse.badRequest(res, "Validation failed", errors);
      }

      await authService.confirmSignUp(data!);
      return httpResponse.ok(res, null, "Email confirmed successfully");
    } catch (error) {
      if (error instanceof AuthError) {
        return httpResponse.badRequest(res, error.message);
      }

      console.error("[confirmSignUp] Unexpected error:", error);
      return httpResponse.internalError(res, "Server error");
    }
  }

  async resendCode(req: Request, res: Response) {
    try {
      const { errors, data } = validateResendCode(req.body);

      if (errors) {
        return httpResponse.badRequest(res, "Validation failed", errors);
      }

      await authService.resendCode(data!.email);
      return httpResponse.ok(
        res,
        null,
        "Confirmation code resent successfully",
      );
    } catch (error) {
      if (error instanceof AuthError) {
        return httpResponse.badRequest(res, error.message);
      }

      console.error("[resendCode] Unexpected error:", error);
      return httpResponse.internalError(res, "Server error");
    }
  }

  async signIn(req: Request, res: Response) {
    try {
      const { errors, data } = validateSignIn(req.body);

      if (errors) {
        return httpResponse.badRequest(res, "Validation failed", errors);
      }

      const tokens = await authService.signIn(data!);
      return httpResponse.ok(res, tokens, "Signed in successfully");
    } catch (error) {
      if (error instanceof AuthError) {
        return httpResponse.unauthorized(res, error.message);
      }

      console.error("[signIn] Unexpected error:", error);
      return httpResponse.internalError(res, "Server error");
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const { errors, data } = validateRefreshToken(req.body);

      if (errors) {
        return httpResponse.badRequest(res, "Validation failed", errors);
      }

      const tokens = await authService.refreshToken(data!.refreshToken);
      return httpResponse.ok(res, tokens, "Token refreshed successfully");
    } catch (error) {
      if (error instanceof AuthError) {
        return httpResponse.unauthorized(res, error.message);
      }

      console.error("[refreshToken] Unexpected error:", error);
      return httpResponse.internalError(res, "Server error");
    }
  }
}

export default new AuthController();
