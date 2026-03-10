import { submitResponse } from "./src/worker.js";
import { decideOnResponse } from "./src/publisher.js";

async function testResponseFlow() {
  const taskId = "dbb5ca3c-ba61-4c55-808c-70990602d747";
  console.log(`\n--- Testing Response Flow for taskId: ${taskId} ---`);

  try {
    // 1. Submit Response
    console.log("\n1. Submitting response as worker...");
    const responseResult = await submitResponse({
      taskId,
      payload: "This is a test response content submitted via standalone function."
    });
    console.log("Response submission successful!");
    console.log(JSON.stringify(responseResult, null, 2));

    const responseId = responseResult.id;
    const workerAddress = responseResult.worker;
    // Note: In a real scenario, we might need to fetch the task to get the price, 
    // but for testing we'll assume a value or use what's in the response if available.
    // Based on the schema, price is on the task, not the response.
    
    // 2. Decide on Response (Approve)
    console.log(`\n2. Deciding on response (approving) as publisher...`);
    // We'll use the price from the task. Since the task was funded with 100 tokens, 
    // we use the same value.
    const decisionResult = await decideOnResponse({
      responseId,
      workerAddress,
      price: "142500000",
      status: "approved"
    });
    console.log("Decision (approval) successful!");
    console.log(JSON.stringify(decisionResult, null, 2));

  } catch (error) {
    console.error("Test flow failed:");
    console.error(error);
  }
}

testResponseFlow();
