import { Router } from "express";
import controller from "./auth.controller";
import {
  authRateLimit,
  resendCodeRateLimit,
} from "../../middlewares/rate-limit.middleware";

const router = Router();

router.post("/sign-up", authRateLimit, controller.signUp);
router.post("/confirm-sign-up", authRateLimit, controller.confirmSignUp);
router.post("/resend-code", resendCodeRateLimit, controller.resendCode);
router.post("/sign-in", authRateLimit, controller.signIn);
router.post("/refresh-token", authRateLimit, controller.refreshToken);

export default router;
