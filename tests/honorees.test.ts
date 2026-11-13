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

test("honorees photos: referenced photos exist in public/ and have no spaces", () => {
  for (const group of honoreeGroups) {
    for (const person of group.people) {
      if (person.photo) {
        assert.ok(!person.photo.src.includes(" "), `photo src has spaces: ${person.photo.src}`);
        const localPath = path.join(process.cwd(), "public", person.photo.src.replace(/^\//, ""));
        assert.ok(fs.existsSync(localPath), `photo file does not exist on disk: ${localPath}`);
        assert.ok(person.photo.width > 0, "photo width must be > 0");
        assert.ok(person.photo.height > 0, "photo height must be > 0");
      }
    }
  }
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
