import { Request, Response } from "express";
import userService from "./user.service";
import { httpResponse } from "../../lib/http-response";
import {
  validateGetAllUsersQuery,
  validateCreateUser,
} from "./user.validation";

class UserController {
  async getUser(req: Request, res: Response) {
    try {
      const user = await userService.findByEmail(req.params.email as string);
      if (!user) {
        return httpResponse.notFound(res, "User not found");
      }
      return httpResponse.ok(res, user, "User retrieved successfully");
    } catch (error) {
      console.error("Server error in getUser", error);
      return httpResponse.internalError(res, "Server error in getUser");
    }
  }

  async getAllUsers(req: Request, res: Response) {
    try {
      const { errors, data: query } = validateGetAllUsersQuery(req.query);
      if (errors) {
        return httpResponse.badRequest(res, "Validation failed", errors);
      }

      const result = await userService.findAllFiltered(query!);
      return httpResponse.ok(res, result, "Users retrieved successfully");
    } catch (error) {
      console.error("Server error in getAllUsers", error);
      return httpResponse.internalError(res, "Server error in getAllUsers");
    }
  }

  async createUser(req: Request, res: Response) {
    try {
      const { errors, data } = validateCreateUser(req.body);
      if (errors) {
        return httpResponse.badRequest(res, "Validation failed", errors);
      }

      const existingUser = await userService.findByEmail(data!.email);
      if (existingUser) {
        return httpResponse.conflict(res, "Email already exists");
      }

      const user = await userService.create(data!);
      return httpResponse.created(res, user, "User created successfully");
    } catch (error) {
      console.error("Server error in createUser", error);
      return httpResponse.internalError(res, "Server error in createUser");
    }
  }

  async updateUser(req: Request, res: Response) {}
}

export default new UserController();
