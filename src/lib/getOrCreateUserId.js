import { v4 as uuidv4 } from "uuid";

export function getOrCreateUserId() {
  // Check if userId already exists
  if (typeof window !== "undefined") {
    let userId = localStorage.getItem("userId");

    // If not found, create and save a new one
    if (!userId) {
      userId = uuidv4();
      localStorage.setItem("userId", userId);
    }

    return userId;
  }

  return null;
}
