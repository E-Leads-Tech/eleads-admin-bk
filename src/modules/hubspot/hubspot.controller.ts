import { Request, Response } from "express";
import hubspotService from "./hubspot.service";
import { httpResponse } from "../../lib/http-response";
import {
  validateCompanyByEmail,
  validateCompanyIdParam,
  validateCompanyAppointmentsQuery,
} from "./hubspot.validation";

class HubspotController {
  async getCompanyByEmail(req: Request, res: Response) {
    try {
      const { errors, data } = validateCompanyByEmail(req.query);
      if (errors) {
        return httpResponse.badRequest(res, "Validation failed", errors);
      }

      const company = await hubspotService.findCompanyByEmail(data!.email);
      if (!company) {
        return httpResponse.notFound(res, "Company not found for that email");
      }

      return httpResponse.ok(res, company, "Company retrieved successfully");
    } catch (error) {
      console.error("Server error in getCompanyByEmail", error);
      return httpResponse.internalError(
        res,
        "Server error in getCompanyByEmail",
      );
    }
  }

  async getCompanyAppointments(req: Request, res: Response) {
    try {
      const { errors: paramErrors, data: paramData } = validateCompanyIdParam(
        req.params,
      );
      if (paramErrors) {
        return httpResponse.badRequest(res, "Validation failed", paramErrors);
      }

      const { errors: queryErrors, data: queryData } =
        validateCompanyAppointmentsQuery(req.query);
      if (queryErrors) {
        return httpResponse.badRequest(res, "Validation failed", queryErrors);
      }

      const result = await hubspotService.getCompanyAppointmentsWithContacts(
        paramData!.companyId,
        queryData!,
      );

      if (!result) {
        return httpResponse.notFound(res, "Company not found");
      }

      return httpResponse.ok(
        res,
        result,
        "Company appointments retrieved successfully",
      );
    } catch (error) {
      console.error("Server error in getCompanyAppointments", error);
      return httpResponse.internalError(
        res,
        "Server error in getCompanyAppointments",
      );
    }
  }
  async getCompanyLeadMetrics(req: Request, res: Response) {
    try {
      const { errors: paramErrors, data: paramData } = validateCompanyIdParam(
        req.params,
      );

      if (paramErrors) {
        return httpResponse.badRequest(res, "Validation failed", paramErrors);
      }

      const { errors: queryErrors, data: queryData } =
        validateCompanyAppointmentsQuery(req.query);
      if (queryErrors) {
        return httpResponse.badRequest(res, "Validation failed", queryErrors);
      }

      const result = await hubspotService.getCompanyLeadMetrics(
        paramData!.companyId,
        queryData!,
      );

      return httpResponse.ok(
        res,
        result,
        "Company lead metrics retrieved successfully",
      );
    } catch (error) {
      console.error("Server error in getCompanyLeadMetrics", error);
      return httpResponse.internalError(
        res,
        "Server error in getCompanyLeadMetrics",
      );
    }
  }
}

export default new HubspotController();
