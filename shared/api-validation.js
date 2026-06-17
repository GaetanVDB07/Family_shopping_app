import { z } from "zod";

const FAMILY_ID = z.string().trim().min(1, "Familie-ID is verplicht").max(64);

function maxLengthMessage(maxLength) {
  return `Maximaal ${maxLength} tekens toegestaan`;
}

function requiredTrimmedString(maxLength, message) {
  return z.string().trim().min(1, message).max(maxLength, maxLengthMessage(maxLength));
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
    .pipe(
      z.union([
        z.string().max(maxLength, maxLengthMessage(maxLength)),
        z.null(),
      ]).optional(),
    );
}

export const createFamilyRequestSchema = z.object({
  name: requiredTrimmedString(100, "Familienaam is verplicht"),
});

export const joinFamilyRequestSchema = z.object({
  code: z
    .string({ required_error: "Familiecode is verplicht" })
    .trim()
    .regex(/^\d{6}$/, "Ongeldige familiecode"),
});

export const familyIdRequestSchema = z.object({
  familyId: FAMILY_ID,
});

export const createGroceryItemRequestSchema = z.object({
  name: requiredTrimmedString(200, "Itemnaam is verplicht"),
  quantity: optionalTrimmedString(20).optional(),
  unit: optionalTrimmedString(20).optional(),
  notes: optionalTrimmedString(200).optional(),
  familyId: FAMILY_ID.optional(),
});

export const updateGroceryItemRequestSchema = z
  .object({
    name: requiredTrimmedString(200, "Itemnaam is verplicht").optional(),
    completed: z.boolean().optional(),
    quantity: optionalTrimmedString(20).optional(),
    unit: optionalTrimmedString(20).optional(),
    notes: optionalTrimmedString(200).optional(),
    familyId: FAMILY_ID.optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.completed !== undefined ||
      data.quantity !== undefined ||
      data.unit !== undefined ||
      data.notes !== undefined,
    { message: "Geen geldige velden om bij te werken" },
  );

export const renameFamilyRequestSchema = z.object({
  name: requiredTrimmedString(100, "Familienaam is verplicht"),
});

export const transferAdminRequestSchema = z.object({
  familyId: FAMILY_ID,
  memberId: z
    .string({ required_error: "Lid-ID is verplicht" })
    .trim()
    .min(1, "Lid-ID is verplicht")
    .max(64),
});

export const cleanupDuplicatesRequestSchema = z.object({
  familyId: z
    .string({ required_error: "familyId is verplicht" })
    .trim()
    .min(1, "familyId is verplicht")
    .max(64),
});

export function formatValidationError(error) {
  return error.issues[0]?.message ?? "Ongeldige invoer";
}
