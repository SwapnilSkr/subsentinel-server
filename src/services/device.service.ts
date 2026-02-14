import { DeviceToken } from "../models";

// --- Interfaces ---

export interface DeviceData {
  token: string;
  userId?: string;
  platform: string;
}

export interface DeviceInfo {
  id: any;
  token: string;
  userId?: string;
  platform: string;
}

// --- Device Service ---

/**
 * Register or update a device token for FCM
 */
export async function registerDevice(data: DeviceData): Promise<any> {
  const device = await DeviceToken.findOneAndUpdate(
    { token: data.token },
    { userId: data.userId, platform: data.platform },
    { upsert: true, new: true },
  );
  return device;
}

/**
 * Get device info by token
 */
export async function getDeviceByToken(token: string): Promise<any | null> {
  return await DeviceToken.findOne({ token });
}

/**
 * Get all devices for a user
 */
export async function getUserDevices(userId: string): Promise<any[]> {
  return await DeviceToken.find({ userId });
}

/**
 * Delete a device token
 */
export async function deleteDeviceToken(token: string): Promise<boolean> {
  const result = await DeviceToken.findOneAndDelete({ token });
  return result !== null;
}
