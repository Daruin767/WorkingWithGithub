Release checklist — SDD Finanzas

Before releasing a new version, follow these steps:

1. Run tests
   - npm install
   - npm test
   Ensure all unit and integration tests pass.

2. Build
   - npm run build
   Verify the build output in dist/ and run `npm run preview` to smoke-test.

3. Verify backups and restores
   - Create an encrypted backup via the UI and restore it locally.
   - Test importing exported CSV/JSON/XLSX files.

4. Manual QA
   - Sanity check flows: signup/login, onboarding, create transactions, create limits, trigger alerts, backup/restore, import/export.
   - Check responsiveness and basic accessibility.

5. Documentation
   - Update README.md and HANDOFF.md with any user-visible changes.
   - Ensure PRIVACY.md is up-to-date.

6. Bump package version
   - Update version in package.json (semantic versioning).

7. Tag & Release
   - Create a git tag (e.g., v0.1.0) and push to remote.
   - Publish release notes summarizing features and breaking changes.

8. Post-release
   - Monitor issue queue for any regressions.

Notes:
- For XLSX features, ensure `xlsx` dependency is present if you rely on it in the build.
- Backups that are encrypted require manual handling of passwords; warn users in release notes.
