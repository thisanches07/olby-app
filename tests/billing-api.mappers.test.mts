import assert from "node:assert/strict";

const mappers = await import("../services/billing.mappers.ts");
const mapBillingError = mappers.mapBillingError as (error: unknown) => {
  code: string;
  retryable: boolean;
};
const mapEffectivePlanToSubscription =
  mappers.mapEffectivePlanToSubscription as (
    effectivePlan: {
      code: "FREE" | "BASIC" | "PRO";
      name: string;
      projectLimit: number;
      priceCents: number;
      subscriptionStatus: string | null;
      trialEndsAt: string | null;
    },
    snapshot: { ownedProjectCount: number; canCreateProject: boolean },
  ) => {
    subscriptionStatus: string | null;
    ownedProjectCount: number;
    canCreateProject: boolean;
  };

function run() {
  {
    const mapped = mapBillingError({ status: 400, message: "bad request" });
    assert.equal(mapped.code, "INVALID_PURCHASE");
    assert.equal(mapped.retryable, false);
  }

  {
    const mapped = mapBillingError({ status: 401, message: "unauthorized" });
    assert.equal(mapped.code, "UNAUTHORIZED");
    assert.equal(mapped.retryable, false);
  }

  {
    const mapped = mapBillingError({ status: 404, message: "not found" });
    assert.equal(mapped.code, "NOT_FOUND");
    assert.equal(mapped.retryable, false);
  }

  {
    const mapped = mapBillingError({ status: 429, message: "too many" });
    assert.equal(mapped.code, "RATE_LIMITED");
    assert.equal(mapped.retryable, false);
  }

  {
    const mapped = mapBillingError({ status: 503, message: "server" });
    assert.equal(mapped.code, "TRANSIENT");
    assert.equal(mapped.retryable, true);
  }

  {
    const mapped = mapEffectivePlanToSubscription(
      {
        code: "BASIC",
        name: "Basico",
        projectLimit: 3,
        priceCents: 7990,
        subscriptionStatus: "SOMETHING_ELSE",
        trialEndsAt: null,
      },
      {
        ownedProjectCount: 2,
        canCreateProject: true,
      },
    );

    assert.equal(mapped.subscriptionStatus, null);
    assert.equal(mapped.ownedProjectCount, 2);
    assert.equal(mapped.canCreateProject, true);
  }

  console.log("Billing mapper tests passed.");
}

run();
