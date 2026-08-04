const { MongoClient } = require('mongodb');
const fs = require('fs');

async function run() {
    // Read .env.local
    const envFile = fs.readFileSync('.env.local', 'utf-8');
    const uriMatch = envFile.match(/MONGODB_URI=(.*)/);
    if (!uriMatch) {
        console.error("No MONGODB_URI found");
        return;
    }
    const uri = uriMatch[1].trim();

    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('WasWays');
        const services = db.collection('services');

        // Update Quick Dry to Dry Clean
        const result = await services.updateOne(
            { name: "Quick dry" },
            { $set: { name: "Dry clean" } }
        );
        console.log(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);

        const result2 = await services.updateOne(
            { name: "Quick Dry" },
            { $set: { name: "Dry Clean" } }
        );
        console.log(`Matched: ${result2.matchedCount}, Modified: ${result2.modifiedCount}`);

        console.log("Done");
    } finally {
        await client.close();
    }
}
run();
