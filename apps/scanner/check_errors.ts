import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://postgres:k22nzyXvNzniS8rGfNuKVLxKp1tdkTXRdUp2f69fb4J6VUjpA7HeAi5Oqsqk4GGV@141.140.0.90:5432/postgres?schema=public'
        }
    }
});

async function main() {
    const scans = await prisma.scan.findMany({
        orderBy: { startedAt: 'desc' },
        take: 5,
        select: {
            scanId: true,
            seedUrl: true,
            status: true,
            error: true
        }
    });
    console.log(JSON.stringify(scans, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
