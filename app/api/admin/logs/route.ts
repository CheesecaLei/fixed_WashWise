import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../config/mongodb";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = (page - 1) * limit;

        const type = searchParams.get("type");
        const search = searchParams.get("search");
        const timeframe = searchParams.get("timeframe");
        const sort = searchParams.get("sort") || "desc";

        const query: any = {};

        if (type && type !== "all") {
            query.type = type;
        }

        if (search) {
            query.$or = [
                { performedBy: { $regex: search, $options: "i" } },
                { orderCode: { $regex: search, $options: "i" } },
                { customerName: { $regex: search, $options: "i" } },
                { details: { $regex: search, $options: "i" } }
            ];
        }

        if (timeframe && timeframe !== "all") {
            const now = new Date();
            let startDate = new Date();
            if (timeframe === "today") {
                startDate.setHours(0, 0, 0, 0);
            } else if (timeframe === "week") {
                startDate.setDate(now.getDate() - 7);
            } else if (timeframe === "month") {
                startDate.setMonth(now.getMonth() - 1);
            }
            query.createdAt = { $gte: startDate };
        }

        const db = await getDb();
        const logsCollection = db.collection("logs");
        
        // Count total logs matching query
        const totalCount = await logsCollection.countDocuments(query);

        // Fetch paginated logs
        const sortDirection = sort === "asc" ? 1 : -1;
        const logsRaw = await logsCollection.find(query).sort({ createdAt: sortDirection }).skip(skip).limit(limit).toArray();
        
        const logs = logsRaw.map(log => {
            const minutesAgo = Math.floor((new Date().getTime() - new Date(log.createdAt).getTime()) / 60000);
            
            return {
                id: log._id.toString(),
                type: log.type,
                orderCode: log.orderCode || "N/A",
                customerName: log.customerName || "N/A",
                quantity: log.quantity || 0,
                performedBy: log.performedBy,
                minutesAgo: minutesAgo < 1 ? 0 : minutesAgo,
                details: log.details || "",
                createdAt: log.createdAt
            };
        });

        return NextResponse.json({ 
            logs, 
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error("Logs API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
