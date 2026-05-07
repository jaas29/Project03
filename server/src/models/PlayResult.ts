import mongoose, { Schema, Document } from 'mongoose';

export interface IPlayResult extends Document {
  userId: mongoose.Types.ObjectId;
  puzzleId: mongoose.Types.ObjectId;
  score: number;
  attempts: number;
  completedAt: Date;
  durationMs: number;
}

const PlayResultSchema = new Schema<IPlayResult>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  puzzleId: { type: Schema.Types.ObjectId, ref: 'Puzzle', required: true },
  score: { type: Number, required: true, min: 0, max: 1000 },
  attempts: { type: Number, required: true, min: 1 },
  completedAt: { type: Date, default: Date.now },
  durationMs: { type: Number, required: true, min: 0 },
});

PlayResultSchema.index({ userId: 1, puzzleId: 1 }, { unique: true });
PlayResultSchema.index({ puzzleId: 1, score: -1 });

export const PlayResult = mongoose.model<IPlayResult>('PlayResult', PlayResultSchema);
