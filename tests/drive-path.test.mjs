import test from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeFolderName,
  buildCategorySubpath,
} from "../src/lib/google/drive.ts";

test("Folder sanitization: removes illegal characters for Google Drive hierarchy", () => {
  const dirty = 'REC-1001: Machine Learning/AI? "Deep" *Analysis* <v1>|Final';
  const clean = sanitizeFolderName(dirty);
  assert.equal(clean, "REC-1001_ Machine Learning_AI_ _Deep_ _Analysis_ _v1__Final");
  assert.equal(/[\\/?%*:|"<>]/g.test(clean), false);
});

test("Drive category subpath construction: Conference National vs International", () => {
  assert.equal(
    buildCategorySubpath("CONFERENCE", { nationality: "NATIONAL" }),
    "Conference/National"
  );
  assert.equal(
    buildCategorySubpath("CONFERENCE", { nationality: "INTERNATIONAL" }),
    "Conference/International"
  );
});

test("Drive category subpath construction: Patent Design/Utility and Publish/Grant", () => {
  assert.equal(
    buildCategorySubpath("PATENT", { type: "DESIGN", status: "PUBLISH" }),
    "Patent/Design/Publish"
  );
  assert.equal(
    buildCategorySubpath("PATENT", { type: "UTILITY", status: "GRANT" }),
    "Patent/Utility/Grant"
  );
});

test("Drive category subpath construction: Books Edit vs Authored", () => {
  assert.equal(
    buildCategorySubpath("BOOK", { status: "AUTHORED" }),
    "Books/Authored"
  );
  assert.equal(
    buildCategorySubpath("BOOK", { status: "EDIT" }),
    "Books/Edit"
  );
});

test("Drive category subpath construction: Research Articles & FDP", () => {
  assert.equal(
    buildCategorySubpath("RESEARCH_ARTICLE", { type: "SCOPUS" }),
    "Research Articles/SCOPUS"
  );
  assert.equal(
    buildCategorySubpath("RESEARCH_ARTICLE", { type: "SCI" }),
    "Research Articles/SCI"
  );
  assert.equal(buildCategorySubpath("FDP"), "FDP");
  assert.equal(buildCategorySubpath("BOOK_CHAPTER"), "Book Chapters");
});
