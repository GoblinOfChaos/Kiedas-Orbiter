# Job rules (read before every background job, test run, or status report)

1. Scope: one narrow task per job, with named files. Never "every item in the app".
2. Launch: always add `< /dev/null` to the launch command, or the job waits forever on input.
3. Tests: every test run uses `timeout 180`. Never a whole folder or the whole suite. Named files only. Farming tests are run by name whenever the job touches Farming Targets or relic places code. Known failures (missing wiki fixture in acquisitionText; Rahn Prism in vendorPlaces) are reported, not hidden.
4. Unattended: the brief says to start editing at once. No plan approval requests, no stopping after planning.
5. First check: read the job log within 2 minutes of launch. Stop the job if the log is not growing or repeats the same line.
6. Reporting: read the log before saying a job is progressing. Quote the log size and the last line.
7. Public text: commit messages and GitHub posts state facts only. No tool or provider names, no references to people.
