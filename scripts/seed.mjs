#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEMO_DOMAIN = "pack.demo";
const DEMO_PASSWORD = "PackDemo123!";
const RESET_ONLY = process.argv.includes("--reset-only");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [rawKey, ...rest] = trimmed.split("=");
    const key = rawKey?.trim();
    if (!key || process.env[key]) continue;
    process.env[key] = rest.join("=").trim();
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env.local"));
loadEnvFile(path.resolve(process.cwd(), ".env"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing env vars: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_USERS = [
  { alias: "MoonHowl", species: "wolf", tags: ["night", "howl"], bio: "I run at dusk and trust instinct." },
  { alias: "AshPaw", species: "wolf", tags: ["forest", "calm"], bio: "Quiet energy. Strong loyalty." },
  { alias: "NorthFang", species: "wolf", tags: ["snow", "pack"], bio: "Cold air, warm pack heart." },
  { alias: "RiverWolf", species: "wolf", tags: ["water", "travel"], bio: "I follow rivers and stories." },
  { alias: "DawnStride", species: "wolf", tags: ["sunrise", "runner"], bio: "First light is my signal." },
  { alias: "PineGuard", species: "wolf", tags: ["protector", "woods"], bio: "Guarding the circle matters." },
  { alias: "EmberTail", species: "fox", tags: ["fire", "clever"], bio: "Fast mind, warm spirit." },
  { alias: "RedWhisper", species: "fox", tags: ["quiet", "trails"], bio: "I listen before I leap." },
  { alias: "AmberFox", species: "fox", tags: ["curious", "playful"], bio: "Curiosity keeps me alive." },
  { alias: "CinderSneak", species: "fox", tags: ["night", "urban"], bio: "City lights, wild soul." },
  { alias: "LeafDash", species: "fox", tags: ["autumn", "swift"], bio: "I move like dry leaves in wind." },
  { alias: "CopperPaw", species: "fox", tags: ["warm", "friendly"], bio: "Soft voice, sharp instincts." },
  { alias: "SoftClaw", species: "cat", tags: ["feline", "cozy"], bio: "I love warmth and honest people." },
  { alias: "MidnightCat", species: "cat", tags: ["moon", "silent"], bio: "I feel most real after dark." },
  { alias: "SkyFeather", species: "bird", tags: ["air", "freedom"], bio: "Wide sky, open heart." },
  { alias: "StoneBear", species: "bear", tags: ["grounded", "strength"], bio: "Slow, steady, present." },
  { alias: "SwiftDeer", species: "deer", tags: ["grace", "nature"], bio: "Gentle spirit, quick steps." },
  { alias: "LynxEcho", species: "lynx", tags: ["focus", "solo"], bio: "I trust silence and precision." },
  { alias: "CoyoteRift", species: "coyote", tags: ["adapt", "street"], bio: "I adapt and keep moving." },
  { alias: "DriftRaven", species: "raven", tags: ["mystic", "observer"], bio: "I notice details others miss." },
];

const PACKS = [
  { slug: "wolf-pack", name: "Wolf Pack", therian_type: "wolf", emoji: "🐺" },
  { slug: "fox-pack", name: "Fox Pack", therian_type: "fox", emoji: "🦊" },
  { slug: "mixed-pack", name: "Mixed Pack", therian_type: "mixed", emoji: "🏕️" },
];

const CITIES = ["Madrid", "Barcelona", "Valencia", "Sevilla", "Bilbao", "Lisbon", "Paris", "Berlin"];
const POST_MEDIA = [
  "https://picsum.photos/seed/pack-1/1200/900",
  "https://picsum.photos/seed/pack-2/1200/900",
  "https://picsum.photos/seed/pack-3/1200/900",
  "https://picsum.photos/seed/pack-4/1200/900",
  "https://picsum.photos/seed/pack-5/1200/900",
];
const POST_TEXTS = [
  "Anyone up for a walk tonight?",
  "Feeling very wolf energy today 🐺",
  "Sending calm energy to everyone 🌙",
  "Today I felt seen for the first time in a long while.",
  "Anyone up for a quiet walk at sunset?",
  "My instincts were strong today and I trusted them.",
  "Sending strength to everyone having a heavy day.",
  "Night air and moonlight made everything feel right.",
  "Small wins today. Proud of this pack.",
  "Music, movement, and calm energy tonight.",
  "I needed this space. Thank you all.",
  "Forest thoughts and city reality can coexist.",
  "How do you all recharge after intense days?",
];

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function pick(array) {
  return array[randomInt(array.length)];
}

function sampleUnique(array, count) {
  const copy = [...array];
  const out = [];
  while (copy.length && out.length < count) {
    out.push(copy.splice(randomInt(copy.length), 1)[0]);
  }
  return out;
}

function daysAgoIso(maxDays) {
  const now = Date.now();
  const back = randomInt(maxDays * 24 * 60 * 60 * 1000);
  return new Date(now - back).toISOString();
}

function daysAheadIso(maxDays) {
  const now = Date.now();
  const ahead = (1 + randomInt(maxDays)) * 24 * 60 * 60 * 1000;
  return new Date(now + ahead).toISOString();
}

async function listAllUsers() {
  const users = [];
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users.push(...(data.users ?? []));
    if (!data.users || data.users.length < perPage) break;
    page += 1;
  }
  return users;
}

async function resetDemoData() {
  const users = await listAllUsers();
  const demoUsers = users.filter((u) => (u.email ?? "").endsWith(`@${DEMO_DOMAIN}`));
  const demoIds = demoUsers.map((u) => u.id);

  let demoPostIds = [];
  let demoMeetupIds = [];
  let demoChatIds = [];
  let demoMatchIds = [];

  if (demoIds.length) {
    const [{ data: demoPosts }, { data: demoMeetups }, { data: demoMatches }] = await Promise.all([
      supabase.from("posts").select("id").in("user_id", demoIds),
      supabase.from("meetups").select("id").in("created_by", demoIds),
      supabase
        .from("matches")
        .select("id")
        .or(`user_a.in.(${demoIds.join(",")}),user_b.in.(${demoIds.join(",")})`),
    ]);
    demoPostIds = (demoPosts ?? []).map((p) => p.id);
    demoMeetupIds = (demoMeetups ?? []).map((m) => m.id);
    demoMatchIds = (demoMatches ?? []).map((m) => m.id);
  }

  if (demoMatchIds.length) {
    const { data: demoChats } = await supabase.from("chats").select("id").in("match_id", demoMatchIds);
    demoChatIds = (demoChats ?? []).map((c) => c.id);
  }

  if (demoIds.length) {
    await supabase.from("pack_group_memberships").delete().in("user_id", demoIds);
  }

  if (demoMeetupIds.length) {
    await supabase.from("meetup_participants").delete().in("meetup_id", demoMeetupIds);
  }
  if (demoIds.length) {
    await supabase.from("meetup_participants").delete().in("user_id", demoIds);
  }

  if (demoPostIds.length) {
    await supabase.from("reactions").delete().in("post_id", demoPostIds);
  }
  if (demoIds.length) {
    await supabase.from("reactions").delete().in("user_id", demoIds);
  }

  if (demoChatIds.length) {
    await supabase.from("messages").delete().in("chat_id", demoChatIds);
  }
  if (demoIds.length) {
    await supabase.from("messages").delete().in("sender_id", demoIds);
  }

  if (demoChatIds.length) {
    await supabase.from("chats").delete().in("id", demoChatIds);
  }
  if (demoMatchIds.length) {
    await supabase.from("matches").delete().in("id", demoMatchIds);
  }
  if (demoIds.length) {
    await supabase
      .from("swipes")
      .delete()
      .or(`from_user.in.(${demoIds.join(",")}),to_user.in.(${demoIds.join(",")})`);
    await supabase
      .from("blocks")
      .delete()
      .or(`from_user.in.(${demoIds.join(",")}),to_user.in.(${demoIds.join(",")})`);
    await supabase.from("reports").delete().in("reporter_id", demoIds);
  }

  if (demoPostIds.length) {
    await supabase.from("posts").delete().in("id", demoPostIds);
  }

  if (demoMeetupIds.length) {
    await supabase.from("meetups").delete().in("id", demoMeetupIds);
  }

  await supabase.from("pack_groups").delete().in("slug", PACKS.map((p) => p.slug));

  for (const user of demoUsers) {
    await supabase.auth.admin.deleteUser(user.id);
  }

  return demoUsers.length;
}

function packSlugForSpecies(species) {
  if (species === "wolf") return "wolf-pack";
  if (species === "fox") return "fox-pack";
  return "mixed-pack";
}

async function seed() {
  const deletedUsers = await resetDemoData();
  if (RESET_ONLY) {
    console.log(`Reset done. Deleted ${deletedUsers} demo users.`);
    return;
  }

  const users = [];
  for (let i = 0; i < DEMO_USERS.length; i += 1) {
    const demo = DEMO_USERS[i];
    const email = `demo${String(i + 1).padStart(2, "0")}@${DEMO_DOMAIN}`;
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { alias: demo.alias },
    });
    if (error || !data.user) throw error ?? new Error(`Could not create ${email}`);
    users.push({ ...demo, id: data.user.id, email });
  }

  const profileRows = users.map((u) => ({
    id: u.id,
    alias: u.alias,
    therian_type: u.species,
    tags: u.tags,
    bio: u.bio,
    animal_identity: `${u.species} spirit`,
    safe_mode: true,
    avatar_url: `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(u.alias)}`,
  }));
  const { error: profilesError } = await supabase.from("profiles").insert(profileRows);
  if (profilesError) throw profilesError;

  const { error: packsInsertError } = await supabase.from("pack_groups").insert(PACKS);
  if (packsInsertError) throw packsInsertError;
  const { data: packs, error: packsError } = await supabase
    .from("pack_groups")
    .select("id, slug")
    .in("slug", PACKS.map((p) => p.slug));
  if (packsError) throw packsError;
  const packIdBySlug = new Map((packs ?? []).map((p) => [p.slug, p.id]));

  const memberships = users.map((u) => ({
    pack_id: packIdBySlug.get(packSlugForSpecies(u.species)),
    user_id: u.id,
  }));
  const { error: membershipsError } = await supabase.from("pack_group_memberships").insert(memberships);
  if (membershipsError) throw membershipsError;

  const posts = [];
  for (let i = 0; i < 30; i += 1) {
    const author = users[i % users.length];
    posts.push({
      user_id: author.id,
      content: pick(POST_TEXTS),
      media_url: i % 4 === 0 ? POST_MEDIA[i % POST_MEDIA.length] : null,
      media_type: i % 4 === 0 ? "image" : null,
      therian_type: author.species,
      created_at: daysAgoIso(21),
    });
  }
  const { data: insertedPosts, error: postsError } = await supabase
    .from("posts")
    .insert(posts)
    .select("id, therian_type");
  if (postsError) throw postsError;

  const reactionTypes = ["🐾", "🔥", "🌙"];
  const reactions = [];
  for (const post of insertedPosts ?? []) {
    const reactingUsers = sampleUnique(users, 2 + randomInt(5));
    reactingUsers.forEach((u) => {
      reactions.push({
        user_id: u.id,
        post_id: post.id,
        type: pick(reactionTypes),
        created_at: daysAgoIso(10),
      });
    });
  }
  const { error: reactionsError } = await supabase.from("reactions").insert(reactions);
  if (reactionsError) throw reactionsError;

  const meetups = [
    { title: "Night Walk Circle", description: "Calm walk, fresh air, and honest conversation.", therian_type: "wolf" },
    { title: "Forest Breath Session", description: "Grounding meetup with a slow trail and tea after.", therian_type: "wolf" },
    { title: "Fox Energy Hangout", description: "Playful social afternoon in a relaxed spot.", therian_type: "fox" },
    { title: "Urban Sunset Group", description: "City route, sunset views, and low-pressure chat.", therian_type: "mixed" },
    { title: "Full Moon Gathering", description: "Moonlight meetup and shared intentions.", therian_type: "mixed" },
  ].map((m, idx) => {
    const candidates = users.filter((u) => (m.therian_type === "mixed" ? u.species !== "wolf" && u.species !== "fox" : u.species === m.therian_type));
    const host = candidates[randomInt(candidates.length)];
    return {
      title: m.title,
      description: m.description,
      city: CITIES[idx % CITIES.length],
      date: daysAheadIso(20),
      therian_type: m.therian_type,
      created_by: host.id,
      created_at: daysAgoIso(6),
    };
  });

  const { data: insertedMeetups, error: meetupsError } = await supabase
    .from("meetups")
    .insert(meetups)
    .select("id, therian_type, created_by");
  if (meetupsError) throw meetupsError;

  const meetupParticipants = [];
  for (const meetup of insertedMeetups ?? []) {
    const samePackUsers = users.filter((u) =>
      meetup.therian_type === "mixed"
        ? u.species !== "wolf" && u.species !== "fox"
        : u.species === meetup.therian_type,
    );
    const going = sampleUnique(samePackUsers, Math.min(6, 3 + randomInt(4)));
    going.push(samePackUsers.find((u) => u.id === meetup.created_by));
    const dedup = new Set();
    going.forEach((u) => {
      if (!u || dedup.has(u.id)) return;
      dedup.add(u.id);
      meetupParticipants.push({
        meetup_id: meetup.id,
        user_id: u.id,
        created_at: daysAgoIso(5),
      });
    });
  }
  const { error: meetupParticipantsError } = await supabase
    .from("meetup_participants")
    .insert(meetupParticipants);
  if (meetupParticipantsError) throw meetupParticipantsError;

  const chatRows = [
    { therian_type: "wolf" },
    { therian_type: "fox" },
    { therian_type: "mixed" },
  ];
  const { data: existingChats, error: existingChatsError } = await supabase
    .from("chats")
    .select("id, therian_type")
    .in("therian_type", ["wolf", "fox", "mixed"]);
  if (existingChatsError) throw existingChatsError;

  const existingTypes = new Set((existingChats ?? []).map((c) => c.therian_type));
  const missingChatRows = chatRows.filter((row) => !existingTypes.has(row.therian_type));
  if (missingChatRows.length) {
    const { error: chatInsertError } = await supabase.from("chats").insert(missingChatRows);
    if (chatInsertError) throw chatInsertError;
  }

  const { data: chats, error: chatsError } = await supabase
    .from("chats")
    .select("id, therian_type")
    .in("therian_type", ["wolf", "fox", "mixed"]);
  if (chatsError) throw chatsError;

  const messages = [];
  const chatLines = [
    "Anyone up for a walk tonight?",
    "Feeling very wolf energy today 🐺",
    "Sending calm energy to everyone 🌙",
    "I needed this space today, thank you all.",
    "Anyone joining the meetup this week?",
    "Proud of this community.",
    "How are you all doing tonight?",
  ];
  for (const chat of chats ?? []) {
    const chatUsers = users.filter((u) =>
      chat.therian_type === "mixed"
        ? u.species !== "wolf" && u.species !== "fox"
        : u.species === chat.therian_type,
    );
    for (let i = 0; i < 15; i += 1) {
      const sender = chatUsers[i % chatUsers.length];
      messages.push({
        chat_id: chat.id,
        sender_id: sender.id,
        content: pick(chatLines),
        created_at: daysAgoIso(14),
      });
    }
  }
  const { error: messagesError } = await supabase.from("messages").insert(messages);
  if (messagesError) throw messagesError;

  console.log("Seed completed successfully.");
  console.log(`Created ${users.length} users, ${posts.length} posts, ${reactions.length} reactions, ${meetups.length} meetups.`);
  console.log(`Demo password for all users: ${DEMO_PASSWORD}`);
}

seed().catch((error) => {
  console.error("Seed failed:", error.message || error);
  process.exit(1);
});
