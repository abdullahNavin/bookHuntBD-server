import { prisma } from "../../lib/prisma.js";
import type { CreateAlertInput, UpdateAlertInput } from "./alerts.schema.js";

export async function createAlert(userId: string, data: CreateAlertInput) {
    return prisma.priceAlert.create({
        data: {
            userId,
            ...data,
        },
    });
}

export async function getAlerts(userId: string) {
    return prisma.priceAlert.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
    });
}

export async function updateAlert(
    userId: string,
    id: string,
    data: UpdateAlertInput
) {
    const alert = await prisma.priceAlert.findFirst({
        where: { id, userId },
    });

    if (!alert) return null;

    return prisma.priceAlert.update({
        where: { id },
        data,
    });
}

export async function deleteAlert(userId: string, id: string) {
    const alert = await prisma.priceAlert.findFirst({
        where: { id, userId },
    });

    if (!alert) return null;

    return prisma.priceAlert.delete({
        where: { id },
    });
}
