import { z } from "zod";

const FAMILY_ID = z.string().trim().min(1, "Family ID is required").max(64);

function requiredTrimmedString(maxLength, message) {
  return z.string().trim().min(1, message).max(maxLength);
}

function optionalTrimmedString(maxLength) {
  return z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (value === null || value === undefined) {
        return undefined;
      }

      const trimmed = String(value).trim();
      if (trimmed.length === 0) {
        return null;
      }

      return trimmed;
    })
    .pipe(z.union([z.string().max(maxLength), z.null()]).optional());
}

export const createFamilyRequestSchema = z.object({
  name: requiredTrimmedString(100, "Family name is required"),
});

export const joinFamilyRequestSchema = z.object({
  code: z
    .string({ required_error: "Family code is required" })
    .trim()
    .regex(/^\d{6}$/, "Invalid family code format"),
});

export const familyIdRequestSchema = z.object({
  familyId: FAMILY_ID,
});

export const createGroceryItemRequestSchema = z.object({
  name: requiredTrimmedString(200, "Item name is required"),
  quantity: optionalTrimmedString(20).optional(),
  unit: optionalTrimmedString(20).optional(),
  notes: optionalTrimmedString(200).optional(),
  familyId: FAMILY_ID.optional(),
});

export const updateGroceryItemRequestSchema = z
  .object({
    completed: z.boolean().optional(),
    quantity: optionalTrimmedString(20).optional(),
    unit: optionalTrimmedString(20).optional(),
    notes: optionalTrimmedString(200).optional(),
    familyId: FAMILY_ID.optional(),
  })
  .refine(
    (data) =>
      data.completed !== undefined ||
      data.quantity !== undefined ||
      data.unit !== undefined ||
      data.notes !== undefined,
    { message: "No valid fields to update" },
  );

export const cleanupDuplicatesRequestSchema = z.object({
  familyId: z
    .string({ required_error: "familyId is required" })
    .trim()
    .min(1, "familyId is required")
    .max(64),
});

export function formatValidationError(error) {
  return error.issues[0]?.message ?? "Invalid request body";
}
