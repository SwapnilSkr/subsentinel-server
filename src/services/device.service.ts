import { Types } from "mongoose";
import { DeviceToken, User } from "../models";

// --- Interfaces ---

export interface DeviceData {
  token: string;
  userId: string;
  platform: string;
}

export interface DeviceInfo {
  id: any;
  token: string;
  userId: Types.ObjectId;
  platform: string;
}

async function resolveUserId(userId: string): Promise<Types.ObjectId> {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }
  const objectId = new Types.ObjectId(userId);
  const userExists = await User.exists({ _id: objectId });
  if (!userExists) {
    throw new Error("User not found");
  }
  return objectId;
}

// --- Device Service ---

/**
 * Register or update a device token for FCM
 */
export async function registerDevice(data: DeviceData): Promise<any> {
  const setData: { platform: string; userId: Types.ObjectId } = {
    platform: data.platform.trim(),
    userId: await resolveUserId(data.userId),
  };

  const device = await DeviceToken.findOneAndUpdate(
    { token: data.token },
    { $set: setData },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
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
  if (!Types.ObjectId.isValid(userId)) {
    return [];
  }
  return await DeviceToken.find({ userId: new Types.ObjectId(userId) });
}

/**
 * Delete a device token
 */
export async function deleteDeviceToken(token: string): Promise<boolean> {
  const result = await DeviceToken.findOneAndDelete({ token });
  return result !== null;
}
