import mongoose, { Schema, Document } from 'mongoose';

export interface IHigherLowerPlayer extends Document {
  name: string;
  club: string;
  nationality: string;
  position: string;
  valueMEur: number;
}

const HigherLowerPlayerSchema = new Schema<IHigherLowerPlayer>({
  name:        { type: String, required: true, unique: true },
  club:        { type: String, required: true },
  nationality: { type: String, required: true },
  position:    { type: String, required: true },
  valueMEur:   { type: Number, required: true, min: 0 },
});

export const HigherLowerPlayer = mongoose.model<IHigherLowerPlayer>('HigherLowerPlayer', HigherLowerPlayerSchema);
