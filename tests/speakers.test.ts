import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { speakers } from "../lib/content";
import { honoreeGroups } from "../lib/honorees";

test("speakers data: the twelve confirmed speaker cards are listed in order", () => {
  assert.deepEqual(
    speakers
      .filter((speaker) => speaker.group === "grand" || speaker.group === "student")
      .map((speaker) => speaker.id),
    [
      "wael-el-shaer",
      "wael-sakr",
      "osama-abdelhay",
      "abdel-nasser-el-naggar",
      "emad-el-banna",
      "malak",
      "nada-el-sayem",
      "ebrahim",
      "habiba",
      "basmala",
      "lobna",
      "nada-ashraf",
    ]
  );

  const [elshaer, sakr, osama, naggar, emad] = speakers;
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

  // Student presenters: the user asked for the plain "Medical student" line
  // with no year, and for the short name forms they supplied.
  const students = speakers.filter((speaker) => speaker.group === "student");
  assert.equal(students.length, 7);
  assert.deepEqual(
    students.map((speaker) => speaker.name),
    [
      "Malak Ashraf",
      "Nada El Sayem",
      "Ebrahim Ragab",
      "Habiba Mohamed",
      "Basmala Hassan",
      "Lobna Ahmed",
      "Nada Ashraf",
    ]
  );
  for (const student of students) {
    assert.equal(student.group, "student");
    assert.equal(student.role, "Medical student", `${student.id} role`);
    assert.ok(student.affiliation, `${student.id} affiliation`);
  }
  // Lobna and Abdelrahman share one card, as they do on the ballot.
  assert.deepEqual(
    students.map((speaker) => speaker.coName ?? null),
    [null, null, null, null, null, "Abdelrahman Eid", null]
  );
  assert.deepEqual(
    students.map((speaker) => speaker.coPhotoUrl ?? null),
    [null, null, null, null, null, "/people/abdelrahman-portrait.webp", null]
  );
  // Everyone but Nada El Sayem reads as Beni Suef National University.
  assert.deepEqual(
    students.map((speaker) => speaker.affiliation),
    [
      "Beni Suef National University",
      "Nile Valley University",
      "Beni Suef National University",
      "Beni Suef National University",
      "Beni Suef National University",
      "Beni Suef National University",
      "Beni Suef National University",
    ]
  );
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
  // Agenda-only guests use square /speakers/ portraits, checked in agenda.test.ts.
  for (const speaker of speakers.filter((s) => s.group !== "other")) {
    const photos = [speaker.photoUrl, speaker.coPhotoUrl].filter(
      (url): url is string => Boolean(url)
    );
    for (const url of photos) {
      assert.ok(!url.includes(" "), `${speaker.id} photo path has spaces: ${url}`);
      assert.ok(url.endsWith("-portrait.webp"), `${speaker.id} uses the speaker portrait crop: ${url}`);

      const diskPath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
      assert.ok(fs.existsSync(diskPath), `${speaker.id} photo is missing: ${diskPath}`);
      assert.ok(
        fs.statSync(diskPath).size <= 70 * 1024,
        `${speaker.id} photo exceeds 70KB: ${fs.statSync(diskPath).size} bytes`
      );

      const meta = await sharp(diskPath).metadata();
      assert.equal(meta.width, 560, `${speaker.id} portrait width: ${url}`);
      assert.equal(meta.height, 720, `${speaker.id} portrait height: ${url}`);
    }
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
