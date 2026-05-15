import { Request, Response } from "express";
import leadService from "./lead.service";
import { httpResponse } from "../../lib/http-response";
import {
  LeadCreateInput,
  LeadUpdateInput,
} from "../../../generated/prisma/models/Lead";
import {
  validateCreateLead,
  validateUpdateLead,
  validateLeadIdParam,
  validateLeadQuery,
} from "./lead.validation";

class LeadController {
  async getLead(req: Request, res: Response) {
    try {
      const { errors, data: params } = validateLeadIdParam(req.params);
      if (errors) {
        return httpResponse.badRequest(res, "Validation failed", errors);
      }

      const lead = await leadService.findById(params!.id);
      if (!lead) {
        return httpResponse.notFound(res, "Lead not found");
      }

      return httpResponse.ok(res, lead, "Lead retrieved successfully");
    } catch (error) {
      console.error("Server error in getLead", error);
      return httpResponse.internalError(res, "Server error in getLead");
    }
  }

  async getAllLeads(req: Request, res: Response) {
    try {
      const { errors: queryErrors, data: query } = validateLeadQuery(req.query);
      if (queryErrors) {
        return httpResponse.badRequest(res, "Validation failed", queryErrors);
      }

      const result = await leadService.findAllFiltered(query!);
      return httpResponse.ok(res, result, "Leads retrieved successfully");
    } catch (error) {
      console.error("Server error in getAllLeads", error);
      return httpResponse.internalError(res, "Server error in getAllLeads");
    }
  }

  async createLead(req: Request, res: Response) {
    try {
      const { errors, data } = validateCreateLead(req.body);
      if (errors) {
        return httpResponse.badRequest(res, "Validation failed", errors);
      }

      const lead = await leadService.create(data! as LeadCreateInput);
      return httpResponse.created(res, lead, "Lead created successfully");
    } catch (error) {
      console.error("Server error in createLead", error);
      return httpResponse.internalError(res, "Server error in createLead");
    }
  }

  async updateLead(req: Request, res: Response) {
    try {
      const { errors: paramErrors, data: params } = validateLeadIdParam(
        req.params,
      );
      if (paramErrors) {
        return httpResponse.badRequest(res, "Validation failed", paramErrors);
      }

      const { errors: bodyErrors, data } = validateUpdateLead(req.body);
      if (bodyErrors) {
        return httpResponse.badRequest(res, "Validation failed", bodyErrors);
      }

      const existing = await leadService.findById(params!.id);
      if (!existing) {
        return httpResponse.notFound(res, "Lead not found");
      }

      const lead = await leadService.update(
        params!.id,
        data! as LeadUpdateInput,
      );
      return httpResponse.ok(res, lead, "Lead updated successfully");
    } catch (error) {
      console.error("Server error in updateLead", error);
      return httpResponse.internalError(res, "Server error in updateLead");
    }
  }

  async deleteLead(req: Request, res: Response) {
    try {
      const { errors, data: params } = validateLeadIdParam(req.params);
      if (errors) {
        return httpResponse.badRequest(res, "Validation failed", errors);
      }

      const existing = await leadService.findById(params!.id);
      if (!existing) {
        return httpResponse.notFound(res, "Lead not found");
      }

      await leadService.delete(params!.id);
      return httpResponse.ok(res, null, "Lead deleted successfully");
    } catch (error) {
      console.error("Server error in deleteLead", error);
      return httpResponse.internalError(res, "Server error in deleteLead");
    }
  }
}

export default new LeadController();
