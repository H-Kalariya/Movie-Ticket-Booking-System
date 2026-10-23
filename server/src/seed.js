import mongoose from 'mongoose';
import { connectDb, disconnectDb } from './config/db.js';
import { env } from './config/env.js';
import { ROLES } from './constants/roles.js';
import { User } from './models/User.js';
import { Movie } from './models/Movie.js';
import { Theatre } from './models/Theatre.js';
import { Show } from './models/Show.js';
import { Booking } from './models/Booking.js';
import { ActivityLog } from './models/ActivityLog.js';
import { dayStr } from './utils/helpers.js';

async function run() {
  await connectDb();
  console.log('[seed] clearing collections...');
  await Promise.all([
    User.deleteMany({}),
    Movie.deleteMany({}),
    Theatre.deleteMany({}),
    Show.deleteMany({}),
    Booking.deleteMany({}),
    ActivityLog.deleteMany({}),
  ]);

  // Users: an admin and a theatre owner.
  const admin = new User({ name: 'Site Admin', email: env.seed.adminEmail, role: ROLES.ADMIN });
  await admin.setPassword(env.seed.adminPassword);
  await admin.save();

  const owner = new User({ name: 'Theatre Owner', email: env.seed.ownerEmail, role: ROLES.THEATRE_OWNER });
  await owner.setPassword(env.seed.ownerPassword);
  await owner.save();

  // Movies.
  const movieDefs = [
    ['Midnight Local', 'Thriller', 'English', 112, 'A night-shift train conductor notices the same passenger on every run.', 'now', 350],
    ['Chai & Monsoon', 'Romance', 'Hindi', 128, 'Two strangers keep sharing a tea stall during one long rainy season.', 'now', 20],
    ['Neon Raga', 'Musical', 'Hindi', 141, 'A classical singer forms a band with street DJs.', 'now', 285],
    ['The Last Lighthouse', 'Drama', 'English', 120, 'The final keeper of a coastal light has one winter to train a successor.', 'now', 195],
    ['Garba Nights', 'Comedy', 'Gujarati', 118, 'Two rival dance troupes share one ground during Navratri.', 'now', 40],
    ['Orbit Seven', 'Sci-Fi', 'English', 134, 'A repair crew on a failing station finds a signal that is answering them.', 'upcoming', 160],
  ];
  const movies = await Movie.insertMany(
    movieDefs.map(([title, genre, language, duration, desc, status, hue]) => ({
      title, genre, language, duration, desc, status, hue,
    }))
  );

  // Theatres owned by the owner account.
  const t1 = await Theatre.create({
    name: 'Aurora Cinemas', area: 'Downtown', owner: owner._id,
    screens: [{ name: 'Screen 1', rows: 8, cols: 10 }, { name: 'Screen 2', rows: 6, cols: 8 }],
  });
  const t2 = await Theatre.create({
    name: 'Regal Plaza', area: 'Riverside', owner: owner._id,
    screens: [{ name: 'Screen 1', rows: 7, cols: 10 }],
  });

  // Shows for the next few days.
  const screens = [
    { theatre: t1, screen: t1.screens[0], price: 220 },
    { theatre: t1, screen: t1.screens[1], price: 180 },
    { theatre: t2, screen: t2.screens[0], price: 260 },
  ];
  const times = ['10:30', '14:00', '18:30', '21:45'];
  const nowShowing = movies.filter((m) => m.status === 'now');
  const shows = [];
  const seen = new Set();
  nowShowing.forEach((m, i) => {
    for (let d = 0; d < 4; d++) {
      for (const k of [0, 1]) {
        const slot = screens[(i + d + k) % screens.length];
        const time = times[(i + d + k * 2) % times.length];
        const key = `${slot.screen._id}-${d}-${time}`;
        if (seen.has(key)) continue;
        seen.add(key);
        shows.push({
          movie: m._id,
          theatre: slot.theatre._id,
          screenId: slot.screen._id,
          date: dayStr(d),
          time,
          price: slot.price,
        });
      }
    }
  });
  await Show.insertMany(shows);

  console.log('[seed] done.');
  console.log(`  admin: ${env.seed.adminEmail} / ${env.seed.adminPassword}`);
  console.log(`  owner: ${env.seed.ownerEmail} / ${env.seed.ownerPassword}`);
  console.log(`  movies: ${movies.length}, theatres: 2, shows: ${shows.length}`);

  await disconnectDb();
  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error('[seed] failed:', e);
  await disconnectDb().catch(() => {});
  process.exit(1);
});
