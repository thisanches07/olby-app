import assert from "node:assert/strict";

const roleUtils = await import("../utils/project-role.ts");

const isOwner = roleUtils.isOwner as (role: unknown) => boolean;
const canEditProject = roleUtils.canEditProject as (role: unknown) => boolean;
const canManageMembers = roleUtils.canManageMembers as (role: unknown) => boolean;
const isClientView = roleUtils.isClientView as (role: unknown) => boolean;

function run() {
  {
    const role = "OWNER";
    assert.equal(isOwner(role), true);
    assert.equal(canEditProject(role), true);
    assert.equal(canManageMembers(role), true);
    assert.equal(isClientView(role), false);
  }

  {
    const role = "PRO";
    assert.equal(isOwner(role), false);
    assert.equal(canEditProject(role), false);
    assert.equal(canManageMembers(role), true);
    assert.equal(isClientView(role), false);
  }

  {
    const role = "CLIENT_VIEWER";
    assert.equal(isOwner(role), false);
    assert.equal(canEditProject(role), false);
    assert.equal(canManageMembers(role), false);
    assert.equal(isClientView(role), true);
  }

  {
    const role = null;
    assert.equal(isOwner(role), false);
    assert.equal(canEditProject(role), false);
    assert.equal(canManageMembers(role), false);
    assert.equal(isClientView(role), false);
  }

  console.log("Project role permission tests passed.");
}

run();
