/**
 * book.js — the book's table of contents.
 *
 * Chapter kinds:
 *   { id, number, title, file, minutes }   a reviewed chapter written in Markdown (chapters/*.md)
 *   { id, number, title, planned: true }  listed in the contents, not written yet
 *   { legacy: "<module id>" }             an older module from curriculum.js, not yet reviewed
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
        { id: "js-11", number: 11, title: "TypeScript: Types, Interfaces, and Narrowing", planned: true },
        { id: "js-12", number: 12, title: "TypeScript: Generics, Utility Types, and tsconfig", planned: true },
        { legacy: "js-basics" },
        { legacy: "async-js" },
        { legacy: "ts-for-qa" },
      ],
    },
    {
      title: "Playwright",
      intro: "Writing end-to-end tests with Playwright Test.",
      chapters: [
        { legacy: "pw-setup" },
        { legacy: "pw-locators" },
        { legacy: "pw-assertions" },
        { legacy: "pw-fixtures" },
      ],
    },
    {
      title: "API Testing & Test Data",
      chapters: [
        { legacy: "api-testing" },
        { legacy: "mock-api-data-setup" },
      ],
    },
    {
      title: "Debugging & CI",
      chapters: [
        { legacy: "pw-ci" },
      ],
    },
    {
      title: "Appendix: SQL for QA",
      optional: true,
      intro: "Optional. Useful when you need to check what an application saved to its database.",
      chapters: [
        { legacy: "sql-beginner" },
        { legacy: "sql-intermediate" },
        { legacy: "sql-advanced" },
      ],
    },
  ],
};
