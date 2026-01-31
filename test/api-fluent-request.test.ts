
import { Mapper } from '../src/fluent-mapper.js';

async function testApiFluent() {
    console.log("Starting API Fluent request Test...");

    // Mock global fetch for testing environment
    (global as any).fetch = async (url: string, options: any) => {
        console.log(`[Fetch Mock] ${options.method} ${url}`);
        return {
            ok: true,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ status: 'success', receivedUrl: url, receivedMethod: options.method })
        };
    };

    try {
        const conn = Mapper.connection({ type: 'api', url: 'https://api.example.com' });

        console.log("\n--- Test 1: path and post ---");
        const res1 = await conn.path("/users").post({ name: 'John' });
        console.log("Result 1:", JSON.stringify(res1));

        console.log("\n--- Test 2: multiple path segments and headers ---");
        const res2 = await conn.path("/v1").path("/users/123")
            .header("Authorization", "Bearer token123")
            .headers({ "X-Custom": "value" })
            .get();
        console.log("Result 2:", JSON.stringify(res2));

        console.log("\n--- Test 3: multiple headers with same key ---");
        const res3 = await conn.path("/test")
            .header("X-Multi", "val1")
            .header("X-Multi", "val2")
            .header("X-Single: val3")
            .post();
        console.log("Result 3:", JSON.stringify(res3));

        console.log("API Fluent request tests completed successfully.");

    } catch (error) {
        console.error("Test failed:", error);
        process.exit(1);
    }
}

testApiFluent();
