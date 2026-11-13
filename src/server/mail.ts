/** Sends a parent link only when an email endpoint is configured. Otherwise the minor shares the link. */
export async function sendGuardianEmail(input: { to: string; subject: string; text: string }): Promise<{ sent: boolean }> {
  const url = process.env.EMAIL_API_URL?.trim();
  const key = process.env.EMAIL_API_KEY?.trim();
  if (!url || !key) return { sent: false };
  const response = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ to: input.to, subject: input.subject, text: input.text }),
  }).catch(() => null);
  return { sent: Boolean(response?.ok) };
}
