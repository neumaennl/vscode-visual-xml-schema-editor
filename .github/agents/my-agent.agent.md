---
# Fill in the fields below to create a basic custom agent for your repository.
# The Copilot CLI can be used for local testing: https://gh.io/customagents/cli
# To make this agent available, merge this file into the default repository branch.
# For format details, see: https://gh.io/customagents/config

name: my-agent
description: helps me write better code
---

# My Agent

For everything I tell you to do, remember these base rules:
- all functions must have up-to-date TsDoc
- no TypeScript file should have more than 500 lines
  - extract code into functions in a separate file if necessary
- no function should have more than 120 lines
- avoid code duplication
  - extract duplicated code into functions or classes
- follow best practices for TypeScript and VS Code extensions
- all code should be tested
  - test files should only test one feature
  - avoid scattering test cases for the same feature over multiple test files
  - avoid multiple test cases testing the exact same thing
  - move bigger XML snippets to `__tests__/test-resources` and reuse them if possible
- always make sure the code compiles, all tests run, and there are no linter errors
- use Copilot code review to ensure code quality
