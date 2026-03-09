import { depositToken, createBountyTask, fundBountyTask } from "./src/publisher.js";

async function testCreateAndDeposit() {
  const testId = "test-" + Date.now();
  console.log(`\n--- Testing createBountyTask ---`);
  
  try {
    const taskResult = await createBountyTask({
      title: `Test Task ${testId}`,
      content: "This is a test task content created via standalone function."
    });
    console.log("Task creation successful!");
    console.log(JSON.stringify(taskResult, null, 2));

    const createdTaskId = taskResult.id;
    console.log(`\n--- Testing depositToken with taskId: ${createdTaskId} ---`);
    
    const depositResult = await depositToken({ 
      taskId: createdTaskId,
      amount: "100"
    });
    console.log("Deposit successful!");
    console.log(JSON.stringify(depositResult, null, 2));

    console.log(`\n--- Testing fundBountyTask with taskId: ${createdTaskId} ---`);
    const fundResult = await fundBountyTask({
      taskId: createdTaskId,
      token: "bsc-testnet:0x56DA32693A4e6dDd0eDC932b295cb00372f37f8b"
    });
    console.log("Fund task successful!");
    console.log(JSON.stringify(fundResult, null, 2));
  } catch (error) {
    console.error("Test failed:");
    console.error(error);
  }
}

testCreateAndDeposit();
