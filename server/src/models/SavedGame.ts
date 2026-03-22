import mongoose, { Schema } from "mongoose";

const SavedGameSchema = new Schema(
  {
    roomCode: { type: String, index: true, required: true },
    state: { type: Schema.Types.Mixed, required: true }
  },
  { timestamps: true }
);

export const SavedGame = mongoose.model("SavedGame", SavedGameSchema);
