import assert from "node:assert/strict";
import test from "node:test";
import { createPylonToolApproval, WRITE_ENDPOINT_TOOL_NAMES } from "../dist/index.mjs";

test("requires user approval for every mutation by default", () => {
  const policy = createPylonToolApproval();

  assert.equal(Object.keys(policy).length, WRITE_ENDPOINT_TOOL_NAMES.length);
  for (const name of WRITE_ENDPOINT_TOOL_NAMES) {
    assert.equal(policy[name], "user-approval");
  }
});

test("maps false to the normal no-approval execution path", () => {
  const policy = createPylonToolApproval(false);

  for (const name of WRITE_ENDPOINT_TOOL_NAMES) {
    assert.equal(policy[name], "not-applicable");
  }
});

test("keeps unspecified mutations fail-safe in a partial policy", () => {
  const policy = createPylonToolApproval({
    createIssueReply: "not-applicable",
  });

  assert.equal(policy.createIssueReply, "not-applicable");
  assert.equal(policy.deleteIssue, "user-approval");
});

test("preserves explicit SDK 7 approval statuses and reasons", () => {
  const policy = createPylonToolApproval({
    createIssueNote: "approved",
    deleteAccount: {
      type: "denied",
      reason: "Account deletion is disabled in this environment.",
    },
  });

  assert.equal(policy.createIssueNote, "approved");
  assert.deepEqual(policy.deleteAccount, {
    type: "denied",
    reason: "Account deletion is disabled in this environment.",
  });
});

test("applies an object status to every mutation", () => {
  const denied = {
    type: "denied",
    reason: "Pylon mutations are disabled in this environment.",
  };
  const policy = createPylonToolApproval(denied);

  for (const name of WRITE_ENDPOINT_TOOL_NAMES) {
    assert.deepEqual(policy[name], denied);
  }
});
