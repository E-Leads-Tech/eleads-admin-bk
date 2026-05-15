import { cognitoService } from "../../lib/aws/cognito";
import AuthRepository from "./auth.repository";
import HubspotRepository from "../hubspot/hubspot.repository";
import {
  ConfirmSignUpInput,
  ResendCodeInput,
  SignInInput,
  SignUpInput,
} from "./auth.validation";

class AuthService {
  async signUp(input: SignUpInput) {
    const { name, email, password } = input;

    const existingUser = await AuthRepository.findByEmail(email);
    if (existingUser) {
      throw new AuthError("Email is already registered", "EMAIL_EXISTS");
    }

    const company = await HubspotRepository.searchCompanyByEmail(email);
    if (!company) {
      throw new AuthError(
        "No company associated with this email was found",
        "COMPANY_NOT_FOUND",
      );
    }

    try {
      const cognitoSub = await cognitoService.userSignUp(name, email, password);

      const user = await AuthRepository.create({
        id: cognitoSub,
        name,
        email,
        idCompany: company.id,
      });

      return user;
    } catch (error: unknown) {
      if (error instanceof AuthError) throw error;
      const message =
        error instanceof Error ? error.message : "Cognito sign-up failed";
      throw new AuthError(message, "COGNITO_ERROR");
    }
  }

  async confirmSignUp(input: ConfirmSignUpInput) {
    const { email, confirmationCode } = input;

    try {
      await cognitoService.confirmSignUp(email, confirmationCode);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Confirmation failed";
      throw new AuthError(message, "COGNITO_ERROR");
    }
  }

  async resendCode(email: string) {
    try {
      await cognitoService.resendConfirmationCode(email);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to resend code";
      throw new AuthError(message, "COGNITO_ERROR");
    }
  }

  async signIn(input: SignInInput) {
    const { email, password } = input;

    try {
      const tokens = await cognitoService.signIn(email, password);
      const user = await AuthRepository.findByEmail(email);

      return {
        ...tokens,
        user: user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
              idCompany: user.idCompany,
            }
          : null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Sign in failed";
      throw new AuthError(message, "COGNITO_ERROR");
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const tokens = await cognitoService.refreshToken(refreshToken);
      return tokens;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Token refresh failed";
      throw new AuthError(message, "INVALID_REFRESH_TOKEN");
    }
  }
}

export class AuthError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

export default new AuthService();
