import { z } from 'zod';
import { ROLES } from '../constants/roles.js';

const email = z.string().trim().toLowerCase().email('Enter a valid email address.');
const strongPassword = z
  .string()
  .min(8, 'Password needs at least 8 characters.')
  .regex(/[a-z]/, 'Password needs a lower-case letter.')
  .regex(/[A-Z]/, 'Password needs an upper-case letter.')
  .regex(/\d/, 'Password needs a number.');
const phone = z.string().trim().regex(/^\d{10}$/, 'Phone number must be 10 digits.').or(z.literal('')).optional();

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(80),
  email,
  phone,
  password: strongPassword,
  // Public registration can request customer or theatre_owner. Admin is seed-only.
  role: z.enum([ROLES.CUSTOMER, ROLES.THEATRE_OWNER]).default(ROLES.CUSTOMER),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.'),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(80),
  phone,
  password: strongPassword.optional().or(z.literal('')),
});

export const movieSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(120),
  genre: z.string().trim().min(1, 'Genre is required.'),
  language: z.string().trim().min(1, 'Language is required.'),
  duration: z.coerce.number().int().min(30, 'Minimum 30 minutes.').max(300, 'Maximum 300 minutes.'),
  desc: z.string().trim().max(2000).optional().default(''),
  status: z.enum(['now', 'upcoming']).default('now'),
});

export const theatreSchema = z.object({
  name: z.string().trim().min(1, 'Theatre name is required.').max(120),
  area: z.string().trim().max(120).optional().default(''),
  // Admins may assign an owner; owners ignore this and own the theatre themselves.
  owner: z.string().optional(),
});

export const screenSchema = z.object({
  name: z.string().trim().min(1, 'Screen name is required.'),
  rows: z.coerce.number().int().min(3, 'Use 3 to 15 rows.').max(15, 'Use 3 to 15 rows.'),
  cols: z.coerce.number().int().min(4, 'Use 4 to 16 seats per row.').max(16, 'Use 4 to 16 seats per row.'),
});

export const showSchema = z.object({
  movie: z.string().min(1, 'Choose a movie.'),
  theatre: z.string().min(1, 'Choose a theatre.'),
  screenId: z.string().min(1, 'Choose a screen.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a valid date.'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Pick a valid time.'),
  price: z.coerce.number().min(1, 'Price must be at least 1.').max(5000, 'Price too high.'),
});

export const bookingSchema = z.object({
  show: z.string().min(1, 'Show is required.'),
  seats: z.array(z.string().regex(/^[A-O]\d{1,2}$/, 'Invalid seat code.')).min(1).max(6),
});

export const roleUpdateSchema = z.object({
  role: z.enum([ROLES.CUSTOMER, ROLES.THEATRE_OWNER, ROLES.ADMIN]),
});
