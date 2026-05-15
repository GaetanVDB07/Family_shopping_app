export function createListenOptions(port: string | number, platform = process.platform) {
  return {
    port,
    host: "0.0.0.0",
    ...(platform === "win32" ? {} : { reusePort: true }),
  };
}
