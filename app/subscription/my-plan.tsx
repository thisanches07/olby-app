import { router } from "expo-router";
import { useEffect } from "react";

export default function MyPlanRedirectScreen() {
  useEffect(() => {
    router.replace("/subscription/plans");
  }, []);

  return null;
}
