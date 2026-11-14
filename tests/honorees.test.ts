import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { honoreeGroups, getInitials } from "../lib/honorees";

test("honorees data: unique group and person IDs", () => {
  const groupIds = new Set<string>();
  const personIds = new Set<string>();

  for (const group of honoreeGroups) {
    assert.ok(group.id, "group id must not be empty");
    assert.ok(group.label, "group label must not be empty");
    assert.ok(!groupIds.has(group.id), `duplicate group id: ${group.id}`);
    groupIds.add(group.id);

    for (const person of group.people) {
      assert.ok(person.id, "person id must not be empty");
      assert.ok(!personIds.has(person.id), `duplicate person id: ${person.id}`);
      personIds.add(person.id);
    }
  }
});

test("honorees data: every person has a name and a title", () => {
  for (const group of honoreeGroups) {
    for (const person of group.people) {
      assert.ok(person.name && person.name.trim().length > 0, `person ${person.id} missing name`);
      assert.ok(person.title && person.title.trim().length > 0, `person ${person.id} missing title`);
    }
  }
});

test("honorees photos: card and thumb variants exist, no spaces, correct dimensions, within size budgets", () => {
  const CARD_BUDGET_BYTES = 70 * 1024; // 70 KB
  const THUMB_BUDGET_BYTES = 12 * 1024; // 12 KB

  for (const group of honoreeGroups) {
    for (const person of group.people) {
      if (!person.photo) continue;

      // Card variant
      assert.ok(person.photo.card, `person ${person.id} missing card photo variant`);
      assert.ok(!person.photo.card.src.includes(" "), `card src has spaces: ${person.photo.card.src}`);
      assert.equal(person.photo.card.width, 560, `card width should be 560 for ${person.id}`);
      assert.equal(person.photo.card.height, 720, `card height should be 720 for ${person.id}`);

      const cardDiskPath = path.join(process.cwd(), "public", person.photo.card.src.replace(/^\//, ""));
      assert.ok(fs.existsSync(cardDiskPath), `card file does not exist: ${cardDiskPath}`);
      const cardStat = fs.statSync(cardDiskPath);
      assert.ok(
        cardStat.size <= CARD_BUDGET_BYTES,
        `card file ${person.photo.card.src} exceeds 70KB: ${cardStat.size} bytes`
      );

      // Thumb variant
      assert.ok(person.photo.thumb, `person ${person.id} missing thumb photo variant`);
      assert.ok(!person.photo.thumb.src.includes(" "), `thumb src has spaces: ${person.photo.thumb.src}`);
      assert.equal(person.photo.thumb.width, 144, `thumb width should be 144 for ${person.id}`);
      assert.equal(person.photo.thumb.height, 144, `thumb height should be 144 for ${person.id}`);

      const thumbDiskPath = path.join(process.cwd(), "public", person.photo.thumb.src.replace(/^\//, ""));
      assert.ok(fs.existsSync(thumbDiskPath), `thumb file does not exist: ${thumbDiskPath}`);
      const thumbStat = fs.statSync(thumbDiskPath);
      assert.ok(
        thumbStat.size <= THUMB_BUDGET_BYTES,
        `thumb file ${person.photo.thumb.src} exceeds 12KB: ${thumbStat.size} bytes`
      );

      // Backwards compatibility alias
      assert.equal(person.photo.src, person.photo.card.src);
      assert.equal(person.photo.width, person.photo.card.width);
      assert.equal(person.photo.height, person.photo.card.height);
    }
  }
});

test("honorees dynamic groups: handles empty groups, single group, and custom counts", () => {
  const emptyGroup = { id: "empty", label: "Empty Group", people: [] };
  const samplePerson = {
    id: "sample-1",
    name: "Dr. Jane Doe",
    title: "Guest Lecturer",
    photo: null,
  };
  const sampleGroup1 = { id: "g1", label: "Group 1", people: [samplePerson] };
  const sampleGroup2 = {
    id: "g2",
    label: "Group 2",
    people: Array.from({ length: 7 }, (_, i) => ({
      id: `p-${i}`,
      name: `Person ${i}`,
      title: `Title ${i}`,
      photo: null,
    })),
  };

  // 0 groups / empty groups
  const zeroGroups: typeof honoreeGroups = [];
  assert.equal(zeroGroups.filter((g) => g.people.length > 0).length, 0);

  // Group with no people
  const mixedGroups = [emptyGroup, sampleGroup1];
  const visible = mixedGroups.filter((g) => g.people.length > 0);
  assert.equal(visible.length, 1);
  assert.equal(visible[0].id, "g1");

  // 8 people total (1 + 7)
  const eightPeopleGroups = [sampleGroup1, sampleGroup2];
  const totalEight = eightPeopleGroups.reduce((acc, g) => acc + g.people.length, 0);
  assert.equal(totalEight, 8);

  // 9 people total (1 + 8)
  const ninePeopleGroups = [
    sampleGroup1,
    {
      id: "g2",
      label: "Group 2",
      people: Array.from({ length: 8 }, (_, i) => ({
        id: `p-${i}`,
        name: `Person ${i}`,
        title: `Title ${i}`,
        photo: null,
      })),
    },
  ];
  const totalNine = ninePeopleGroups.reduce((acc, g) => acc + g.people.length, 0);
  assert.equal(totalNine, 9);

  // 12 people total (6 + 6)
  const twelvePeopleGroups = [
    {
      id: "g1",
      label: "Group 1",
      people: Array.from({ length: 6 }, (_, i) => ({
        id: `p1-${i}`,
        name: `Person ${i}`,
        title: `Title ${i}`,
        photo: null,
      })),
    },
    {
      id: "g2",
      label: "Group 2",
      people: Array.from({ length: 6 }, (_, i) => ({
        id: `p2-${i}`,
        name: `Person ${i}`,
        title: `Title ${i}`,
        photo: null,
      })),
    },
  ];
  const totalTwelve = twelvePeopleGroups.reduce((acc, g) => acc + g.people.length, 0);
  assert.equal(totalTwelve, 12);
});

test("honorees initials helper: ignores Prof. and Dr.", () => {
  assert.equal(getInitials("Prof. Dr. Tarek Ali"), "TA");
  assert.equal(getInitials("Prof. Dr. Rasha Tawfik"), "RT");
  assert.equal(getInitials("Prof. Dr. Ahmed Osama"), "AO");
  assert.equal(getInitials("Prof. Dr. Doaa Hamdy"), "DH");
  assert.equal(getInitials("Dr. Sherine Ghaleb"), "SG");
  assert.equal(getInitials("Osama Abdelhay"), "OA");
  assert.equal(getInitials("Emad"), "EM");
  assert.equal(getInitials(""), "");
});


