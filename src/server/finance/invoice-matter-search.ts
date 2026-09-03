import { Prisma } from "@prisma/client";
import { matterAssociationFilter } from "@/lib/permissions";

export function invoiceMatterSearchWhere(
  userId: string,
  q?: string
): Prisma.MatterWhereInput {
  const query = (q ?? "").trim();
  const associationWhere = matterAssociationFilter(userId);
  const searchWhere: Prisma.MatterWhereInput = {
    OR: [
      { title: { contains: query } },
      { internalCode: { contains: query } },
      { firmCaseNo: { contains: query } }
    ]
  };

  return {
    deletedAt: null,
    ...(query ? { AND: [associationWhere, searchWhere] } : associationWhere)
  };
}

export function invoiceMatterSearchLimit(q?: string) {
  return (q ?? "").trim() ? 10 : 12;
}


