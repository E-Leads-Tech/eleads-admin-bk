import { Request, Response } from "express";
import userLeadService from "./user-lead.service";
import { httpResponse } from "../../lib/http-response";
import { UserLeadUncheckedUpdateInput } from "../../../generated/prisma/models/UserLead";
import {
  validateCreateUserLead,
  validateUpdateUserLead,
  validateUserLeadIdParam,
  validateUserIdParam,
  validateUserLeadQuery,
} from "./lead.validation";

class UserLeadController {
  async getUserLead(req: Request, res: Response) {
    try {
      const { errors, data: params } = validateUserLeadIdParam(req.params);
      if (errors) {
        return httpResponse.badRequest(res, "Validation failed", errors);
      }

      const userLead = await userLeadService.findById(params!.id);
      if (!userLead) {
        return httpResponse.notFound(res, "UserLead not found");
      }

      return httpResponse.ok(res, userLead, "UserLead retrieved successfully");
    } catch (error) {
      console.error("Server error in getUserLead", error);
      return httpResponse.internalError(res, "Server error in getUserLead");
    }
  }

  async getUserLeadsByUserId(req: Request, res: Response) {
    try {
      const { errors: paramErrors, data: params } = validateUserIdParam(
        req.params,
      );
      if (paramErrors) {
        return httpResponse.badRequest(res, "Validation failed", paramErrors);
      }

      const { errors: queryErrors, data: query } = validateUserLeadQuery(
        req.query,
      );
      if (queryErrors) {
        return httpResponse.badRequest(res, "Validation failed", queryErrors);
      }

      const result = await userLeadService.findAllByUserId(
        params!.userId,
        query!,
      );
      return httpResponse.ok(res, result, "UserLeads retrieved successfully");
    } catch (error) {
      console.error("Server error in getUserLeadsByUserId", error);
      return httpResponse.internalError(
        res,
        "Server error in getUserLeadsByUserId",
      );
    }
  }

  async createUserLead(req: Request, res: Response) {
    try {
      const { errors, data } = validateCreateUserLead(req.body);
      if (errors) {
        return httpResponse.badRequest(res, "Validation failed", errors);
      }

      const userLead = await userLeadService.create(data!);
      return httpResponse.created(
        res,
        userLead,
        "UserLead created successfully",
      );
    } catch (error) {
      console.error("Server error in createUserLead", error);
      return httpResponse.internalError(res, "Server error in createUserLead");
    }
  }

  async updateUserLead(req: Request, res: Response) {
    try {
      const { errors: paramErrors, data: params } = validateUserLeadIdParam(
        req.params,
      );
      if (paramErrors) {
        return httpResponse.badRequest(res, "Validation failed", paramErrors);
      }

      const { errors: bodyErrors, data } = validateUpdateUserLead(req.body);
      if (bodyErrors) {
        return httpResponse.badRequest(res, "Validation failed", bodyErrors);
      }

      const existing = await userLeadService.findById(params!.id);
      if (!existing) {
        return httpResponse.notFound(res, "UserLead not found");
      }

      const userLead = await userLeadService.update(
        params!.id,
        data! as UserLeadUncheckedUpdateInput,
      );
      return httpResponse.ok(res, userLead, "UserLead updated successfully");
    } catch (error) {
      console.error("Server error in updateUserLead", error);
      return httpResponse.internalError(res, "Server error in updateUserLead");
    }
  }

  async deleteUserLead(req: Request, res: Response) {
    try {
      const { errors, data: params } = validateUserLeadIdParam(req.params);
      if (errors) {
        return httpResponse.badRequest(res, "Validation failed", errors);
      }

      const existing = await userLeadService.findById(params!.id);
      if (!existing) {
        return httpResponse.notFound(res, "UserLead not found");
      }

      await userLeadService.delete(params!.id);
      return httpResponse.ok(res, null, "UserLead deleted successfully");
    } catch (error) {
      console.error("Server error in deleteUserLead", error);
      return httpResponse.internalError(res, "Server error in deleteUserLead");
    }
  }
}

export default new UserLeadController();
