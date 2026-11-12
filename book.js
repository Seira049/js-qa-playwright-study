/**
 * book.js — the book's table of contents.
 *
 * Chapter kinds:
 *   { id, number, title, file, minutes }   a reviewed chapter written in Markdown (chapters/*.md)
 *   { id, number, title, planned: true }  listed in the contents, not written yet
 *   { legacy: "<module id>" }             an older module from curriculum.js, not yet reviewed
 * Optional `label` replaces the default "Chapter <number>" (e.g. "Appendix A").
 *
 * A part with `optional: true` is shown as optional and is not counted in overall progress.
 */
window.BOOK = {
  title: "JavaScript & TypeScript for QA",
  subtitle: "An interactive book for testers: learn JavaScript and TypeScript properly, then apply them with Playwright. Every example runs in your browser.",
  parts: [
    {
      title: "JavaScript & TypeScript",
      intro: "The language itself, explained from the start. Each chapter has runnable examples, an exercise, and a short quiz.",
      chapters: [
        { id: "js-01", number: 1, title: "How Your Code Runs", file: "chapters/js-01-how-code-runs.md", minutes: 35 },
        { id: "js-02", number: 2, title: "Values, Variables, and Types", file: "chapters/js-02-values-variables-types.md", minutes: 45 },
        { id: "js-03", number: 3, title: "Operators, Equality, and Truthiness", file: "chapters/js-03-operators-equality-truthiness.md", minutes: 40 },
        { id: "js-04", number: 4, title: "Strings and Template Literals", file: "chapters/js-04-strings-template-literals.md", minutes: 40 },
        { id: "js-05", number: 5, title: "Arrays and Objects", file: "chapters/js-05-arrays-objects.md", minutes: 55 },
        { id: "js-06", number: 6, title: "Functions", file: "chapters/js-06-functions.md", minutes: 50 },
        { id: "js-07", number: 7, title: "Control Flow and Errors", file: "chapters/js-07-control-flow-errors.md", minutes: 50 },
        { id: "js-08", number: 8, title: "Modules: import and export", file: "chapters/js-08-modules.md", minutes: 40 },
        { id: "js-09", number: 9, title: "Classes", file: "chapters/js-09-classes.md", minutes: 50 },
        { id: "js-10", number: 10, title: "Asynchronous Code: Promises and async/await", file: "chapters/js-10-async-promises.md", minutes: 55 },
        { id: "js-11", number: 11, title: "TypeScript: Types, Interfaces, and Narrowing", file: "chapters/js-11-ts-types-narrowing.md", minutes: 55 },
        { id: "js-12", number: 12, title: "TypeScript: Generics, Utility Types, and tsconfig", file: "chapters/js-12-ts-generics-utility-tsconfig.md", minutes: 50 },
      ],
    },
    {
      title: "Playwright",
      intro: "Writing end-to-end tests with Playwright Test. These chapters run on your computer against the practice project in the practice/ folder.",
      chapters: [
        { id: "pw-01", number: 13, title: "Setting Up Playwright and Your First Test", file: "chapters/pw-01-setup-first-test.md", minutes: 35 },
        { id: "pw-02", number: 14, title: "Locators", file: "chapters/pw-02-locators.md", minutes: 40 },
        { id: "pw-03", number: 15, title: "Actions and Assertions", file: "chapters/pw-03-actions-assertions.md", minutes: 45 },
        { id: "pw-04", number: 16, title: "Organizing Tests: Hooks, Page Objects, Fixtures, and Sign-in", file: "chapters/pw-04-organizing-tests.md", minutes: 55 },
      ],
    },
    {
      title: "API Testing & Test Data",
      chapters: [
        { id: "pw-05", number: 17, title: "API Testing", file: "chapters/pw-05-api-testing.md", minutes: 45 },
        { id: "pw-06", number: 18, title: "Mocking the Network and Managing Test Data", file: "chapters/pw-06-mocking-test-data.md", minutes: 50 },
      ],
    },
    {
      title: "Debugging & CI",
      chapters: [
        { id: "pw-07", number: 19, title: "Debugging, Flaky Tests, and CI", file: "chapters/pw-07-debugging-ci.md", minutes: 40 },
      ],
    },
    {
      title: "Appendix: SQL for QA",
      optional: true,
      intro: "Optional. Useful when you need to check what an application saved to its database. Every query runs in your browser.",
      chapters: [
        { id: "sql-01", number: "A", label: "Appendix A", title: "SQL Fundamentals", file: "chapters/sql-01-fundamentals.md", minutes: 45 },
        { id: "sql-02", number: "B", label: "Appendix B", title: "Joins, Aggregates, and Integrity Checks", file: "chapters/sql-02-joins-aggregates.md", minutes: 45 },
        { id: "sql-03", number: "C", label: "Appendix C", title: "Advanced SQL and SQL in Tests", file: "chapters/sql-03-advanced.md", minutes: 45 },
      ],
    },
  ],
};
