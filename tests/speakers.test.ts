import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { speakers } from "../lib/content";
import { honoreeGroups } from "../lib/honorees";

test("speakers data: the seven confirmed speakers are listed in order", () => {
  assert.deepEqual(
    speakers.map((speaker) => speaker.id),
    [
      "wael-el-shaer",
      "wael-sakr",
      "osama-abdelhay",
      "abdel-nasser-el-naggar",
      "emad-el-banna",
      "malak",
      "nada-el-sayem",
    ]
  );

  const [elshaer, sakr, osama, naggar, emad, malak, nada] = speakers;
  assert.equal(elshaer.group, "grand");
  assert.equal(elshaer.name, "Prof. Dr. Wael El-Shaer");
  assert.equal(elshaer.role, "Head of the Department of Plastic Surgery");
  assert.equal(elshaer.affiliation, "Beni Suef University");
  assert.equal(sakr.group, "grand");
  assert.equal(sakr.name, "Prof. Dr. Wael Sakr");
  assert.equal(
    sakr.role,
    "Professor of Plastic Surgery and Former Dean of the Faculty of Medicine"
  );
  assert.equal(sakr.affiliation, "Beni Suef University");
  assert.equal(osama.group, "grand");
  assert.equal(osama.name, "Prof. Dr. Osama Abdelhay");
  assert.equal(osama.role, "President of the Egyptian Medical Syndicate");
  assert.equal(osama.affiliation, null);
  assert.equal(naggar.group, "grand");
  assert.equal(naggar.name, "Prof. Dr. Abdel-Nasser El-Naggar");
  assert.equal(naggar.role, "Professor of Plastic Surgery");
  assert.equal(naggar.affiliation, "Beni Suef University");
  assert.equal(emad.group, "grand");
  assert.equal(emad.name, "Prof. Dr. Emad El-Banna");
  assert.equal(
    emad.role,
    "President of the Beni Suef Medical Syndicate and Director of University Hospitals"
  );
  assert.equal(emad.affiliation, null);
  assert.equal(malak.group, "student");
  assert.equal(malak.name, "Malak Ashraf");
  assert.equal(malak.role, "4th year medical student");
  assert.equal(malak.affiliation, "Beni Suef National University");
  assert.equal(nada.group, "student");
  assert.equal(nada.name, "Nada El Sayem");
  assert.equal(nada.role, "1st year medical student");
  assert.equal(nada.affiliation, "Nile Valley University");
});

test("speakers data: no invented biography, session or link copy", () => {
  for (const speaker of speakers) {
    assert.equal(speaker.credentials, null, `${speaker.id} has no extra credentials`);
    assert.equal(speaker.bio, null, `${speaker.id} has no biography yet`);
    assert.equal(speaker.sessionTitle, null, `${speaker.id} has no session title yet`);
    assert.equal(speaker.sessionAbstract, null, `${speaker.id} has no session abstract yet`);
    assert.deepEqual(speaker.links, [], `${speaker.id} has no links yet`);
  }
});

test("speakers photos: portrait variants exist, are 560x720, and stay under 70KB", async () => {
  for (const speaker of speakers) {
    assert.ok(speaker.photoUrl, `${speaker.id} must have a photo`);
    assert.ok(!speaker.photoUrl.includes(" "), `${speaker.id} photo path has spaces`);
    assert.ok(speaker.photoUrl.endsWith("-portrait.webp"), `${speaker.id} uses the speaker portrait crop`);

    const diskPath = path.join(process.cwd(), "public", speaker.photoUrl.replace(/^\//, ""));
    assert.ok(fs.existsSync(diskPath), `${speaker.id} photo is missing: ${diskPath}`);
    assert.ok(
      fs.statSync(diskPath).size <= 70 * 1024,
      `${speaker.id} photo exceeds 70KB: ${fs.statSync(diskPath).size} bytes`
    );

    const meta = await sharp(diskPath).metadata();
    assert.equal(meta.width, 560, `${speaker.id} portrait width`);
    assert.equal(meta.height, 720, `${speaker.id} portrait height`);
  }
});

test("speakers data: the five grand speakers are also special guests", () => {
  const guests = honoreeGroups.find((group) => group.id === "special-guests");
  assert.ok(guests, "special-guests group must exist");
  const guestIds = new Set(guests.people.map((person) => person.id));

  for (const speaker of speakers.filter((s) => s.group === "grand")) {
    assert.ok(guestIds.has(speaker.id), `${speaker.id} must also appear in special-guests`);
  }
  // Students are presenters, not patrons or distinguished guests.
  assert.equal(guestIds.has("malak"), false);
  assert.equal(guestIds.has("nada-el-sayem"), false);
});

test("speakers data: the plastic-surgery guests lead the special-guests list on /about", () => {
  const guests = honoreeGroups.find((group) => group.id === "special-guests");
  assert.ok(guests, "special-guests group must exist");
  assert.deepEqual(
    guests.people.slice(0, 4).map((person) => person.id),
    ["wael-el-shaer", "wael-sakr", "osama-abdelhay", "abdel-nasser-el-naggar"]
  );
});

test("honorees data: the four plastic-surgery guests carry their supplied titles", () => {
  const guests = honoreeGroups.find((group) => group.id === "special-guests");
  assert.ok(guests, "special-guests group must exist");

  const byId = new Map(guests.people.map((person) => [person.id, person]));
  assert.equal(
    byId.get("wael-el-shaer")?.title,
    "Head of the Department of Plastic Surgery, Beni Suef University"
  );
  assert.equal(
    byId.get("wael-sakr")?.title,
    "Professor of Plastic Surgery and Former Dean of the Faculty of Medicine, Beni Suef University"
  );
  assert.equal(
    byId.get("abdel-nasser-el-naggar")?.title,
    "Professor of Plastic Surgery, Beni Suef University"
  );
  assert.equal(
    byId.get("osama-abdelhay")?.title,
    "President of the Egyptian Medical Syndicate"
  );
  assert.equal(
    byId.get("emad-el-banna")?.title,
    "President of the Beni Suef Medical Syndicate and Director of University Hospitals"
  );
});
