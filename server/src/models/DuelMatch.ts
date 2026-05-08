import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDuelMatch extends Document {
  players: Types.ObjectId[];
  puzzleId: Types.ObjectId;
  mode: 'hotseat' | 'online';
  scores: (number | null)[];
  winner: Types.ObjectId | null;
  status: 'pending' | 'active' | 'finished';
  eloDelta: number;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const DuelMatchSchema = new Schema<IDuelMatch>(
  {
    players: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      validate: {
        validator: (v: Types.ObjectId[]) => v.length === 2,
        message: 'Exactly 2 players required',
      },
      required: true,
    },
    puzzleId: { type: Schema.Types.ObjectId, ref: 'Puzzle', required: true },
    mode: { type: String, enum: ['hotseat', 'online'], required: true },
    scores: { type: [Schema.Types.Mixed], default: [null, null] },
    winner: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['pending', 'active', 'finished'], default: 'active' },
    eloDelta: { type: Number, default: 0 },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

DuelMatchSchema.index({ 'players': 1, status: 1 });

export const DuelMatch = mongoose.model<IDuelMatch>('DuelMatch', DuelMatchSchema);
