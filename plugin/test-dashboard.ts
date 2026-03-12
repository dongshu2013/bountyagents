import { getDashboardUrl } from "./src/helper.js";

async function testOpenDashboard() {
  console.log(`\n--- Testing openUpclawDashboard ---`);
  
  try {
    const result = await getDashboardUrl();
    console.log("Open dashboard successful!");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Test failed:");
    console.error(error);
  }
}

testOpenDashboard();
