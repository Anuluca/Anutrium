export function quotaDate(now = Date.now()) {
  const day = new Date(now + 8 * 3600000).toISOString().slice(0, 10)
  return {
    day,
    resetsAt: new Date(
      Date.parse(`${day}T00:00:00+08:00`) + 86400000
    ).toISOString(),
  }
}
