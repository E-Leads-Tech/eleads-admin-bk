import { z } from "zod/v4";

// ── Schemas ──

export const createUserSchema = z.object({
  id: z.string({ error: "ID is required" }).trim().min(1, "ID is required"),
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  email: z
    .string({ error: "Email is required" })
    .trim()
    .toLowerCase()
    .check(z.email({ error: "Email is not valid" })),
  idCompany: z
    .string({ error: "Company ID is required" })
    .trim()
    .min(1, "Company ID is required"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const getAllUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  name: z.string().trim().optional(),
  email: z.string().trim().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

// ── Types ──

export type GetAllUsersQuery = z.infer<typeof getAllUsersQuerySchema>;

// ── Validators ──

function mapIssues(issues: z.core.$ZodIssue[]) {
  return issues.map((i) => ({ field: i.path.join("."), message: i.message }));
}

export function validateGetAllUsersQuery(data: unknown) {
  const result = getAllUsersQuerySchema.safeParse(data);
  if (!result.success) {
    return { errors: mapIssues(result.error.issues), data: null };
  }
  return { errors: null, data: result.data };
}

export function validateCreateUser(data: unknown) {
  const result = createUserSchema.safeParse(data);
  if (!result.success) {
    return { errors: mapIssues(result.error.issues), data: null };
  }
  return { errors: null, data: result.data };
}
