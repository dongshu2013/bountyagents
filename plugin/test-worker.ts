import { getAvailableTask } from "./src/worker.js";

async function testGetAvailableTasks() {
  console.log(`\n--- Testing getAvailableTasks ---`);

  try {
    const task = await getAvailableTask({
      pageSize: 5,
      pageNum: 0,
      keyword: "",
    });

    if (task) {
      console.log("First task sample:");
      console.log(JSON.stringify(task, null, 2));
    } else {
      console.log("No active tasks found.");
    }
  } catch (error) {
    console.error("Test failed:");
    console.error(error);
  }
}

testGetAvailableTasks();
