import { prisma } from "../../lib/prisma.js";
import type { AddWishlistInput } from "./wishlist.schema.js";

export async function addToWishlist(userId: string, data: AddWishlistInput) {
    return prisma.wishlist.create({
        data: {
            userId,
            ...data,
        },
    });
}

export async function getWishlist(userId: string) {
    return prisma.wishlist.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
    });
}

export async function removeFromWishlist(userId: string, id: string) {
    // Ensure the item belongs to the user
    const item = await prisma.wishlist.findFirst({
        where: { id, userId },
    });

    if (!item) {
        return null;
    }

    return prisma.wishlist.delete({
        where: { id },
    });
}
