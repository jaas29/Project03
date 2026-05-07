import mongoose, { Schema, Document } from 'mongoose';
import { PuzzleType } from '../types/puzzle';

export interface IPuzzle extends Document {
  date: string;
  type: PuzzleType;
  payload: unknown;
  solution: unknown;
  generatedAt: Date;
}

const PuzzleSchema = new Schema<IPuzzle>({
  date: { type: String, required: true },
  type: { type: String, enum: ['grid', 'connections', 'wordle', 'higherlower'], required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  solution: { type: Schema.Types.Mixed, required: true },
  generatedAt: { type: Date, default: Date.now },
});

PuzzleSchema.index({ date: 1, type: 1 }, { unique: true });

export const Puzzle = mongoose.model<IPuzzle>('Puzzle', PuzzleSchema);
