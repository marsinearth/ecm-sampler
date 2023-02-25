export default function envVarTypeResolver(key: string) {
  return process.env[key] ?? "";
}
