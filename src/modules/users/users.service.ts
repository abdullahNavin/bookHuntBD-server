import { prisma } from "../../lib/prisma.js";

export async function getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
        },
    });
    return user;
}

export async function updateUserProfile(
    userId: string,
    data: { name?: string; image?: string }
) {
    const user = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
        },
    });
    return user;
}
