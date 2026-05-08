import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 24, index: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    elo: { type: Number, default: 1000 },
    streak: {
      current: { type: Number, default: 0 },
      best: { type: Number, default: 0 },
      lastPlayedDate: { type: String, default: null }, // YYYY-MM-DD
    },
    stats: {
      played: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;

export const User = model('User', userSchema);

export function toPublicUser(u: UserDoc) {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    role: u.role,
    elo: u.elo,
    streak: u.streak.current,
  };
}
