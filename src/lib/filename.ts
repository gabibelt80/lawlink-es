export function normalizeUploadedFilename(name: string) {
  if (!name) return name;
  if (!/[ÃƒÃ‚Ã„Ã…Ã‡ÃˆÃ‰ÃŠÃ‹ÃŒÃÃŽÃÃÃ‘Ã’Ã“Ã”Ã•Ã–Ã˜Ã™ÃšÃ›ÃœÃÃžÃŸÃ -Ã¿ï¿½]/.test(name)) return name;

  try {
    const bytes = Uint8Array.from(Array.from(name, (char) => char.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return scoreFilename(decoded) > scoreFilename(name) ? decoded : name;
  } catch {
    return name;
  }
}

function scoreFilename(name: string) {
  const cjk = (name.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const mojibake = (name.match(/[ÃƒÃ‚Ã„Ã…Ã‡ÃˆÃ‰ÃŠÃ‹ÃŒÃÃŽÃÃÃ‘Ã’Ã“Ã”Ã•Ã–Ã˜Ã™ÃšÃ›ÃœÃÃžÃŸÃ -Ã¿ï¿½]/g) ?? []).length;
  return cjk * 3 - mojibake;
}

