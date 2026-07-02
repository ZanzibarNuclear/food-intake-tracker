import { browserTimeZone } from "~/utils/dates";

export function useUserTimezone() {
  const tracker = useTracker();
  const browserTz = browserTimeZone();

  const timezone = computed(() => tracker.data.value?.settings.timezone ?? browserTz);

  return { timezone, browserTz };
}
