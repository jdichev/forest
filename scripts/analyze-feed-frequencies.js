#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

/**
 * Analyzes the feeds-proc-cache.json file and groups frequencies
 * @returns {Object} Object containing grouped frequencies
 */
function analyzeFeedFrequencies() {
  const cacheFilePath = path.join(
    process.env.HOME || process.env.USERPROFILE,
    ".forest",
    "feeds-proc-cache.json"
  );

  // Check if file exists
  if (!fs.existsSync(cacheFilePath)) {
    console.error(`Cache file not found at: ${cacheFilePath}`);
    process.exit(1);
  }

  let cacheData;
  try {
    const fileContent = fs.readFileSync(cacheFilePath, "utf-8");
    cacheData = JSON.parse(fileContent);
  } catch (error) {
    console.error(`Failed to read or parse cache file: ${error.message}`);
    process.exit(1);
  }

  const feedFrequencies = cacheData.feedFrequencies || {};

  if (Object.keys(feedFrequencies).length === 0) {
    console.log("No feed frequencies found in cache file.");
    return { groups: {}, totalFeeds: 0, summary: [] };
  }

  // Define frequency thresholds
  const ONE_MINUTE = 60 * 1000;
  const ONE_HOUR = 60 * 60 * 1000;
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
  const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
  const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;
  const ONE_MONTH = 30 * 24 * 60 * 60 * 1000;

  // Group feeds by frequency category
  const frequencyGroups = {
    "minute-based": [],
    "hour-based": [],
    "6hour-based": [],
    "1day-based": [],
    "3day-based": [],
    "weekly-based": [],
    "biweekly-based": [],
    "monthly-based": [],
  };

  for (const [feedId, frequency] of Object.entries(feedFrequencies)) {
    if (frequency <= ONE_MINUTE) {
      frequencyGroups["minute-based"].push({ id: feedId, frequency });
    } else if (frequency <= ONE_HOUR) {
      frequencyGroups["hour-based"].push({ id: feedId, frequency });
    } else if (frequency < ONE_DAY) {
      frequencyGroups["6hour-based"].push({ id: feedId, frequency });
    } else if (frequency < THREE_DAYS) {
      frequencyGroups["1day-based"].push({ id: feedId, frequency });
    } else if (frequency < ONE_WEEK) {
      frequencyGroups["3day-based"].push({ id: feedId, frequency });
    } else if (frequency < TWO_WEEKS) {
      frequencyGroups["weekly-based"].push({ id: feedId, frequency });
    } else if (frequency < ONE_MONTH) {
      frequencyGroups["biweekly-based"].push({ id: feedId, frequency });
    } else {
      frequencyGroups["monthly-based"].push({ id: feedId, frequency });
    }
  }

  // Convert to summary counts only
  const summary = {
    "minute-based": frequencyGroups["minute-based"].length,
    "hour-based": frequencyGroups["hour-based"].length,
    "6hour-based": frequencyGroups["6hour-based"].length,
    "1day-based": frequencyGroups["1day-based"].length,
    "3day-based": frequencyGroups["3day-based"].length,
    "weekly-based": frequencyGroups["weekly-based"].length,
    "biweekly-based": frequencyGroups["biweekly-based"].length,
    "monthly-based": frequencyGroups["monthly-based"].length,
  };

  const result = {
    totalFeeds: Object.keys(feedFrequencies).length,
    summary: summary,
  };

  return result;
}

/**
 * Converts milliseconds to human-readable format
 * @param {number} ms - Milliseconds
 * @returns {string} Human-readable time string
 */
function msToHumanReadable(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

// Main execution
const result = analyzeFeedFrequencies();

console.log("\n=== Feed Frequencies Summary ===\n");
console.log(`Total Feeds: ${result.totalFeeds}\n`);
console.log("Groups:");
console.log(`  Minute-based (≤1m):       ${result.summary["minute-based"]}`);
console.log(`  Hour-based (≤1h):         ${result.summary["hour-based"]}`);
console.log(`  6-hour-based (<1d):       ${result.summary["6hour-based"]}`);
console.log(`  1-day-based (1d-3d):      ${result.summary["1day-based"]}`);
console.log(`  3-day-based (3d-1w):      ${result.summary["3day-based"]}`);
console.log(`  Weekly-based (1w-2w):     ${result.summary["weekly-based"]}`);
console.log(`  Bi-weekly-based (2w-1m):  ${result.summary["biweekly-based"]}`);
console.log(`  Monthly-based (≥1m):      ${result.summary["monthly-based"]}\n`);

// Also output as JSON for programmatic use
console.log("=== JSON Output ===\n");
console.log(JSON.stringify(result, null, 2));

module.exports = { analyzeFeedFrequencies };
